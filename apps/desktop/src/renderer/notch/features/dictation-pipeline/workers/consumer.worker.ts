/// <reference lib="webworker" />
import { dictationDb } from '@notch/features/dictation-pipeline/db/dexie';
import {
  HypothesisBuffer,
  type TimedWord,
} from '@notch/features/dictation-pipeline/lib/hypothesisBuffer';
import {
  createPipeline,
  detectBackend,
  runWhisper,
  type Backend,
  type WhisperPipeline,
} from '@notch/features/dictation-pipeline/lib/whisperAdapter';
import { isSentenceEnd } from '@notch/features/dictation-pipeline/lib/heuristics';

const TARGET_RATE = 16_000;
const WAKE_CHANNEL = 'mindlr-new-chunk';
const CONTEXT_LOOKBACK_S = 5;
const FAST_TRIM_THRESHOLD_S = 10;
const MAX_WINDOW_S = 24;

type Inbound =
  | { type: 'init'; repoId: string }
  | { type: 'reset' }
  | { type: 'flush' };

type Outbound =
  | { type: 'ready'; backend: Backend }
  | { type: 'tokens'; committed: TimedWord[]; tentative: TimedWord[] }
  | { type: 'reset-done' }
  | { type: 'flush-done' }
  | { type: 'error'; message: string };

let pipeline: WhisperPipeline | null = null;
let pipelineRepoId: string | null = null;
let buffer = new HypothesisBuffer();
let committedAudioStartS = 0;
let transcriptIdx = 0;

let inflight: Promise<void> = Promise.resolve();
let dirty = false;
let stopRequested = false;

const wake = new BroadcastChannel(WAKE_CHANNEL);
wake.onmessage = () => {
  dirty = true;
  void runIfIdle();
};

function post(msg: Outbound): void {
  (self as unknown as Worker).postMessage(msg);
}

self.addEventListener('message', async (ev: MessageEvent<Inbound>) => {
  const msg = ev.data;
  if (msg.type === 'init') {
    if (pipelineRepoId !== msg.repoId) {
      try {
        const backend = await detectBackend();
        pipeline = await createPipeline(msg.repoId, backend);
        pipelineRepoId = msg.repoId;
        post({ type: 'ready', backend });
      } catch (err) {
        post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
        return;
      }
    } else {
      post({ type: 'ready', backend: 'wasm' });
    }
    return;
  }

  if (msg.type === 'reset') {
    await inflight;
    buffer = new HypothesisBuffer();
    committedAudioStartS = 0;
    transcriptIdx = 0;
    dirty = false;
    stopRequested = false;
    post({ type: 'reset-done' });
    return;
  }

  if (msg.type === 'flush') {
    stopRequested = true;
    await inflight;

    // Single final inference pass on whatever is left, so the user sees
    // the most up-to-date live transcript at the moment they hit Stop. We
    // do NOT loop until chunks.count() === 0 — on short sessions LA-2 may
    // never reach a two-hypothesis agreement, the anchor never advances,
    // chunks never evict, and the loop runs forever. The batch worker is
    // the authoritative final transcript anyway.
    if (pipeline && (await dictationDb.chunks.count()) > 0) {
      dirty = true;
      try {
        await doInferenceTick();
      } catch (err) {
        console.warn('[consumer] flush inference failed:', err);
      }
    }

    // Force-commit any remaining tentative words.
    const flushed = buffer.flushTentative();
    if (flushed.length > 0) {
      await writeTranscriptDelta(buffer.committedWords, []);
    }

    post({
      type: 'tokens',
      committed: [...buffer.committedWords],
      tentative: [],
    });
    post({ type: 'flush-done' });
    return;
  }
});

async function runIfIdle(): Promise<void> {
  if (!pipeline) return;
  await inflight;
  if (!dirty) return;
  dirty = false;
  inflight = doInferenceTick();
  await inflight;
  // Re-check in case more chunks arrived during inference.
  if (dirty) void runIfIdle();
}

async function doInferenceTick(): Promise<void> {
  if (!pipeline) return;
  const chunks = await dictationDb.chunks
    .where('startS')
    .aboveOrEqual(committedAudioStartS - 0.001)
    .sortBy('startS');

  if (chunks.length === 0) return;

  // Concatenate samples.
  let total = 0;
  for (const c of chunks) total += c.samples.length;
  const window = new Float32Array(total);
  let off = 0;
  for (const c of chunks) {
    window.set(c.samples, off);
    off += c.samples.length;
  }

  const windowDurationS = window.length / TARGET_RATE;
  const audioT0 = chunks[0]!.startS;
  const audioT1 = chunks[chunks.length - 1]!.endS;

  let result;
  try {
    result = await runWhisper(pipeline, window, { offsetSeconds: audioT0 });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    return;
  }

  buffer.ingest(result.words);

  // Reconcile transcript: append new committed rows, replace tentative tail.
  // Simplest approach: compute the desired full state and diff.
  await reconcileTranscript();

  // Anchor advancement.
  const committed = buffer.committedWords;
  const lastCommittedEnd = buffer.committedEndTime;

  let trimTo = committedAudioStartS;
  if (committed.length > 0 && isSentenceEnd(committed.at(-1)!.text)) {
    trimTo = Math.max(committedAudioStartS, lastCommittedEnd - CONTEXT_LOOKBACK_S);
  } else if (windowDurationS > FAST_TRIM_THRESHOLD_S && lastCommittedEnd > 0) {
    trimTo = Math.max(committedAudioStartS, lastCommittedEnd - CONTEXT_LOOKBACK_S);
  } else if (windowDurationS > MAX_WINDOW_S) {
    // Safety net: commit tentative + force-slide.
    const flushed = buffer.flushTentative();
    if (flushed.length > 0) await reconcileTranscript();
    trimTo = Math.max(committedAudioStartS, audioT1 - CONTEXT_LOOKBACK_S);
  }

  if (trimTo > committedAudioStartS) {
    committedAudioStartS = trimTo;
    // Evict chunks whose entire span is before the new anchor.
    await dictationDb.chunks.where('startS').below(trimTo - 0.001).delete();
  }

  // Emit final tokens snapshot for UI.
  post({
    type: 'tokens',
    committed: [...buffer.committedWords],
    tentative: [...buffer.tentativeWords],
  });

  // Quiet the linter — stopRequested is meaningful inside flush().
  void stopRequested;
}

async function reconcileTranscript(): Promise<void> {
  const committed = buffer.committedWords;
  const tentative = buffer.tentativeWords;
  await writeTranscriptDelta(committed, tentative);
}

async function writeTranscriptDelta(
  committed: readonly TimedWord[],
  tentative: readonly TimedWord[],
): Promise<void> {
  // Clear all transcript rows and rewrite — small (<200 rows for typical
  // session) so write-amplification is fine.
  await dictationDb.transaction('rw', dictationDb.transcript, async () => {
    await dictationDb.transcript.clear();
    let idx = 0;
    for (const w of committed) {
      await dictationDb.transcript.add({
        idx: idx++,
        start: w.start,
        end: w.end,
        text: w.text,
        isFinal: 1,
      });
    }
    for (const w of tentative) {
      await dictationDb.transcript.add({
        idx: idx++,
        start: w.start,
        end: w.end,
        text: w.text,
        isFinal: 0,
      });
    }
    transcriptIdx = idx;
  });
  void transcriptIdx;
}

/// <reference lib="webworker" />
import { dictationDb } from '@notch/features/dictation-pipeline/db/dexie';
import type { TimedWord } from '@notch/features/dictation-pipeline/lib/hypothesisBuffer';
import {
  createPipeline,
  detectBackend,
  runWhisper,
  type WhisperPipeline,
} from '@notch/features/dictation-pipeline/lib/whisperAdapter';

const TARGET_RATE = 16_000;

type Inbound =
  | { type: 'init'; repoId: string }
  | { type: 'transcribe'; sessionId: number };

type Outbound =
  | { type: 'ready' }
  | {
      type: 'transcribe-done';
      sessionId: number;
      tokens: TimedWord[];
      text: string;
      durationS: number;
      inferenceMs: number;
    }
  | { type: 'error'; message: string };

let pipeline: WhisperPipeline | null = null;
let pipelineRepoId: string | null = null;

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
      } catch (err) {
        post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
        return;
      }
    }
    post({ type: 'ready' });
    return;
  }

  if (msg.type === 'transcribe') {
    if (!pipeline) {
      post({ type: 'error', message: 'batch worker not initialized' });
      return;
    }
    const chunks = await dictationDb.audioArchive.orderBy('startS').toArray();
    if (chunks.length === 0) {
      post({
        type: 'transcribe-done',
        sessionId: msg.sessionId,
        tokens: [],
        text: '',
        durationS: 0,
        inferenceMs: 0,
      });
      return;
    }

    let total = 0;
    for (const c of chunks) total += c.samples.length;
    const all = new Float32Array(total);
    let off = 0;
    for (const c of chunks) {
      all.set(c.samples, off);
      off += c.samples.length;
    }

    const t0 = performance.now();
    try {
      const result = await runWhisper(pipeline, all, { offsetSeconds: 0 });
      const inferenceMs = performance.now() - t0;
      post({
        type: 'transcribe-done',
        sessionId: msg.sessionId,
        tokens: result.words,
        text: result.text,
        durationS: all.length / TARGET_RATE,
        inferenceMs,
      });
    } catch (err) {
      post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }
});

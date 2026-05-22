/// <reference lib="webworker" />
import { dictationDb } from '@notch/features/dictation-pipeline/db/dexie';
import { LinearResampler } from '@notch/features/dictation-pipeline/lib/resampler';

const TARGET_RATE = 16_000;
const CHUNK_SAMPLES = TARGET_RATE; // 1 s chunks at 16 kHz mono
const WAKE_CHANNEL = 'mindlr-new-chunk';

type Inbound =
  | { type: 'init'; sourceSampleRate: number }
  | { type: 'frame'; samples: ArrayBuffer }
  | { type: 'stop' }
  | { type: 'reset' };

type Outbound = { type: 'ready' } | { type: 'stopped' } | { type: 'reset-done' };

let resampler: LinearResampler | null = null;
let bcast: BroadcastChannel | null = null;

// Rolling buffer of 16 kHz samples awaiting commit into a 1-second chunk.
let pending: Float32Array = new Float32Array(0);
let nextChunkStartS = 0;

function ensureBroadcast(): BroadcastChannel {
  if (!bcast) bcast = new BroadcastChannel(WAKE_CHANNEL);
  return bcast;
}

function appendPending(samples: Float32Array): void {
  const merged = new Float32Array(pending.length + samples.length);
  merged.set(pending, 0);
  merged.set(samples, pending.length);
  pending = merged;
}

async function flushChunksIfReady(): Promise<void> {
  while (pending.length >= CHUNK_SAMPLES) {
    const slice = pending.slice(0, CHUNK_SAMPLES);
    pending = pending.slice(CHUNK_SAMPLES);
    const startS = nextChunkStartS;
    const endS = startS + 1;
    nextChunkStartS = endS;

    // Write to both tables in one transaction.
    await dictationDb.transaction('rw', dictationDb.chunks, dictationDb.audioArchive, async () => {
      const row = { startS, endS, samples: slice };
      await dictationDb.chunks.add(row);
      await dictationDb.audioArchive.add(row);
    });

    ensureBroadcast().postMessage({ kind: 'new-chunk' });
  }
}

function post(msg: Outbound): void {
  (self as unknown as Worker).postMessage(msg);
}

self.addEventListener('message', (ev: MessageEvent<Inbound>) => {
  const msg = ev.data;
  if (msg.type === 'init') {
    resampler = new LinearResampler(msg.sourceSampleRate, TARGET_RATE);
    pending = new Float32Array(0);
    nextChunkStartS = 0;
    post({ type: 'ready' });
    return;
  }

  if (msg.type === 'frame') {
    if (!resampler) return;
    const input = new Float32Array(msg.samples);
    const out = resampler.push(input);
    if (out.length > 0) {
      appendPending(out);
      void flushChunksIfReady();
    }
    return;
  }

  if (msg.type === 'stop') {
    // Flush whatever's left as a final short chunk so the batch worker sees
    // every captured sample.
    void (async () => {
      if (pending.length > 0) {
        const slice = pending;
        pending = new Float32Array(0);
        const startS = nextChunkStartS;
        const endS = startS + slice.length / TARGET_RATE;
        nextChunkStartS = endS;
        await dictationDb.transaction(
          'rw',
          dictationDb.chunks,
          dictationDb.audioArchive,
          async () => {
            const row = { startS, endS, samples: slice };
            await dictationDb.chunks.add(row);
            await dictationDb.audioArchive.add(row);
          },
        );
        ensureBroadcast().postMessage({ kind: 'new-chunk' });
      }
      post({ type: 'stopped' });
    })();
    return;
  }

  if (msg.type === 'reset') {
    pending = new Float32Array(0);
    nextChunkStartS = 0;
    resampler = null;
    post({ type: 'reset-done' });
    return;
  }
});

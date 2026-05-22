import type { TimedWord } from '@notch/features/dictation-pipeline/lib/hypothesisBuffer';
import { isHallucinationWord } from '@notch/features/dictation-pipeline/lib/heuristics';

export type Backend = 'webgpu' | 'wasm';

interface NavigatorWithGpu {
  gpu?: { requestAdapter: () => Promise<unknown> };
}

interface TransformersGlobalEnv {
  allowRemoteModels: boolean;
  allowLocalModels: boolean;
  localModelPath: string;
  useBrowserCache?: boolean;
  useFSCache?: boolean;
  useCustomCache?: boolean;
  backends?: { onnx?: { logSeverityLevel?: number; logLevel?: string } };
}

export interface WhisperPipeline {
  (
    samples: Float32Array,
    opts: Record<string, unknown>,
  ): Promise<{ text?: string; chunks?: WhisperChunk[] } | unknown>;
}

interface WhisperChunk {
  text: string;
  timestamp: [number | null, number | null];
}

export async function detectBackend(): Promise<Backend> {
  const nav = navigator as unknown as NavigatorWithGpu;
  if (nav.gpu) {
    try {
      const adapter = await nav.gpu.requestAdapter();
      if (adapter) return 'webgpu';
    } catch {
      // fall through to WASM
    }
  }
  return 'wasm';
}

export async function createPipeline(
  modelId: string,
  backend: Backend,
): Promise<WhisperPipeline> {
  const transformers = await import('@huggingface/transformers');
  const env = transformers.env as unknown as TransformersGlobalEnv;
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = 'app://models/';
  // We already cache to disk via app://; transformers.js's Cache API attempt
  // fails noisily on the `app://` scheme. Disable all transformers caching.
  env.useBrowserCache = false;
  env.useFSCache = false;
  env.useCustomCache = false;
  if (env.backends?.onnx) {
    env.backends.onnx.logSeverityLevel = 3;
    env.backends.onnx.logLevel = 'error';
  }

  const isTurbo = modelId.includes('turbo');
  const dtype =
    backend === 'webgpu'
      ? { encoder_model: isTurbo ? 'fp16' : 'fp32', decoder_model_merged: 'q4' }
      : { encoder_model: 'fp32', decoder_model_merged: 'q4' };

  const pipeline = await transformers.pipeline('automatic-speech-recognition', modelId, {
    device: backend,
    dtype: dtype as Record<string, 'fp32' | 'fp16' | 'q4'>,
  } as Record<string, unknown>);

  return pipeline as unknown as WhisperPipeline;
}

export interface WhisperRunResult {
  text: string;
  words: TimedWord[];
}

export interface WhisperRunOptions {
  /** Time offset (s) added to every word timestamp to convert into the
   *  consumer's absolute timeline. */
  offsetSeconds: number;
  /** Defaults to true. Whisper-family `_timestamped` exports support it. */
  requestWordTimestamps?: boolean;
}

export async function runWhisper(
  pipeline: WhisperPipeline,
  samples: Float32Array,
  opts: WhisperRunOptions,
): Promise<WhisperRunResult> {
  const callOpts: Record<string, unknown> = {
    chunk_length_s: 30,
    stride_length_s: 0,
    no_repeat_ngram_size: 3,
    top_k: 0,
    do_sample: false,
  };
  if (opts.requestWordTimestamps !== false) {
    callOpts.return_timestamps = 'word';
  }

  const raw = (await pipeline(samples, callOpts)) as { text?: string; chunks?: WhisperChunk[] };
  return parseResult(raw, opts.offsetSeconds);
}

function parseResult(
  raw: { text?: string; chunks?: WhisperChunk[] },
  offsetSeconds: number,
): WhisperRunResult {
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  const chunks = Array.isArray(raw.chunks) ? raw.chunks : [];
  const words: TimedWord[] = [];
  for (const c of chunks) {
    if (!c || typeof c.text !== 'string') continue;
    if (c.timestamp == null) continue;
    const [s, e] = c.timestamp;
    if (s == null || e == null) continue;
    const t = c.text.trim();
    if (!t) continue;
    if (isHallucinationWord(t)) continue;
    words.push({ text: t, start: s + offsetSeconds, end: e + offsetSeconds });
  }
  return { text, words };
}

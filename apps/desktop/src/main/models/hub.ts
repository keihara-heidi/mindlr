import { listModels } from '@huggingface/hub';

const ONNX_COMMUNITY = 'onnx-community';

export interface HubWhisperRepo {
  repoId: string;
}

/**
 * Lists Whisper `_timestamped` ONNX exports from the onnx-community org on HF.
 *
 * The Hub `listModels` API streams results as an AsyncIterable. We filter to
 * repos under `onnx-community` whose name starts with `whisper-` and ends with
 * `_timestamped`. That's exactly the set transformers.js can run with
 * `return_timestamps: 'word'` (LocalAgreement-2 requires word timestamps).
 *
 * Network failure surfaces to the caller; the catalog layer handles fallback.
 */
export async function listWhisperTimestampedRepos(): Promise<HubWhisperRepo[]> {
  const results: HubWhisperRepo[] = [];
  const iter = listModels({ search: { owner: ONNX_COMMUNITY, query: 'whisper' } });
  for await (const m of iter) {
    const repoId = m.name; // already includes owner/, e.g. "onnx-community/whisper-tiny.en_timestamped"
    const tail = repoId.split('/').at(-1) ?? '';
    if (!tail.startsWith('whisper-')) continue;
    if (!tail.endsWith('_timestamped')) continue;
    results.push({ repoId });
  }
  return results;
}

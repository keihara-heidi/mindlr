import { env, pipeline } from '@huggingface/transformers';

interface DevApi {
  testInference: (repoId: string) => Promise<unknown>;
}

declare global {
  interface Window {
    __mindlr_dev?: DevApi;
  }
}

/**
 * Wires transformers.js to load models from `app://models/<repo>/<path>` and
 * exposes `window.__mindlr_dev.testInference(repoId)` for Phase 2 smoke
 * verification. Open the notch's DevTools and run:
 *
 *   await window.__mindlr_dev.testInference('onnx-community/whisper-small.en_timestamped')
 *
 * Returns a transcription of 3 s of silence — proves the protocol + pipeline
 * load end-to-end. Real audio capture is wired in Phase 3.
 */
export function installDevHelpers(): void {
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  // transformers.js appends the repo id + filename to this base.
  env.localModelPath = 'app://models/';

  window.__mindlr_dev = {
    testInference: async (repoId: string) => {
      const isTurbo = repoId.includes('turbo');
      const asr = await pipeline('automatic-speech-recognition', repoId, {
        dtype: { encoder: isTurbo ? 'fp16' : 'fp32', decoder: 'q4' },
      });
      // 3 s of silence at 16 kHz mono.
      const silent = new Float32Array(16000 * 3);
      return asr(silent, { return_timestamps: 'word', chunk_length_s: 30 });
    },
  };

  console.info(
    '[mindlr] dev helpers installed. Try: await window.__mindlr_dev.testInference("onnx-community/whisper-small.en_timestamped")',
  );
}

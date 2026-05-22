// Placeholder VAD that treats every frame as speech. Phase 3 ships with this
// because the user explicitly toggles start/stop — there's no auto-stop in
// v1 that would benefit from real VAD. A Silero wrapper can replace this
// later if chunk-level silence gating becomes worthwhile.

export interface VadEngine {
  /** Returns a speech-probability ∈ [0, 1] for the frame. NoopVad always
   *  returns `undefined` to signal "no opinion"; downstream consumers fall
   *  back to processing every frame. */
  process(frame: Float32Array): number | undefined;
  reset(): void;
}

export class NoopVad implements VadEngine {
  process(_frame: Float32Array): number | undefined {
    return undefined;
  }
  reset(): void {}
}

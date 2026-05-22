// Linear resampler for downsampling 48 kHz mono Float32 audio to 16 kHz.
// Whisper expects 16 kHz mono Float32 input. Quality is good enough for ASR;
// off-the-record uses the same simple linear approach and ships in
// production.

export class LinearResampler {
  private readonly ratio: number;
  private cursor = 0;
  private last = 0;

  constructor(fromRate: number, toRate: number) {
    if (fromRate <= 0 || toRate <= 0) throw new Error('rates must be positive');
    this.ratio = fromRate / toRate;
  }

  /**
   * Push more input samples and pull all output samples that can be produced
   * with what we have so far. Carries `last` + `cursor` state across calls
   * so streaming behaves continuously.
   */
  push(input: Float32Array): Float32Array {
    if (input.length === 0) return new Float32Array(0);

    // Combine the previous tail sample with the new chunk for interpolation
    // across the boundary.
    const buf = new Float32Array(input.length + 1);
    buf[0] = this.last;
    buf.set(input, 1);

    // Output samples whose source position falls within [0, buf.length - 1].
    const out: number[] = [];
    while (this.cursor < buf.length - 1) {
      const i = Math.floor(this.cursor);
      const frac = this.cursor - i;
      out.push(buf[i]! * (1 - frac) + buf[i + 1]! * frac);
      this.cursor += this.ratio;
    }

    this.last = buf[buf.length - 1]!;
    this.cursor -= input.length; // advance source index for the next push
    return Float32Array.from(out);
  }
}

/**
 * Determines the required ONNX file set for a Whisper repo.
 *
 * Matches the off-the-record recipe:
 *   - fp32 encoder for non-turbo variants
 *   - fp16 encoder for whisper-large-v3-turbo (Metal/WebGPU benefit)
 *   - q4 quantized merged decoder
 *
 * The file conventions are stable across `onnx-community/whisper-*_timestamped`.
 * If HF ever changes the layout we'll get a 404 at download time and surface a
 * clear error — preferable to silently fetching mismatched files.
 */
export function requiredFiles(repoId: string): string[] {
  const base = [
    'config.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'generation_config.json',
    'preprocessor_config.json',
  ];
  const isTurbo = repoId.includes('turbo');
  const encoder = isTurbo ? 'onnx/encoder_model_fp16.onnx' : 'onnx/encoder_model.onnx';
  const decoder = 'onnx/decoder_model_merged_q4.onnx';
  return [...base, encoder, decoder];
}

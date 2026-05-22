/**
 * Determines the required file set for a Whisper repo.
 *
 * Includes the full HF metadata-file set (added_tokens, merges, normalizer,
 * vocab, special_tokens_map, quantize_config) — transformers.js fetches them
 * on `from_pretrained()` and gets a 404-body-as-protobuf if they're missing.
 *
 * ONNX file selection per off-the-record's recipe:
 *   - fp32 encoder for non-turbo variants
 *   - fp16 encoder for whisper-large-v3-turbo (Metal/WebGPU benefit)
 *   - q4 quantized merged decoder
 *
 * The file conventions are stable across `onnx-community/whisper-*_timestamped`.
 */
export function requiredFiles(repoId: string): string[] {
  const metadata = [
    'config.json',
    'generation_config.json',
    'preprocessor_config.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'added_tokens.json',
    'special_tokens_map.json',
    'normalizer.json',
    'vocab.json',
    'merges.txt',
    'quantize_config.json',
  ];
  const isTurbo = repoId.includes('turbo');
  const encoder = isTurbo ? 'onnx/encoder_model_fp16.onnx' : 'onnx/encoder_model.onnx';
  const decoder = 'onnx/decoder_model_merged_q4.onnx';
  return [...metadata, encoder, decoder];
}

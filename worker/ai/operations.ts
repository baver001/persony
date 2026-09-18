/** Normalized inference operation types (server-side source of truth). */
export const INFERENCE_OPERATIONS = [
  'chat_text',
  'memory_extract',
  'call_summary',
  'voice_transcription',
  'voice_call',
  'persona_generation',
  'avatar_generation',
] as const;

export type InferenceOperation = (typeof INFERENCE_OPERATIONS)[number];

export function isInferenceOperation(value: string): value is InferenceOperation {
  return (INFERENCE_OPERATIONS as readonly string[]).includes(value);
}

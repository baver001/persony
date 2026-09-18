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

/** Legacy values persisted before registry alignment (migration 0013). */
export const LEGACY_OPERATION_ALIASES: Record<string, InferenceOperation> = {
  text_chat: 'chat_text',
  live_voice: 'voice_call',
  summarize_call: 'call_summary',
  generate_avatar: 'avatar_generation',
  generate_character: 'persona_generation',
};

export function isInferenceOperation(value: string): value is InferenceOperation {
  return (INFERENCE_OPERATIONS as readonly string[]).includes(value);
}

export function normalizeInferenceOperation(operation: string): InferenceOperation {
  if (isInferenceOperation(operation)) return operation;
  const mapped = LEGACY_OPERATION_ALIASES[operation];
  if (mapped) return mapped;
  return 'chat_text';
}

/** DB filter helper — matches canonical + legacy rows until backfill completes. */
export function operationTypeVariants(operation: string): string[] {
  const canonical = normalizeInferenceOperation(operation);
  const variants = new Set<string>([canonical]);
  for (const [legacy, mapped] of Object.entries(LEGACY_OPERATION_ALIASES)) {
    if (mapped === canonical) variants.add(legacy);
  }
  return [...variants];
}

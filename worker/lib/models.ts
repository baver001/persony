/**
 * Gemini model IDs — single source of truth for Persony.
 * @see https://ai.google.dev/gemini-api/docs/models
 */

/** Text chat SSE — primary: gemini-3.6-flash (GA, recommended). */
export const GEMINI_CHAT_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
] as const;

/** Voice note transcription — dedicated transcribe model first, then multimodal flash. */
export const GEMINI_TRANSCRIBE_MODELS = [
  'gemini-3.5-transcribe',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
] as const;

/** Persona JSON generator. */
export const GEMINI_GENERATOR_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
] as const;

/** Real-time voice calls (Live API). */
export const GEMINI_LIVE_MODEL = 'gemini-3.1-flash-live-preview';

export function isSkippableModelError(err: unknown): boolean {
  const msg = String(
    typeof err === 'object' && err && 'message' in err ? (err as Error).message : err
  ).toLowerCase();

  return (
    msg.includes('no longer available') ||
    msg.includes('not found') ||
    msg.includes('does not exist') ||
    msg.includes('invalid model') ||
    msg.includes('404') ||
    msg.includes('is not supported')
  );
}

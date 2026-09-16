/**
 * Gemini model IDs — single source of truth for Persony.
 * @see https://ai.google.dev/gemini-api/docs/models
 * @see https://ai.google.dev/gemini-api/docs/pricing
 */

/** Text chat SSE — primary: gemini-3.8-flash; fallback: cost-efficient lite. */
export const GEMINI_CHAT_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'] as const;

/** Voice note transcription — dedicated model first, then lite fallback. */
export const GEMINI_TRANSCRIBE_MODELS = ['gemini-3.5-transcribe', 'gemini-3.5-flash-lite'] as const;

/** Persona JSON generator — same stack as chat. */
export const GEMINI_GENERATOR_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'] as const;

/** Real-time voice calls (Live API) — stable gemini-3.8-live. */
export const GEMINI_LIVE_MODEL = 'gemini-3.8-live';

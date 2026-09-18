/**
 * Gemini model ID lists — derived from `worker/ai/model-registry.ts`.
 * @see https://ai.google.dev/gemini-api/docs/models
 * @see https://ai.google.dev/gemini-api/docs/pricing
 */

import { modelIdsTupleForOperation } from '../ai/model-registry';

/** Text chat SSE — primary: gemini-3.8-flash; fallback: cost-efficient lite. */
export const GEMINI_CHAT_MODELS = modelIdsTupleForOperation(
  'google',
  'chat_text',
  'gemini-3.8-flash'
);

/** Voice note transcription — dedicated model first, then lite fallback. */
export const GEMINI_TRANSCRIBE_MODELS = modelIdsTupleForOperation(
  'google',
  'voice_transcription',
  'gemini-3.5-transcribe'
);

/** Persona JSON generator — same stack as chat. */
export const GEMINI_GENERATOR_MODELS = modelIdsTupleForOperation(
  'google',
  'persona_generation',
  'gemini-3.8-flash'
);

/** Persona avatar image generation (native image output). */
export const GEMINI_AVATAR_IMAGE_MODELS = modelIdsTupleForOperation(
  'google',
  'avatar_generation',
  'gemini-2.0-flash-preview-image-generation'
);

/** Real-time voice calls (Live API). */
export const GEMINI_LIVE_MODEL =
  modelIdsTupleForOperation('google', 'voice_call', 'gemini-3.8-live')[0];

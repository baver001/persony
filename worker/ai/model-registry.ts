import type { InferenceOperation } from './operations';

export type AIProviderId = 'google' | 'deepseek';

export type AIModelStatus = 'stable' | 'preview' | 'deprecated';

export type AIModelCapability =
  | 'text'
  | 'vision'
  | 'audio_input'
  | 'audio_output'
  | 'image_output'
  | 'live'
  | 'json'
  | 'transcription';

export type AIModelDefinition = {
  provider: AIProviderId;
  modelId: string;
  displayName: string;
  status: AIModelStatus;
  capabilities: AIModelCapability[];
  operations: InferenceOperation[];
  supportsStreaming: boolean;
  supportsUsage: boolean;
  supportsVision: boolean;
  supportsAudio: boolean;
  supportsLive: boolean;
  enabled: boolean;
  /** Official docs URL used for last verification */
  source: string;
  lastVerifiedAt: string;
};

/**
 * Central model registry — single source of truth for runtime routing and owner UI.
 * Update here first; `worker/lib/models.ts` re-exports derived lists for legacy imports.
 *
 * Verification sources (2026-09-18):
 * - Gemini: https://ai.google.dev/gemini-api/docs/models
 * - Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
 * - DeepSeek: https://api-docs.deepseek.com/quick_start/pricing
 */
const VERIFIED_AT = '2026-09-18';

const GEMINI_MODELS_DOC = 'https://ai.google.dev/gemini-api/docs/models';
const DEEPSEEK_PRICING_DOC = 'https://api-docs.deepseek.com/quick_start/pricing';

export const AI_MODEL_REGISTRY: AIModelDefinition[] = [
  {
    provider: 'google',
    modelId: 'gemini-3.8-flash',
    displayName: 'Gemini 3.8 Flash',
    status: 'stable',
    capabilities: ['text', 'json'],
    operations: ['chat_text', 'memory_extract', 'call_summary', 'persona_generation'],
    supportsStreaming: true,
    supportsUsage: true,
    supportsVision: false,
    supportsAudio: false,
    supportsLive: false,
    enabled: true,
    source: GEMINI_MODELS_DOC,
    lastVerifiedAt: VERIFIED_AT,
  },
  {
    provider: 'google',
    modelId: 'gemini-3.5-flash-lite',
    displayName: 'Gemini 3.5 Flash Lite',
    status: 'stable',
    capabilities: ['text', 'json'],
    operations: [
      'chat_text',
      'memory_extract',
      'call_summary',
      'persona_generation',
      'voice_transcription',
    ],
    supportsStreaming: true,
    supportsUsage: true,
    supportsVision: false,
    supportsAudio: false,
    supportsLive: false,
    enabled: true,
    source: GEMINI_MODELS_DOC,
    lastVerifiedAt: VERIFIED_AT,
  },
  {
    provider: 'google',
    modelId: 'gemini-3.5-transcribe',
    displayName: 'Gemini 3.5 Transcribe',
    status: 'stable',
    capabilities: ['audio_input', 'transcription', 'text'],
    operations: ['voice_transcription'],
    supportsStreaming: false,
    supportsUsage: true,
    supportsVision: false,
    supportsAudio: true,
    supportsLive: false,
    enabled: true,
    source: GEMINI_MODELS_DOC,
    lastVerifiedAt: VERIFIED_AT,
  },
  {
    provider: 'google',
    modelId: 'gemini-2.0-flash-preview-image-generation',
    displayName: 'Gemini 2.0 Flash Preview (Image)',
    status: 'preview',
    capabilities: ['text', 'image_output'],
    operations: ['avatar_generation'],
    supportsStreaming: false,
    supportsUsage: true,
    supportsVision: false,
    supportsAudio: false,
    supportsLive: false,
    enabled: true,
    source: GEMINI_MODELS_DOC,
    lastVerifiedAt: VERIFIED_AT,
  },
  {
    provider: 'google',
    modelId: 'gemini-2.0-flash-exp-image-generation',
    displayName: 'Gemini 2.0 Flash Exp (Image)',
    status: 'preview',
    capabilities: ['text', 'image_output'],
    operations: ['avatar_generation'],
    supportsStreaming: false,
    supportsUsage: true,
    supportsVision: false,
    supportsAudio: false,
    supportsLive: false,
    enabled: true,
    source: GEMINI_MODELS_DOC,
    lastVerifiedAt: VERIFIED_AT,
  },
  {
    provider: 'google',
    modelId: 'gemini-3.8-live',
    displayName: 'Gemini 3.8 Live',
    status: 'stable',
    capabilities: ['text', 'audio_input', 'audio_output', 'live'],
    operations: ['voice_call'],
    supportsStreaming: true,
    supportsUsage: true,
    supportsVision: false,
    supportsAudio: true,
    supportsLive: true,
    enabled: true,
    source: GEMINI_MODELS_DOC,
    lastVerifiedAt: VERIFIED_AT,
  },
  {
    provider: 'deepseek',
    modelId: 'deepseek-chat',
    displayName: 'DeepSeek Chat',
    status: 'stable',
    capabilities: ['text', 'json'],
    operations: ['chat_text', 'memory_extract', 'call_summary', 'persona_generation'],
    supportsStreaming: true,
    supportsUsage: true,
    supportsVision: false,
    supportsAudio: false,
    supportsLive: false,
    enabled: true,
    source: DEEPSEEK_PRICING_DOC,
    lastVerifiedAt: VERIFIED_AT,
  },
  {
    provider: 'deepseek',
    modelId: 'deepseek-reasoner',
    displayName: 'DeepSeek Reasoner',
    status: 'stable',
    capabilities: ['text', 'json'],
    operations: ['chat_text', 'memory_extract'],
    supportsStreaming: true,
    supportsUsage: true,
    supportsVision: false,
    supportsAudio: false,
    supportsLive: false,
    enabled: true,
    source: DEEPSEEK_PRICING_DOC,
    lastVerifiedAt: VERIFIED_AT,
  },
];

export function getModelDefinition(
  provider: string,
  modelId: string
): AIModelDefinition | undefined {
  return AI_MODEL_REGISTRY.find((m) => m.provider === provider && m.modelId === modelId);
}

export function modelsForOperation(operation: InferenceOperation): AIModelDefinition[] {
  return AI_MODEL_REGISTRY.filter((m) => m.enabled && m.operations.includes(operation));
}

export function modelIdsForOperation(
  provider: AIProviderId,
  operation: InferenceOperation
): string[] {
  return modelsForOperation(operation)
    .filter((m) => m.provider === provider)
    .map((m) => m.modelId);
}

/** Non-empty tuple for provider adapters that require at least one model id. */
export function modelIdsTupleForOperation(
  provider: AIProviderId,
  operation: InferenceOperation,
  fallback: string
): readonly [string, ...string[]] {
  const ids = modelIdsForOperation(provider, operation);
  if (ids.length > 0) return ids as [string, ...string[]];
  return [fallback];
}

export function assertModelSupportsOperation(
  provider: string,
  modelId: string,
  operation: InferenceOperation
): boolean {
  const def = getModelDefinition(provider, modelId);
  return Boolean(def?.enabled && def.operations.includes(operation));
}

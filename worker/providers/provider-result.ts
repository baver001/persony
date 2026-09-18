import type { ChatProviderId } from './chat-types';

export type ProviderUsageMetrics = {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  totalTokens?: number;
};

export type ProviderFallbackMeta = {
  attemptedProviders: ChatProviderId[];
  attemptedModels: string[];
  fallbackCount: number;
  fallbackReason?: string;
};

export type ProviderResult = {
  provider: ChatProviderId;
  model: string;
  usage: ProviderUsageMetrics;
  usageEstimated: boolean;
  latencyMs: number;
  finishReason?: string;
  requestId?: string;
  fallback?: ProviderFallbackMeta;
};

export type ProviderRouteMeta = {
  requestedProvider: ChatProviderId;
  requestedModel: string;
  actualProvider: ChatProviderId;
  actualModel: string;
  fallbackCount: number;
  fallbackReason?: string;
  attemptedProviders: ChatProviderId[];
  attemptedModels: string[];
};

export function estimateTokensFromText(text: string): number {
  const len = text.trim().length;
  if (len <= 0) return 0;
  return Math.max(1, Math.ceil(len / 4));
}

export function mergeProviderUsage(
  inputText: string,
  outputText: string,
  reported?: ProviderUsageMetrics
): { usage: ProviderUsageMetrics; usageEstimated: boolean } {
  if (
    reported &&
    (reported.inputTokens != null ||
      reported.outputTokens != null ||
      reported.totalTokens != null)
  ) {
    const input = reported.inputTokens ?? 0;
    const output = reported.outputTokens ?? 0;
    const total =
      reported.totalTokens ??
      input + output + (reported.cachedInputTokens ?? 0);
    return {
      usage: {
        inputTokens: input,
        outputTokens: output,
        cachedInputTokens: reported.cachedInputTokens,
        totalTokens: total,
      },
      usageEstimated: false,
    };
  }

  const inputTokens = estimateTokensFromText(inputText);
  const outputTokens = estimateTokensFromText(outputText);
  return {
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
    usageEstimated: true,
  };
}

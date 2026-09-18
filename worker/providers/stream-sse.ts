import type { ProviderUsageMetrics } from './provider-result';

/** Internal provider SSE payload (not forwarded to chat clients). */
export type ProviderSsePayload = {
  text?: string;
  done?: boolean;
  error?: string;
  model?: string;
  usage?: ProviderUsageMetrics;
};

export function encodeProviderSse(payload: ProviderSsePayload): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export function parseProviderSseBlock(block: string): ProviderSsePayload | null {
  for (const line of block.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    try {
      return JSON.parse(line.slice(6)) as ProviderSsePayload;
    } catch {
      // ignore malformed event
    }
  }
  return null;
}

export type GeminiUsageMetadataLike = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  responseTokenCount?: number;
  cachedContentTokenCount?: number;
  totalTokenCount?: number;
};

export function mapGeminiUsageMetadata(
  meta: GeminiUsageMetadataLike | undefined
): ProviderUsageMetrics | undefined {
  if (!meta) return undefined;

  const inputTokens = meta.promptTokenCount;
  const outputTokens = meta.candidatesTokenCount ?? meta.responseTokenCount;
  const cachedInputTokens = meta.cachedContentTokenCount;
  const totalTokens = meta.totalTokenCount;

  if (
    inputTokens == null &&
    outputTokens == null &&
    cachedInputTokens == null &&
    totalTokens == null
  ) {
    return undefined;
  }

  return {
    inputTokens,
    outputTokens,
    cachedInputTokens,
    totalTokens,
  };
}

export function mapDeepSeekUsage(usage: {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
}): ProviderUsageMetrics {
  const cachedInputTokens =
    usage.prompt_cache_hit_tokens != null ? usage.prompt_cache_hit_tokens : undefined;

  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    cachedInputTokens,
    totalTokens: usage.total_tokens,
  };
}

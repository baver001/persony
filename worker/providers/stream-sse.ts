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

function readUsageCount(meta: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

export function mapGeminiUsageMetadata(
  meta: Record<string, unknown> | undefined
): ProviderUsageMetrics | undefined {
  if (!meta) return undefined;

  const inputTokens = readUsageCount(
    meta,
    'promptTokenCount',
    'prompt_token_count'
  );
  const outputTokens = readUsageCount(
    meta,
    'candidatesTokenCount',
    'responseTokenCount',
    'candidates_token_count'
  );
  const cachedInputTokens = readUsageCount(
    meta,
    'cachedContentTokenCount',
    'cached_content_token_count'
  );
  const totalTokens = readUsageCount(meta, 'totalTokenCount', 'total_token_count');

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

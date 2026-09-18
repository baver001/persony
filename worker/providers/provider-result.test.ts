import { describe, expect, it } from 'vitest';
import { mergeProviderUsage } from './provider-result';
import { mapDeepSeekUsage, mapGeminiUsageMetadata } from './stream-sse';

describe('mergeProviderUsage', () => {
  it('prefers provider-reported usage over text estimation', () => {
    const result = mergeProviderUsage('hello world', 'response text', {
      inputTokens: 42,
      outputTokens: 17,
      totalTokens: 59,
    });

    expect(result.usageEstimated).toBe(false);
    expect(result.usage.inputTokens).toBe(42);
    expect(result.usage.outputTokens).toBe(17);
    expect(result.usage.totalTokens).toBe(59);
  });

  it('falls back to text estimation when usage is missing', () => {
    const result = mergeProviderUsage('12345678', 'abcd');

    expect(result.usageEstimated).toBe(true);
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(result.usage.outputTokens).toBeGreaterThan(0);
  });
});

describe('mapGeminiUsageMetadata', () => {
  it('maps Gemini usageMetadata fields', () => {
    const usage = mapGeminiUsageMetadata({
      promptTokenCount: 100,
      candidatesTokenCount: 25,
      cachedContentTokenCount: 10,
      totalTokenCount: 135,
    });

    expect(usage).toEqual({
      inputTokens: 100,
      outputTokens: 25,
      cachedInputTokens: 10,
      totalTokens: 135,
    });
  });
});

describe('mapDeepSeekUsage', () => {
  it('maps DeepSeek usage including cache hit tokens', () => {
    const usage = mapDeepSeekUsage({
      prompt_tokens: 80,
      completion_tokens: 20,
      total_tokens: 100,
      prompt_cache_hit_tokens: 32,
    });

    expect(usage).toEqual({
      inputTokens: 80,
      outputTokens: 20,
      cachedInputTokens: 32,
      totalTokens: 100,
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  computeDurationCost,
  computePerImageCost,
  computeUsageCost,
  findBestPricingEntry,
  findPricingEntries,
  mergePricingCatalog,
  pricingFreshness,
  resolveCatalogVersion,
} from './pricing-catalog';
import type { PricingEntry } from './pricing-types';
import { resolveDeepSeekTimeRule } from './pricing-time';

describe('pricing-catalog', () => {
  it('selects current price by effective_from', () => {
    const legacy = computeUsageCost({
      provider: 'google',
      model: 'gemini-3.8-flash',
      usage: { inputTokens: 1_000_000, outputTokens: 0 },
      atIso: '2025-06-01T12:00:00.000Z',
    });
    const current = computeUsageCost({
      provider: 'google',
      model: 'gemini-3.8-flash',
      usage: { inputTokens: 1_000_000, outputTokens: 0 },
      atIso: '2026-06-01T12:00:00.000Z',
    });

    expect(legacy.totalMicrousd).toBe(100_000);
    expect(current.totalMicrousd).toBe(150_000);
  });

  it('applies peak vs off-peak for DeepSeek by timestamp', () => {
    const offPeak = computeUsageCost({
      provider: 'deepseek',
      model: 'deepseek-chat',
      usage: { inputTokens: 1_000_000, outputTokens: 0 },
      atIso: '2026-09-18T12:00:00.000Z', // Thursday noon UTC
    });
    const peak = computeUsageCost({
      provider: 'deepseek',
      model: 'deepseek-chat',
      usage: { inputTokens: 1_000_000, outputTokens: 0 },
      atIso: '2026-09-18T02:00:00.000Z', // Thursday 02:00 UTC
    });

    expect(offPeak.totalMicrousd).toBe(140_000);
    expect(peak.totalMicrousd).toBe(280_000);
    expect(peak.totalMicrousd).toBe(offPeak.totalMicrousd * 2);
  });

  it('bills cache hit and cache miss separately for DeepSeek', () => {
    const result = computeUsageCost({
      provider: 'deepseek',
      model: 'deepseek-chat',
      usage: {
        inputTokens: 1_000_000,
        cachedInputTokens: 400_000,
        outputTokens: 0,
      },
      atIso: '2026-09-18T12:00:00.000Z',
    });

    expect(result.lines).toHaveLength(2);
    const missLine = result.lines.find((l) => l.pricingTier === 'cache_miss');
    const hitLine = result.lines.find((l) => l.pricingTier === 'cache_hit');
    expect(missLine?.units).toBe(600_000);
    expect(hitLine?.units).toBe(400_000);
    expect(missLine?.costMicrousd).toBe(84_000);
    expect(hitLine?.costMicrousd).toBe(5_600);
  });

  it('returns unpriced for unknown model', () => {
    const result = computeUsageCost({
      provider: 'google',
      model: 'unknown-model',
      usage: { inputTokens: 100, outputTokens: 50 },
    });
    expect(result.priced).toBe(false);
    expect(result.totalMicrousd).toBe(0);
    expect(result.pricingEntryIds).toHaveLength(0);
  });

  it('uses integer-safe math', () => {
    const result = computeUsageCost({
      provider: 'deepseek',
      model: 'deepseek-chat',
      usage: { inputTokens: 3, outputTokens: 7 },
      atIso: '2026-09-18T12:00:00.000Z',
    });
    expect(Number.isInteger(result.totalMicrousd)).toBe(true);
  });

  it('reports pricing freshness', () => {
    expect(pricingFreshness('2026-09-18')).toBe('verified');
    expect(pricingFreshness('2020-01-01')).toBe('stale');
    expect(pricingFreshness('invalid')).toBe('unknown');
  });

  it('merges DB overrides by id', () => {
    const override: PricingEntry = {
      id: 'gemini-3.8-flash:text_input:default',
      provider: 'google',
      model: 'gemini-3.8-flash',
      dimension: 'text_input',
      effectiveFrom: '2026-09-18T00:00:00.000Z',
      effectiveTo: null,
      priceMicrousdPerUnit: 888_000,
      unit: 'per_million_tokens',
      currency: 'USD',
      pricingTier: 'default',
      timeRule: 'any',
      sourceReference: 'https://example.com',
      verifiedAt: '2026-09-18',
    };
    const merged = mergePricingCatalog([override]);
    const entry = merged.find((e) => e.id === override.id);
    expect(entry?.priceMicrousdPerUnit).toBe(888_000);
    expect(resolveCatalogVersion(1, '2026-09-18T12:00:00.000Z')).toContain('+db@2026-09-18');
  });
});

describe('pricing-time', () => {
  it('marks weekend as off-peak', () => {
    expect(resolveDeepSeekTimeRule('2026-09-19T02:00:00.000Z')).toBe('off_peak');
  });

  it('marks weekday peak windows', () => {
    expect(resolveDeepSeekTimeRule('2026-09-18T02:00:00.000Z')).toBe('peak');
    expect(resolveDeepSeekTimeRule('2026-09-18T08:00:00.000Z')).toBe('peak');
  });
});

describe('findPricingEntries', () => {
  it('returns historical entries only inside effective window', () => {
    const entries = findPricingEntries(
      'google',
      'gemini-3.8-flash',
      'text_input',
      '2025-06-01T00:00:00.000Z',
      { pricingTier: 'default' }
    );
    expect(entries[0]?.id).toContain('legacy');
  });

  it('finds current default tier for gemini output', () => {
    const entry = findBestPricingEntry(
      'google',
      'gemini-3.8-flash',
      'text_output',
      '2026-09-18T12:00:00.000Z',
      'default'
    );
    expect(entry?.priceMicrousdPerUnit).toBe(600_000);
  });

  it('prices avatar generation by per_image catalog row', () => {
    const result = computePerImageCost({
      provider: 'google',
      model: 'gemini-3.1-flash-image',
      imageCount: 1,
    });
    expect(result.priced).toBe(true);
    expect(result.totalMicrousd).toBe(4_000_000);
    expect(result.lines[0]?.dimension).toBe('per_image');
  });

  it('prices voice call duration by per_minute catalog row', () => {
    const result = computeDurationCost({
      provider: 'google',
      model: 'gemini-3.8-live',
      durationMs: 120_000,
    });
    expect(result.priced).toBe(true);
    expect(result.totalMicrousd).toBe(160_000);
    expect(result.lines[0]?.dimension).toBe('per_minute');
  });
});

import { describe, expect, it } from 'vitest';
import { CostEngine, energyUnitsFromProviderCost } from './cost-engine';

describe('CostEngine', () => {
  const engine = new CostEngine();

  it('computes input + output cost for known model', () => {
    const result = engine.computeProviderCost({
      provider: 'google',
      model: 'gemini-3.8-flash',
      usage: { inputTokens: 1_000_000, outputTokens: 500_000 },
      usageEstimated: false,
    });

    expect(result.priced).toBe(true);
    expect(result.providerCostMicrousd).toBe(150_000 + 300_000);
    expect(result.usageEstimated).toBe(false);
  });

  it('returns priced=false for unknown model', () => {
    const result = engine.computeProviderCost({
      provider: 'google',
      model: 'unknown-model',
      usage: { inputTokens: 100, outputTokens: 50 },
      usageEstimated: true,
    });
    expect(result.priced).toBe(false);
    expect(result.providerCostMicrousd).toBe(0);
    expect(result.usageEstimated).toBe(true);
  });

  it('uses integer-safe token math without float drift', () => {
    const result = engine.computeProviderCost({
      provider: 'deepseek',
      model: 'deepseek-chat',
      usage: { inputTokens: 3, outputTokens: 7 },
      usageEstimated: false,
    });
    expect(Number.isInteger(result.providerCostMicrousd)).toBe(true);
  });
});

describe('energyUnitsFromProviderCost', () => {
  it('applies markup and rounds up to at least 1 unit', () => {
    expect(energyUnitsFromProviderCost(0)).toBe(1);
    expect(energyUnitsFromProviderCost(1_000, 2.5, 100)).toBeGreaterThanOrEqual(1);
  });
});

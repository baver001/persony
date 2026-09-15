import { describe, expect, it } from 'vitest';
import {
  calculateCost,
  calculateRetailCostMicrousd,
  retailMicrousdToEnergyUnits,
} from './cost-engine';
import { FULL_BATTERY_UNITS, TARGET_AI_GROSS_MARGIN } from './constants';

describe('CostEngine', () => {
  it('applies target gross margin to provider cost', () => {
    const retail = calculateRetailCostMicrousd(100_000);
    expect(retail).toBe(Math.ceil(100_000 / (1 - TARGET_AI_GROSS_MARGIN)));
  });

  it('converts retail microusd to energy units', () => {
    const units = retailMicrousdToEnergyUnits(2_000_000);
    expect(units).toBeGreaterThan(0);
    expect(units).toBeLessThanOrEqual(FULL_BATTERY_UNITS);
  });

  it('calculates full cost breakdown for chat usage', () => {
    const breakdown = calculateCost('deepseek', 'deepseek-chat', {
      inputTokens: 1000,
      cachedInputTokens: 0,
      outputTokens: 500,
      audioInputSeconds: 0,
      audioOutputSeconds: 0,
      toolCostMicrousd: 0,
    });
    expect(breakdown.providerCostMicrousd).toBeGreaterThan(0);
    expect(breakdown.retailCostMicrousd).toBeGreaterThan(breakdown.providerCostMicrousd);
    expect(breakdown.energyUnits).toBeGreaterThan(0);
  });
});

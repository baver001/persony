import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RETAIL_PRICING,
  energyUnitsFromProviderCost,
  retailMicrousdFromProviderCost,
  simulatedGrossMarginPercent,
  simulatedGrossProfitMicrousd,
} from './retail-pricing';

describe('retail-pricing', () => {
  it('computes retail from target gross margin', () => {
    const cogs = 100_000;
    const retail = retailMicrousdFromProviderCost(cogs, {
      ...DEFAULT_RETAIL_PRICING,
      targetAiGrossMargin: 0.8,
    });
    expect(retail).toBe(500_000);
    expect(simulatedGrossProfitMicrousd(cogs, { ...DEFAULT_RETAIL_PRICING, targetAiGrossMargin: 0.8 })).toBe(400_000);
    expect(simulatedGrossMarginPercent(cogs, { ...DEFAULT_RETAIL_PRICING, targetAiGrossMargin: 0.8 })).toBe(80);
  });

  it('converts retail microusd to energy units', () => {
    const units = energyUnitsFromProviderCost(100_000, {
      ...DEFAULT_RETAIL_PRICING,
      targetAiGrossMargin: 0.5,
      microusdPerEnergyUnit: 100,
    });
    expect(units).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(units)).toBe(true);
  });

  it('never returns zero energy units', () => {
    expect(energyUnitsFromProviderCost(0)).toBe(1);
  });
});

import { TARGET_AI_GROSS_MARGIN } from './constants';
import { getSystemSetting } from '../repositories/settings-repository';

export type RetailPricingConfig = {
  version: string;
  targetAiGrossMargin: number;
  microusdPerEnergyUnit: number;
};

export const DEFAULT_RETAIL_PRICING: RetailPricingConfig = {
  version: '2026-09-18',
  targetAiGrossMargin: TARGET_AI_GROSS_MARGIN,
  microusdPerEnergyUnit: 100,
};

/** Simulated retail value from provider COGS: retail = COGS / (1 - margin). */
export function retailMicrousdFromProviderCost(
  providerCostMicrousd: number,
  config: RetailPricingConfig = DEFAULT_RETAIL_PRICING
): number {
  if (providerCostMicrousd <= 0) return 0;
  const margin = clampMargin(config.targetAiGrossMargin);
  return Math.round(providerCostMicrousd / (1 - margin));
}

export function simulatedGrossProfitMicrousd(
  knownCogsMicrousd: number,
  config: RetailPricingConfig = DEFAULT_RETAIL_PRICING
): number {
  const retail = retailMicrousdFromProviderCost(knownCogsMicrousd, config);
  return Math.max(0, retail - knownCogsMicrousd);
}

export function simulatedGrossMarginPercent(
  knownCogsMicrousd: number,
  config: RetailPricingConfig = DEFAULT_RETAIL_PRICING
): number {
  const retail = retailMicrousdFromProviderCost(knownCogsMicrousd, config);
  if (retail <= 0) return 0;
  return Math.round(((retail - knownCogsMicrousd) / retail) * 1000) / 10;
}

export function energyUnitsFromProviderCost(
  providerCostMicrousd: number,
  config: RetailPricingConfig = DEFAULT_RETAIL_PRICING
): number {
  if (providerCostMicrousd <= 0) return 1;
  const retailMicrousd = retailMicrousdFromProviderCost(providerCostMicrousd, config);
  return Math.max(1, Math.ceil(retailMicrousd / config.microusdPerEnergyUnit));
}

function clampMargin(margin: number): number {
  if (!Number.isFinite(margin)) return TARGET_AI_GROSS_MARGIN;
  return Math.min(Math.max(margin, 0), 0.99);
}

export async function loadRetailPricingConfig(db: D1Database): Promise<RetailPricingConfig> {
  const merged: RetailPricingConfig = { ...DEFAULT_RETAIL_PRICING };

  const margin = await getSystemSetting(db, 'target_ai_gross_margin');
  if (typeof margin === 'number') {
    merged.targetAiGrossMargin = clampMargin(margin);
  }

  const perUnit = await getSystemSetting(db, 'retail_microusd_per_energy_unit');
  if (typeof perUnit === 'number' && perUnit > 0) {
    merged.microusdPerEnergyUnit = perUnit;
  }

  const version = await getSystemSetting(db, 'retail_pricing_version');
  if (typeof version === 'string' && version.trim()) {
    merged.version = version.trim();
  }

  return merged;
}

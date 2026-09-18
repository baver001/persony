import type { ProviderUsageMetrics } from '../providers/provider-result';
import { findProviderPrice, PRICING_CATALOG_VERSION } from './provider-pricing';

export type CostComputationInput = {
  provider: string;
  model: string;
  usage: ProviderUsageMetrics;
  usageEstimated: boolean;
  atIso?: string;
};

export type CostComputationResult = {
  providerCostMicrousd: number;
  usageEstimated: boolean;
  pricingVersion: string;
  priced: boolean;
};

function costForTokens(tokens: number, pricePerMillion: number): number {
  if (tokens <= 0 || pricePerMillion <= 0) return 0;
  return Math.round((tokens * pricePerMillion) / 1_000_000);
}

export class CostEngine {
  computeProviderCost(input: CostComputationInput): CostComputationResult {
    const entry = findProviderPrice(
      input.provider,
      input.model,
      input.atIso ?? new Date().toISOString()
    );

    if (!entry) {
      return {
        providerCostMicrousd: 0,
        usageEstimated: input.usageEstimated,
        pricingVersion: PRICING_CATALOG_VERSION,
        priced: false,
      };
    }

    const inputTokens = input.usage.inputTokens ?? 0;
    const outputTokens = input.usage.outputTokens ?? 0;
    const cachedTokens = input.usage.cachedInputTokens ?? 0;

    const inputCost = costForTokens(inputTokens, entry.inputPriceMicrousdPerMillion);
    const cachedCost = entry.cachedInputPriceMicrousdPerMillion
      ? costForTokens(cachedTokens, entry.cachedInputPriceMicrousdPerMillion)
      : 0;
    const outputCost = costForTokens(
      outputTokens,
      entry.outputPriceMicrousdPerMillion
    );

    return {
      providerCostMicrousd: inputCost + cachedCost + outputCost,
      usageEstimated: input.usageEstimated,
      pricingVersion: PRICING_CATALOG_VERSION,
      priced: true,
    };
  }
}

export const defaultCostEngine = new CostEngine();

export function energyUnitsFromProviderCost(
  providerCostMicrousd: number,
  markupTarget = 2.5,
  microusdPerEnergyUnit = 100
): number {
  if (providerCostMicrousd <= 0) return 1;
  const retailMicrousd = Math.round(providerCostMicrousd * markupTarget);
  return Math.max(1, Math.ceil(retailMicrousd / microusdPerEnergyUnit));
}

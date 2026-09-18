import type { ProviderUsageMetrics } from '../providers/provider-result';
import type { CostConfidence } from './cost-confidence';
import { resolveCostConfidence } from './cost-confidence';
import { computeUsageCost, PRICING_CATALOG_VERSION } from './pricing-catalog';
import type { PricingComputationLine } from './pricing-types';

export type CostComputationInput = {
  provider: string;
  model: string;
  usage: ProviderUsageMetrics;
  usageEstimated: boolean;
  atIso?: string;
};

export type CostComputationResult = {
  /** Null when cost cannot be determined — never treat as $0 known COGS. */
  providerCostMicrousd: number | null;
  costConfidence: CostConfidence;
  usageEstimated: boolean;
  pricingVersion: string;
  /** Comma-separated pricing entry ids used for this computation */
  pricingEntryId: string | null;
  costLines: PricingComputationLine[];
  priced: boolean;
};

export class CostEngine {
  computeProviderCost(input: CostComputationInput): CostComputationResult {
    const pricing = computeUsageCost({
      provider: input.provider,
      model: input.model,
      usage: input.usage,
      atIso: input.atIso,
    });

    if (!pricing.priced) {
      const unpriced = {
        providerCostMicrousd: null,
        usageEstimated: input.usageEstimated,
        pricingVersion: PRICING_CATALOG_VERSION,
        pricingEntryId: null,
        costLines: [],
        priced: false,
      };
      return {
        ...unpriced,
        costConfidence: resolveCostConfidence({ ...unpriced, priced: false }),
      };
    }

    const priced = {
      providerCostMicrousd: pricing.totalMicrousd,
      usageEstimated: input.usageEstimated,
      pricingVersion: pricing.catalogVersion,
      pricingEntryId: pricing.pricingEntryIds.join(',') || null,
      costLines: pricing.lines,
      priced: true,
    };
    return {
      ...priced,
      costConfidence: resolveCostConfidence(priced),
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

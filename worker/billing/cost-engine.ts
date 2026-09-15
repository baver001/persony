import type { ProviderUsage } from '../providers/types';
import { TARGET_AI_GROSS_MARGIN } from './constants';
import { getPricingRate, getPricingVersion } from './pricing-registry';

export type CostBreakdown = {
  providerCostMicrousd: number;
  retailCostMicrousd: number;
  energyUnits: number;
  pricingVersion: string;
};

const ENERGY_PER_RETAIL_MICROUSD = 500; // 1M units ≈ $2 retail

export function calculateProviderCostMicrousd(
  provider: string,
  model: string,
  usage: ProviderUsage
): number {
  const rate = getPricingRate(provider, model);
  const inputCost = (usage.inputTokens / 1_000_000) * rate.inputPriceMicrousdPerMtok;
  const cachedCost =
    (usage.cachedInputTokens / 1_000_000) * rate.cachedInputPriceMicrousdPerMtok;
  const outputCost = (usage.outputTokens / 1_000_000) * rate.outputPriceMicrousdPerMtok;
  const audioInCost =
    (usage.audioInputSeconds / 3600) * rate.audioInputPriceMicrousdPerHour;
  const audioOutCost =
    (usage.audioOutputSeconds / 3600) * rate.audioOutputPriceMicrousdPerHour;

  return Math.ceil(
    inputCost + cachedCost + outputCost + audioInCost + audioOutCost + usage.toolCostMicrousd
  );
}

export function calculateRetailCostMicrousd(providerCostMicrousd: number): number {
  const margin = TARGET_AI_GROSS_MARGIN;
  if (margin >= 1) return providerCostMicrousd;
  return Math.ceil(providerCostMicrousd / (1 - margin));
}

export function retailMicrousdToEnergyUnits(retailMicrousd: number): number {
  return Math.ceil(retailMicrousd / ENERGY_PER_RETAIL_MICROUSD);
}

export function calculateCost(
  provider: string,
  model: string,
  usage: ProviderUsage
): CostBreakdown {
  const providerCostMicrousd = calculateProviderCostMicrousd(provider, model, usage);
  const retailCostMicrousd = calculateRetailCostMicrousd(providerCostMicrousd);
  const energyUnits = retailMicrousdToEnergyUnits(retailCostMicrousd);

  return {
    providerCostMicrousd,
    retailCostMicrousd,
    energyUnits,
    pricingVersion: getPricingVersion(),
  };
}

export function estimateUsageFromText(
  inputText: string,
  outputText: string,
  audioSeconds = 0
): ProviderUsage {
  return {
    inputTokens: Math.ceil(inputText.length / 4),
    cachedInputTokens: 0,
    outputTokens: Math.ceil(outputText.length / 4),
    audioInputSeconds: audioSeconds,
    audioOutputSeconds: 0,
    toolCostMicrousd: 0,
  };
}

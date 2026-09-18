/**
 * Legacy pricing facade — delegates to Pricing Catalog 2.0.
 * Prefer `pricing-catalog.ts` for new code.
 */

import {
  computeUsageCost,
  findBestPricingEntry,
  PRICING_CATALOG_VERSION,
} from './pricing-catalog';

export type PricingUnit = 'per_million_tokens';

/** @deprecated Use PricingEntry from pricing-types.ts */
export type ProviderPriceEntry = {
  provider: string;
  model: string;
  effectiveFrom: string;
  inputPriceMicrousdPerMillion: number;
  outputPriceMicrousdPerMillion: number;
  cachedInputPriceMicrousdPerMillion?: number;
  unit: PricingUnit;
  currency: 'USD';
};

export { PRICING_CATALOG_VERSION };

/** @deprecated Use PRICING_CATALOG from pricing-catalog.ts */
export const PROVIDER_PRICING_CATALOG: ProviderPriceEntry[] = [];

/**
 * Legacy helper — returns aggregated text input/output rates for a timestamp.
 * Does not include peak/off-peak split; use computeUsageCost for accurate billing.
 */
export function findProviderPrice(
  provider: string,
  model: string,
  atIso = new Date().toISOString()
): ProviderPriceEntry | null {
  const input = findBestPricingEntry(provider, model, 'text_input', atIso, 'cache_miss')
    ?? findBestPricingEntry(provider, model, 'text_input', atIso, 'default');
  const output = findBestPricingEntry(provider, model, 'text_output', atIso, 'default');
  const cached = findBestPricingEntry(provider, model, 'cached_input', atIso, 'cache_hit')
    ?? findBestPricingEntry(provider, model, 'cached_input', atIso, 'default');

  if (!input && !output) return null;

  return {
    provider,
    model,
    effectiveFrom: input?.effectiveFrom ?? output?.effectiveFrom ?? atIso,
    inputPriceMicrousdPerMillion: input?.priceMicrousdPerUnit ?? 0,
    outputPriceMicrousdPerMillion: output?.priceMicrousdPerUnit ?? 0,
    cachedInputPriceMicrousdPerMillion: cached?.priceMicrousdPerUnit,
    unit: 'per_million_tokens',
    currency: 'USD',
  };
}

/** Re-export for callers migrating to catalog 2.0 */
export { computeUsageCost } from './pricing-catalog';

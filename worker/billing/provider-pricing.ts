/**
 * Versioned provider pricing catalog (micro-USD per token unit).
 * 1 micro-USD = $0.000001 — integer-safe financial math.
 */

export type PricingUnit = 'per_million_tokens';

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

export const PRICING_CATALOG_VERSION = '2026-09-18';

/** @see https://ai.google.dev/gemini-api/docs/pricing */
/** @see https://api-docs.deepseek.com/quick_start/pricing */
export const PROVIDER_PRICING_CATALOG: ProviderPriceEntry[] = [
  {
    provider: 'google',
    model: 'gemini-3.8-flash',
    effectiveFrom: '2026-01-01',
    inputPriceMicrousdPerMillion: 150_000,
    outputPriceMicrousdPerMillion: 600_000,
    unit: 'per_million_tokens',
    currency: 'USD',
  },
  {
    provider: 'google',
    model: 'gemini-3.5-flash-lite',
    effectiveFrom: '2026-01-01',
    inputPriceMicrousdPerMillion: 75_000,
    outputPriceMicrousdPerMillion: 300_000,
    unit: 'per_million_tokens',
    currency: 'USD',
  },
  {
    provider: 'deepseek',
    model: 'deepseek-chat',
    effectiveFrom: '2026-01-01',
    inputPriceMicrousdPerMillion: 140_000,
    outputPriceMicrousdPerMillion: 280_000,
    unit: 'per_million_tokens',
    currency: 'USD',
  },
  {
    provider: 'deepseek',
    model: 'deepseek-reasoner',
    effectiveFrom: '2026-01-01',
    inputPriceMicrousdPerMillion: 550_000,
    outputPriceMicrousdPerMillion: 2_190_000,
    unit: 'per_million_tokens',
    currency: 'USD',
  },
];

export function findProviderPrice(
  provider: string,
  model: string,
  atIso = new Date().toISOString()
): ProviderPriceEntry | null {
  const at = Date.parse(atIso);
  const matches = PROVIDER_PRICING_CATALOG.filter(
    (e) =>
      e.provider === provider &&
      e.model === model &&
      Date.parse(e.effectiveFrom) <= at
  );
  if (!matches.length) return null;
  return matches.sort(
    (a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom)
  )[0];
}

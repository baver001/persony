import { PRICING_VERSION } from './constants';

export type PricingRate = {
  provider: string;
  model: string;
  inputPriceMicrousdPerMtok: number;
  cachedInputPriceMicrousdPerMtok: number;
  outputPriceMicrousdPerMtok: number;
  audioInputPriceMicrousdPerHour: number;
  audioOutputPriceMicrousdPerHour: number;
};

/** Versioned pricing — single source of truth for COGS. */
const RATES: PricingRate[] = [
  {
    provider: 'gemini',
    model: 'gemini-3.6-flash',
    inputPriceMicrousdPerMtok: 150_000,
    cachedInputPriceMicrousdPerMtok: 40_000,
    outputPriceMicrousdPerMtok: 600_000,
    audioInputPriceMicrousdPerHour: 0,
    audioOutputPriceMicrousdPerHour: 0,
  },
  {
    provider: 'gemini',
    model: 'gemini-transcribe',
    inputPriceMicrousdPerMtok: 100_000,
    cachedInputPriceMicrousdPerMtok: 0,
    outputPriceMicrousdPerMtok: 400_000,
    audioInputPriceMicrousdPerHour: 2_000_000,
    audioOutputPriceMicrousdPerHour: 0,
  },
  {
    provider: 'gemini',
    model: 'gemini-live',
    inputPriceMicrousdPerMtok: 200_000,
    cachedInputPriceMicrousdPerMtok: 0,
    outputPriceMicrousdPerMtok: 800_000,
    audioInputPriceMicrousdPerHour: 3_000_000,
    audioOutputPriceMicrousdPerHour: 5_000_000,
  },
  {
    provider: 'deepseek',
    model: 'deepseek-chat',
    inputPriceMicrousdPerMtok: 27_000,
    cachedInputPriceMicrousdPerMtok: 7_000,
    outputPriceMicrousdPerMtok: 110_000,
    audioInputPriceMicrousdPerHour: 0,
    audioOutputPriceMicrousdPerHour: 0,
  },
];

export function getPricingRate(provider: string, model: string): PricingRate {
  const exact = RATES.find((r) => r.provider === provider && r.model === model);
  if (exact) return exact;
  const providerDefault = RATES.find((r) => r.provider === provider);
  if (providerDefault) return providerDefault;
  return RATES[0];
}

export function getPricingVersion(): string {
  return PRICING_VERSION;
}

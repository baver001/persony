/** Billable usage dimension — extensible beyond text tokens. */
export type PricingDimension =
  | 'text_input'
  | 'text_output'
  | 'cached_input'
  | 'audio_input'
  | 'audio_output'
  | 'image_input'
  | 'image_output'
  | 'video_input'
  | 'per_image'
  | 'per_minute'
  | 'context_cache_storage'
  | 'provider_surcharge';

export type PricingUnit =
  | 'per_million_tokens'
  | 'per_image'
  | 'per_minute'
  | 'per_gib_hour';

export type PricingTier = 'default' | 'cache_hit' | 'cache_miss';

export type TimeRule = 'any' | 'peak' | 'off_peak';

export type PricingFreshness = 'verified' | 'stale' | 'unknown';

export type PricingEntry = {
  /** Stable id persisted on inference_runs.pricing_entry_id */
  id: string;
  provider: string;
  model: string;
  dimension: PricingDimension;
  effectiveFrom: string;
  effectiveTo: string | null;
  /** Integer micro-USD per pricing unit (e.g. per 1M tokens). */
  priceMicrousdPerUnit: number;
  unit: PricingUnit;
  currency: 'USD';
  pricingTier: PricingTier;
  timeRule: TimeRule;
  sourceReference: string;
  verifiedAt: string;
};

export type PricingComputationLine = {
  pricingEntryId: string;
  dimension: PricingDimension;
  units: number;
  priceMicrousdPerUnit: number;
  costMicrousd: number;
  pricingTier: PricingTier;
  timeRule: TimeRule;
};

export type PricingComputationResult = {
  lines: PricingComputationLine[];
  totalMicrousd: number;
  pricingEntryIds: string[];
  catalogVersion: string;
  priced: boolean;
};

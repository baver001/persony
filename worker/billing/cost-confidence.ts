/** How confidently Persony knows provider COGS for an inference. */
export type CostConfidence = 'actual' | 'estimated' | 'unpriced';

export const COST_CONFIDENCE_VALUES: readonly CostConfidence[] = [
  'actual',
  'estimated',
  'unpriced',
];

export function isKnownCostConfidence(confidence: CostConfidence): boolean {
  return confidence === 'actual' || confidence === 'estimated';
}

export function resolveCostConfidence(input: {
  priced: boolean;
  usageEstimated: boolean;
  providerCostMicrousd: number | null;
}): CostConfidence {
  if (!input.priced || input.providerCostMicrousd === null) {
    return 'unpriced';
  }
  return input.usageEstimated ? 'estimated' : 'actual';
}

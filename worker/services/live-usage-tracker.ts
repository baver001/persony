import type { ProviderUsageMetrics } from '../providers/provider-result';

/** Live API sends cumulative usage on turnComplete — keep the latest snapshot. */
export function createLiveUsageTracker(): {
  update: (usage: ProviderUsageMetrics) => void;
  snapshot: () => ProviderUsageMetrics | undefined;
} {
  let latest: ProviderUsageMetrics | undefined;

  return {
    update(usage) {
      latest = {
        inputTokens: usage.inputTokens ?? latest?.inputTokens,
        outputTokens: usage.outputTokens ?? latest?.outputTokens,
        cachedInputTokens: usage.cachedInputTokens ?? latest?.cachedInputTokens,
        totalTokens: usage.totalTokens ?? latest?.totalTokens,
      };
    },
    snapshot() {
      if (!latest) return undefined;
      const hasCounts =
        latest.inputTokens != null ||
        latest.outputTokens != null ||
        latest.totalTokens != null;
      return hasCounts ? latest : undefined;
    },
  };
}

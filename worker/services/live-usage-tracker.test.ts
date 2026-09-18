import { describe, expect, it } from 'vitest';
import { createLiveUsageTracker } from './live-usage-tracker';

describe('live-usage-tracker', () => {
  it('keeps the latest cumulative usage snapshot', () => {
    const tracker = createLiveUsageTracker();
    tracker.update({ inputTokens: 100, outputTokens: 10, totalTokens: 110 });
    tracker.update({ inputTokens: 250, outputTokens: 40, totalTokens: 290 });

    expect(tracker.snapshot()).toEqual({
      inputTokens: 250,
      outputTokens: 40,
      cachedInputTokens: undefined,
      totalTokens: 290,
    });
  });
});

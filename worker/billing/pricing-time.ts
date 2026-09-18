import type { TimeRule } from './pricing-types';

/**
 * DeepSeek official peak windows (UTC, Mon–Fri).
 * @see https://api-docs.deepseek.com/quick_start/pricing
 */
export function resolveDeepSeekTimeRule(atIso: string): 'peak' | 'off_peak' {
  const d = new Date(atIso);
  const utcDay = d.getUTCDay();
  if (utcDay === 0 || utcDay === 6) return 'off_peak';

  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  const inPeak =
    (minutes >= 60 && minutes < 240) || (minutes >= 360 && minutes < 600);
  return inPeak ? 'peak' : 'off_peak';
}

export function resolveTimeRuleForProvider(
  provider: string,
  atIso: string
): TimeRule {
  if (provider === 'deepseek') {
    return resolveDeepSeekTimeRule(atIso);
  }
  return 'any';
}

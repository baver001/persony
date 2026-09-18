import { describe, expect, it } from 'vitest';
import { formatMicrousd } from './utils';

describe('formatMicrousd', () => {
  it('renders em dash for null (unknown COGS — never $0)', () => {
    expect(formatMicrousd(null)).toBe('—');
  });

  it('formats micro-USD values', () => {
    expect(formatMicrousd(1_500_000)).toBe('$1.50');
    expect(formatMicrousd(150_000)).toMatch(/^\$0\.15/);
  });
});

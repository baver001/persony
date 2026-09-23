import { describe, expect, it } from 'vitest';
import { avatarErrorMessage } from './avatar-errors';

const t = (key: string) => `t:${key}`;

describe('avatarErrorMessage', () => {
  it('maps known API error codes', () => {
    expect(avatarErrorMessage('RATE_LIMIT', 'fallback', t)).toBe('t:avatarErrorRateLimit');
    expect(avatarErrorMessage('MODEL_UNAVAILABLE', 'fallback', t)).toBe(
      't:avatarErrorModelUnavailable'
    );
  });

  it('falls back for unknown codes', () => {
    expect(avatarErrorMessage('UNKNOWN', 'fallback', t)).toBe('fallback');
  });
});

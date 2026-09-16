import { describe, expect, it } from 'vitest';
import { isDevModeAllowed, isProduction } from './env';

describe('env helpers', () => {
  it('treats ENVIRONMENT=production as production', () => {
    expect(isProduction({ GEMINI_API_KEY: 'x', ENVIRONMENT: 'production' })).toBe(true);
  });

  it('disables dev mode in production even if flag set', () => {
    expect(
      isDevModeAllowed({
        GEMINI_API_KEY: 'x',
        ENVIRONMENT: 'production',
        PERSONY_DEV_MODE: 'true',
      })
    ).toBe(false);
  });

  it('allows dev mode only in non-production', () => {
    expect(
      isDevModeAllowed({
        GEMINI_API_KEY: 'x',
        ENVIRONMENT: 'development',
        PERSONY_DEV_MODE: 'true',
      })
    ).toBe(true);
  });
});

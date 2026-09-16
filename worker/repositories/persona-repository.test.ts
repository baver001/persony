import { describe, expect, it } from 'vitest';
import { shouldAllowMemorySeed } from './persona-repository';

describe('persona repository seed policy', () => {
  it('allows memory seed only without configured DB in dev', () => {
    expect(
      shouldAllowMemorySeed({ GEMINI_API_KEY: 'x', ENVIRONMENT: 'development' }, false)
    ).toBe(true);
  });

  it('does not allow memory seed when DB is ready', () => {
    expect(
      shouldAllowMemorySeed(
        { GEMINI_API_KEY: 'x', ENVIRONMENT: 'development', DB: {} as D1Database },
        true
      )
    ).toBe(false);
  });

  it('does not allow memory seed in production without DB', () => {
    expect(shouldAllowMemorySeed({ GEMINI_API_KEY: 'x', ENVIRONMENT: 'production' }, false)).toBe(
      false
    );
  });
});

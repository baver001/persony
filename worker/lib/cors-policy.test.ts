import { describe, expect, it } from 'vitest';
import { resolveAllowedCorsOrigin } from './cors-policy';

const prodEnv = { GEMINI_API_KEY: 'x', ENVIRONMENT: 'production' as const };
const devEnv = { GEMINI_API_KEY: 'x', ENVIRONMENT: 'development' as const };

describe('resolveAllowedCorsOrigin', () => {
  it('rejects evil origin in production', () => {
    expect(
      resolveAllowedCorsOrigin('https://evil.example', prodEnv, 'https://persony.org/api/chat')
    ).toBeNull();
  });

  it('allows same-origin in production', () => {
    expect(
      resolveAllowedCorsOrigin('https://persony.org', prodEnv, 'https://persony.org/api/chat')
    ).toBe('https://persony.org');
  });

  it('allows localhost in development', () => {
    expect(
      resolveAllowedCorsOrigin('http://localhost:5173', devEnv, 'http://localhost:8787/api/chat')
    ).toBe('http://localhost:5173');
  });

  it('rejects evil origin in development', () => {
    expect(
      resolveAllowedCorsOrigin('https://evil.example', devEnv, 'http://localhost:8787/api/chat')
    ).toBeNull();
  });
});

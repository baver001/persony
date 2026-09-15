import { describe, expect, it } from 'vitest';
import { isAllowedOrigin } from './cors';

describe('isAllowedOrigin', () => {
  it('allows localhost in dev mode', () => {
    expect(isAllowedOrigin('http://localhost:5173', true)).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:8787', true)).toBe(true);
  });

  it('rejects arbitrary origins in production mode', () => {
    expect(isAllowedOrigin('https://evil.example', false)).toBe(false);
    expect(isAllowedOrigin('https://persony.org', false)).toBe(false);
  });

  it('rejects non-localhost origins even in dev mode', () => {
    expect(isAllowedOrigin('https://evil.example', true)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { classifyProviderError, shouldFallbackToNextModel } from './provider-errors';

describe('classifyProviderError', () => {
  it('detects model unavailable', () => {
    expect(classifyProviderError(new Error('Model gemini-x not found'))).toBe('model_unavailable');
  });

  it('detects rate limit', () => {
    expect(classifyProviderError(new Error('429 rate limit exceeded'))).toBe('rate_limit');
  });

  it('detects billing quota', () => {
    expect(classifyProviderError(new Error('quota exceeded for project'))).toBe('billing_quota');
  });

  it('detects invalid request', () => {
    expect(classifyProviderError(new Error('400 bad request invalid argument'))).toBe(
      'invalid_request'
    );
  });

  it('detects user cancellation', () => {
    expect(classifyProviderError(new Error('The operation was aborted'))).toBe('user_cancellation');
  });
});

describe('shouldFallbackToNextModel', () => {
  it('allows fallback for transient errors before streaming', () => {
    expect(shouldFallbackToNextModel('transient_server', false)).toBe(true);
    expect(shouldFallbackToNextModel('model_unavailable', false)).toBe(true);
  });

  it('blocks fallback after partial stream', () => {
    expect(shouldFallbackToNextModel('model_unavailable', true)).toBe(false);
  });

  it('blocks fallback for rate limit and billing', () => {
    expect(shouldFallbackToNextModel('rate_limit', false)).toBe(false);
    expect(shouldFallbackToNextModel('billing_quota', false)).toBe(false);
    expect(shouldFallbackToNextModel('invalid_request', false)).toBe(false);
  });
});

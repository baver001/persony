import { describe, expect, it } from 'vitest';
import { resolveChatRoute } from './model-router';

describe('resolveChatRoute', () => {
  it('defaults to google when only Gemini is configured', async () => {
    const route = await resolveChatRoute({ GEMINI_API_KEY: 'test-key' });
    expect(route.provider).toBe('google');
    expect(route.primary.id).toBe('google');
  });

  it('prefers deepseek when mode is deepseek and key exists', async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({ value_json: JSON.stringify('deepseek') }),
        }),
      }),
    } as unknown as D1Database;

    const route = await resolveChatRoute({
      GEMINI_API_KEY: 'g',
      DEEPSEEK_API_KEY: 'd',
      DB: db,
    });

    expect(route.provider).toBe('deepseek');
    expect(route.fallbacks.some((p) => p.id === 'google')).toBe(true);
  });

  it('falls back to deepseek when google key missing', async () => {
    const route = await resolveChatRoute({
      GEMINI_API_KEY: '',
      DEEPSEEK_API_KEY: 'd',
    });
    expect(route.provider).toBe('deepseek');
  });
});

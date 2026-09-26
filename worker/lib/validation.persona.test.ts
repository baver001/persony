import { describe, expect, it } from 'vitest';
import { createPersonaSchema, MAX_PERSONA_AVATAR_URL_CHARS } from './validation';

describe('createPersonaSchema avatarUrl', () => {
  const base = {
    name: 'Test',
    systemPrompt: 'You are Test.',
    avatarUrl: 'https://example.com/a.jpg',
    voice: 'Puck',
    category: 'custom',
  };

  it('accepts compressed JPEG data URLs used by Avatar Studio', () => {
    const avatarUrl = `data:image/jpeg;base64,${'A'.repeat(24_000)}`;
    expect(avatarUrl.length).toBeLessThan(MAX_PERSONA_AVATAR_URL_CHARS);
    const parsed = createPersonaSchema.safeParse({ ...base, avatarUrl });
    expect(parsed.success).toBe(true);
  });

  it('rejects oversized avatar payloads', () => {
    const avatarUrl = `data:image/jpeg;base64,${'A'.repeat(MAX_PERSONA_AVATAR_URL_CHARS)}`;
    const parsed = createPersonaSchema.safeParse({ ...base, avatarUrl });
    expect(parsed.success).toBe(false);
  });
});

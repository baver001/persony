import { describe, expect, it } from 'vitest';
import { chatRequestSchema, createPersonaSchema, sendMessageSchema } from './validation';

describe('chatRequestSchema', () => {
  it('accepts server-authoritative conversationId + text', () => {
    const parsed = chatRequestSchema.safeParse({
      conversationId: 'conv-1',
      text: 'Hello',
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts legacy personaId + messages', () => {
    const parsed = chatRequestSchema.safeParse({
      personaId: 'athena',
      messages: [{ sender: 'user', text: 'Hi' }],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects empty payloads', () => {
    const parsed = chatRequestSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });
});

describe('createPersonaSchema', () => {
  it('does not require client-side id', () => {
    const parsed = createPersonaSchema.safeParse({
      name: 'Nova',
      systemPrompt: 'Be helpful',
      avatarUrl: 'data:image/svg+xml,...',
      voice: 'Puck',
      category: 'custom',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('sendMessageSchema', () => {
  it('requires non-empty text', () => {
    expect(sendMessageSchema.safeParse({ text: 'Hi' }).success).toBe(true);
    expect(sendMessageSchema.safeParse({ text: '' }).success).toBe(false);
  });
});

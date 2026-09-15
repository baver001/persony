import { describe, expect, it } from 'vitest';
import { PersonaNotFoundError, resolvePersonaForInference } from './persona-service';

describe('resolvePersonaForInference', () => {
  it('resolves built-in seed persona without database', async () => {
    const persona = await resolvePersonaForInference(
      { GEMINI_API_KEY: 'test' },
      'athena',
      null
    );
    expect(persona.id).toBe('athena');
    expect(persona.systemPrompt.length).toBeGreaterThan(20);
  });

  it('throws for unknown persona id', async () => {
    await expect(
      resolvePersonaForInference({ GEMINI_API_KEY: 'test' }, 'unknown-id', null)
    ).rejects.toBeInstanceOf(PersonaNotFoundError);
  });
});

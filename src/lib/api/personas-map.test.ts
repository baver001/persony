import { describe, expect, it } from 'vitest';
import { buildCustomPersonaSpec } from '../../../shared/persona-spec/build-custom-spec';
import { ownerDtoToPersona } from './personas';

describe('persona cloud map', () => {
  it('round-trips configurationJson and behavior profile from owner DTO', () => {
    const configurationJson = JSON.stringify(
      buildCustomPersonaSpec({
        slug: 'test_persona',
        name: 'Test Persona',
        description: 'Helps with planning',
        tagline: 'Planner',
        style: { warmth: 77, humor: 42 },
      })
    );

    const persona = ownerDtoToPersona({
      id: 'p_test',
      name: 'Test Persona',
      tagline: 'Planner',
      description: 'Helps with planning',
      systemPrompt: 'compiled prompt',
      avatarUrl: 'https://example.com/a.png',
      voice: 'Puck',
      category: 'mentor',
      visibility: 'private',
      configurationJson,
    });

    expect(persona.configurationJson).toBe(configurationJson);
    expect(persona.behaviorProfile?.warmth).toBe(77);
    expect(persona.behaviorProfile?.humor).toBe(42);
    expect(persona.isCustom).toBe(true);
  });
});

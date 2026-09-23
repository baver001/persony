import { describe, expect, it } from 'vitest';
import { enrichPersonaCreateInput } from './persona-spec-builder';
import { parsePersonaSpec } from './persona-compiler';

describe('enrichPersonaCreateInput', () => {
  it('builds configurationJson from behaviorProfile when missing', () => {
    const enriched = enrichPersonaCreateInput(
      {
        name: 'Nova',
        tagline: 'Bright companion',
        description: 'Helps you think clearly',
        systemPrompt: 'You are Nova',
        avatarUrl: 'https://example.com/n.png',
        voice: 'Puck',
        category: 'mentor',
        visibility: 'private',
        behaviorProfile: { warmth: 80, humor: 55 },
      },
      { slug: 'nova' }
    );

    expect(enriched.configurationJson).toBeTruthy();
    const spec = parsePersonaSpec(enriched.configurationJson);
    expect(spec?.behavior.profile.warmth).toBe(80);
    expect(spec?.behavior.profile.humor).toBe(55);
    expect(enriched.systemPrompt.length).toBeGreaterThan(20);
  });

  it('preserves explicit configurationJson', () => {
    const configurationJson = JSON.stringify({
      schemaVersion: 1,
      identity: { slug: 'custom_x', isOfficial: false, supportedLocales: ['en'] },
      mission: { summary: 'Test', objectives: ['conversation'] },
      behavior: {
        profile: {
          warmth: 50,
          directness: 50,
          creativity: 50,
          formality: 50,
          verbosity: 50,
          humor: 50,
        },
        styleNotes: [],
      },
      presentation: {
        localized: {
          en: { name: 'X', tagline: 'T', description: 'D', starterMessages: ['Hi'] },
        },
      },
      safety: { platformRules: ['Be helpful'] },
    });

    const enriched = enrichPersonaCreateInput({
      name: 'X',
      tagline: 'T',
      description: 'D',
      systemPrompt: 'raw',
      avatarUrl: 'https://example.com/x.png',
      voice: 'Puck',
      category: 'custom',
      visibility: 'private',
      configurationJson,
    });

    expect(enriched.configurationJson).toBe(configurationJson);
  });
});

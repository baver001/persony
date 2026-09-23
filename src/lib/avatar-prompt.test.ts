import { describe, expect, it } from 'vitest';
import { buildAvatarApiPrompt, buildAvatarVisualDirection } from './avatar-prompt';

describe('avatar-prompt', () => {
  it('uses user direction when provided', () => {
    expect(
      buildAvatarVisualDirection(
        { name: 'Athena', description: 'Thinking partner' },
        'older professor, library light'
      )
    ).toBe('older professor, library light');
  });

  it('builds direction from persona context when prompt empty', () => {
    const direction = buildAvatarVisualDirection({
      name: 'Viktor',
      tagline: 'Software engineer',
      description: 'Pragmatic builder who loves clean systems.',
      category: 'tech',
      behaviorProfile: { warmth: 40, formality: 70, creativity: 50, directness: 80, verbosity: 45, humor: 30 },
    });
    expect(direction).toContain('Software engineer');
    expect(direction).toContain('tech persona');
    expect(direction).toContain('polished professional look');
  });

  it('includes name in API prompt', () => {
    const prompt = buildAvatarApiPrompt(
      { name: 'Sofia', description: 'Reflective companion' },
      'soft evening light'
    );
    expect(prompt).toContain('Character: Sofia.');
    expect(prompt).toContain('soft evening light');
  });
});

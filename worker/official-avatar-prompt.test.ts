import { describe, expect, it } from 'vitest';
import { ATHENA_SPEC_V1 } from '../shared/personas/athena-spec';
import {
  buildOfficialAvatarPrompt,
  OFFICIAL_AVATAR_ART_DIRECTION,
  behaviorProfileToAvatarCues,
} from '../shared/personas/official-avatar-prompt';

describe('official-avatar-prompt', () => {
  it('defines art direction for Athena (pilot persona)', () => {
    expect(OFFICIAL_AVATAR_ART_DIRECTION.athena).toMatch(/thinking partner/i);
  });

  it('maps Athena behavior profile to thumbnail-friendly cues', () => {
    const cues = behaviorProfileToAvatarCues(ATHENA_SPEC_V1.behavior.profile);
    expect(cues).toContain('steady confident gaze');
    expect(cues.some((c) => c.includes('warmth') || c.includes('warm'))).toBe(true);
  });

  it('builds a full prompt with collection rules and small-size hint', () => {
    const prompt = buildOfficialAvatarPrompt({
      name: 'Athena',
      slug: 'athena',
      spec: ATHENA_SPEC_V1,
    });
    expect(prompt).toMatch(/36|thumbnail|scaled down/i);
    expect(prompt).toMatch(/goddess|mythical/i);
    expect(prompt).toMatch(/no watermark/i);
  });
});

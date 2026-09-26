import type { PersonaSpecV1 } from '../persona-spec/types';

/** Shared collection rules — readable at 36–48px circle in sidebar (see docs/OFFICIAL_AVATAR_STYLE.md). */
export const OFFICIAL_AVATAR_COLLECTION_RULES = [
  'Premium fictional AI companion portrait for a dark-mode messenger app.',
  'Single person, head-and-shoulders, face centered and large in frame (about 70% of image height).',
  'Strong facial silhouette, clear eyes with catchlights, simple neutral background (soft gray or charcoal).',
  'Even soft studio lighting, high contrast on eyes and hair, no busy patterns behind the face.',
  'Photorealistic digital portrait, modest clothing, no text, no watermark, no logo, no collage.',
].join(' ');

export type OfficialAvatarPromptInput = {
  name: string;
  slug: string;
  spec: PersonaSpecV1;
  /** Used until a slug has hand-tuned art direction in OFFICIAL_AVATAR_ART_DIRECTION. */
  fallbackArtDirection?: string;
};

/**
 * Per-persona art direction (hand-tuned). Expand one slug at a time before batch generation.
 */
export const OFFICIAL_AVATAR_ART_DIRECTION: Partial<Record<string, string>> = {
  athena: [
    'Fictional woman in her early 30s, calm strategic thinker and thinking partner.',
    'Intelligent warm eyes, composed slight smile, grounded and approachable — not theatrical or mythical.',
    'Neat dark hair with clean silhouette, smart casual dark turtleneck or simple blazer.',
    'Subtle intellectual presence: thoughtful, direct, modern mentor — never goddess, laurel, armor, or fantasy props.',
    'Cool neutral background matching a zinc-gray UI.',
  ].join(' '),
};

type BehaviorProfile = PersonaSpecV1['behavior']['profile'];

export function behaviorProfileToAvatarCues(profile: BehaviorProfile): string[] {
  const cues: string[] = [];
  if (profile.warmth >= 55) cues.push('quiet warmth');
  else if (profile.warmth <= 40) cues.push('cool reserve');
  if (profile.directness >= 65) cues.push('steady confident gaze');
  if (profile.creativity >= 60) cues.push('subtle creative spark in expression');
  if (profile.formality >= 55) cues.push('polished professional look');
  else if (profile.formality <= 45) cues.push('relaxed smart-casual styling');
  if (profile.humor <= 30) cues.push('minimal smile, serious-friendly');
  if (profile.verbosity <= 45) cues.push('composed concise presence');
  return cues;
}

export function buildOfficialAvatarPrompt(input: OfficialAvatarPromptInput): string {
  const art =
    OFFICIAL_AVATAR_ART_DIRECTION[input.slug] ??
    input.fallbackArtDirection ??
    input.spec.mission.summary;
  const cues = behaviorProfileToAvatarCues(input.spec.behavior.profile);
  const avoid = input.spec.behavior.styleNotes
    ?.filter((n) => /avoid|no |never/i.test(n))
    .slice(0, 2)
    .join('; ');

  return [
    OFFICIAL_AVATAR_COLLECTION_RULES,
    `Character: ${input.name}.`,
    art,
    cues.length ? `Mood cues: ${cues.join(', ')}.` : '',
    avoid ? `Avoid: ${avoid}.` : '',
    'Optimized for tiny circular avatar thumbnail — face must stay recognizable when scaled down.',
  ]
    .filter(Boolean)
    .join(' ');
}

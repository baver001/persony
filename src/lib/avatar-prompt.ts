import type { CustomPersonaStyleInput } from '../../shared/persona-spec/build-custom-spec';

export type AvatarPersonaContext = {
  name?: string;
  tagline?: string;
  description?: string;
  category?: string;
  behaviorProfile?: Partial<CustomPersonaStyleInput>;
};

function styleHints(profile?: Partial<CustomPersonaStyleInput>): string[] {
  if (!profile) return [];
  const hints: string[] = [];
  if (profile.warmth !== undefined && profile.warmth >= 65) hints.push('warm expression');
  if (profile.warmth !== undefined && profile.warmth <= 35) hints.push('reserved expression');
  if (profile.creativity !== undefined && profile.creativity >= 65) hints.push('expressive creative energy');
  if (profile.formality !== undefined && profile.formality >= 65) hints.push('polished professional look');
  if (profile.humor !== undefined && profile.humor >= 60) hints.push('subtle playful charm');
  return hints;
}

/** User-facing visual direction only — server adds portrait framing rules. */
export function buildAvatarVisualDirection(
  context: AvatarPersonaContext,
  userDirection?: string
): string {
  const trimmed = userDirection?.trim();
  if (trimmed) return trimmed;

  const parts: string[] = [];
  if (context.tagline?.trim()) parts.push(context.tagline.trim());
  if (context.description?.trim()) {
    const short = context.description.trim().slice(0, 160);
    parts.push(short);
  }
  if (context.category && context.category !== 'custom') {
    parts.push(`${context.category} persona`);
  }
  const hints = styleHints(context.behaviorProfile);
  if (hints.length) parts.push(hints.join(', '));

  return parts.join('. ') || 'friendly AI companion portrait';
}

export function buildAvatarApiPrompt(context: AvatarPersonaContext, userDirection: string): string {
  const direction = buildAvatarVisualDirection(context, userDirection);
  const name = context.name?.trim();
  return [name ? `Character: ${name}.` : '', direction].filter(Boolean).join(' ');
}

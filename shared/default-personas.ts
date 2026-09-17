import type { Persona } from '../src/types';
import { OFFICIAL_PERSONA_ROSTER, localizedPresentation } from './personas/official-roster';

/** @deprecated Use official Persona records from API. Offline fallback only. */
export function officialPersonaToClientPersona(
  official: (typeof OFFICIAL_PERSONA_ROSTER)[number],
  locale: 'en' | 'ru' = 'en'
): Persona {
  const presentation = localizedPresentation(official.spec, locale);
  return {
    id: official.id,
    name: official.name,
    tagline: presentation.tagline,
    description: presentation.description,
    systemPrompt: '',
    avatar: official.avatarUrl,
    voice: official.voice as Persona['voice'],
    category: official.category,
    color: official.color,
    badge: official.badge,
    starterMessages: presentation.starterMessages,
    isOfficial: true,
    sortOrder: official.sortOrder,
    disclosure: presentation.disclosure,
  };
}

export const OFFICIAL_CLIENT_PERSONAS: Persona[] = OFFICIAL_PERSONA_ROSTER.map((p) =>
  officialPersonaToClientPersona(p, 'en')
);

/** Backward-compatible export — full official roster for offline/dev fallback. */
export const DEFAULT_PERSONAS: Persona[] = OFFICIAL_CLIENT_PERSONAS;

export { ATHENA_PERSONA_ID } from './personas/athena-spec';
export const ATHENA_PERSONA = OFFICIAL_CLIENT_PERSONAS[0]!;

/** Legacy IDs kept for import/migration compatibility only. */
export const LEGACY_PERSONAS: Persona[] = [];

import type { Persona } from '../types';
import {
  OFFICIAL_PERSONA_ROSTER,
  localizedPresentation,
} from '../../shared/personas/official-roster';

export function resolvePersonaLocale(language: string): 'en' | 'ru' {
  return language.startsWith('ru') ? 'ru' : 'en';
}

export function getLocalizedPersonaPresentation(
  persona: Persona,
  language: string
): Pick<Persona, 'tagline' | 'description' | 'starterMessages' | 'disclosure'> {
  const locale = resolvePersonaLocale(language);
  const official = OFFICIAL_PERSONA_ROSTER.find((p) => p.id === persona.id);
  if (official) {
    const pack = localizedPresentation(official.spec, locale);
    return {
      tagline: pack.tagline,
      description: pack.description,
      starterMessages: pack.starterMessages,
      disclosure: pack.disclosure,
    };
  }
  return {
    tagline: persona.tagline,
    description: persona.description,
    starterMessages: persona.starterMessages,
    disclosure: persona.disclosure,
  };
}

export function applyLocaleToPersona(persona: Persona, language: string): Persona {
  if (persona.isCustom) return persona;
  const localized = getLocalizedPersonaPresentation(persona, language);
  return { ...persona, ...localized };
}

export function applyLocaleToPersonas(personas: Persona[], language: string): Persona[] {
  return personas.map((persona) => applyLocaleToPersona(persona, language));
}

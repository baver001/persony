import type { CustomPersonaStyleInput } from '../../shared/persona-spec/build-custom-spec';
import type { Persona, VoiceName } from '../types';
import { PRESET_AVATARS } from '../utils/avatarGenerator';

export const DEFAULT_BEHAVIOR_PROFILE: CustomPersonaStyleInput = {
  warmth: 60,
  directness: 55,
  creativity: 50,
  formality: 40,
  verbosity: 45,
  humor: 35,
};

export type PersonaFormState = {
  name: string;
  tagline: string;
  description: string;
  systemPrompt: string;
  voice: VoiceName;
  category: Persona['category'];
  avatar: string;
  starter1: string;
  visibility: 'private' | 'unlisted' | 'public';
  behaviorProfile: CustomPersonaStyleInput;
  aiPrompt: string;
  isAiOpen: boolean;
  generationError: string | null;
};

export function behaviorProfileFromPersona(persona: Persona | null | undefined): CustomPersonaStyleInput {
  if (persona?.behaviorProfile) {
    return { ...DEFAULT_BEHAVIOR_PROFILE, ...persona.behaviorProfile };
  }

  if (persona?.configurationJson) {
    try {
      const spec = JSON.parse(persona.configurationJson) as {
        behavior?: { profile?: Partial<CustomPersonaStyleInput> };
      };
      const profile = spec.behavior?.profile;
      if (profile && typeof profile === 'object') {
        return {
          warmth: profile.warmth ?? DEFAULT_BEHAVIOR_PROFILE.warmth,
          directness: profile.directness ?? DEFAULT_BEHAVIOR_PROFILE.directness,
          creativity: profile.creativity ?? DEFAULT_BEHAVIOR_PROFILE.creativity,
          formality: profile.formality ?? DEFAULT_BEHAVIOR_PROFILE.formality,
          verbosity: profile.verbosity ?? DEFAULT_BEHAVIOR_PROFILE.verbosity,
          humor: profile.humor ?? DEFAULT_BEHAVIOR_PROFILE.humor,
        };
      }
    } catch {
      // ignore invalid JSON
    }
  }

  return { ...DEFAULT_BEHAVIOR_PROFILE };
}

export type ResetPersonaFormOptions = {
  defaultStarter: string;
  defaultGreeting: string;
};

export function resetPersonaForm(
  persona: Persona | null | undefined,
  options: ResetPersonaFormOptions
): PersonaFormState {
  const behaviorProfile = behaviorProfileFromPersona(persona);

  return {
    name: persona?.name ?? '',
    tagline: persona?.tagline ?? '',
    description: persona?.description ?? '',
    systemPrompt: persona?.systemPrompt ?? '',
    voice: persona?.voice ?? 'Aoede',
    category: persona?.category ?? 'custom',
    avatar: persona?.avatar ?? PRESET_AVATARS[0],
    starter1: persona?.starterMessages?.[0] ?? options.defaultStarter,
    visibility: persona?.visibility ?? 'private',
    behaviorProfile,
    aiPrompt: '',
    isAiOpen: false,
    generationError: null,
  };
}

/** Regression helper: no field from A may remain when opening B. */
export function personaFormWouldLeakPrior(
  prior: PersonaFormState,
  nextPersona: Persona,
  nextForm: PersonaFormState
): string[] {
  const leaks: string[] = [];
  const checks: Array<[string, string, string]> = [
    ['name', prior.name, nextForm.name],
    ['tagline', prior.tagline, nextForm.tagline],
    ['description', prior.description, nextForm.description],
    ['systemPrompt', prior.systemPrompt, nextForm.systemPrompt],
    ['avatar', prior.avatar, nextForm.avatar],
    ['starter1', prior.starter1, nextForm.starter1],
  ];

  for (const [field, priorValue, nextValue] of checks) {
    if (
      priorValue &&
      priorValue !== nextValue &&
      nextValue !==
        (nextPersona as unknown as Record<string, string>)[
          field === 'starter1' ? 'starterMessages' : field
        ]
    ) {
      // If next form still equals stale prior while persona differs — leak
      if (field === 'starter1') {
        if (prior.starter1 === nextForm.starter1 && prior.starter1 !== (nextPersona.starterMessages?.[0] ?? '')) {
          leaks.push(field);
        }
      } else if (
        priorValue === nextValue &&
        priorValue !== (nextPersona as unknown as Record<string, string>)[field]
      ) {
        leaks.push(field);
      }
    }
  }

  return leaks;
}

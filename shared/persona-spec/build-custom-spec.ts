import type { BehaviorVector, PersonaSpecV1 } from './types';

export type CustomPersonaStyleInput = Pick<
  BehaviorVector,
  'warmth' | 'directness' | 'creativity' | 'formality' | 'verbosity' | 'humor'
>;

const DEFAULT_STYLE: CustomPersonaStyleInput = {
  warmth: 60,
  directness: 55,
  creativity: 50,
  formality: 40,
  verbosity: 45,
  humor: 35,
};

export function buildCustomPersonaSpec(input: {
  slug: string;
  name: string;
  description: string;
  tagline?: string;
  style?: Partial<CustomPersonaStyleInput>;
  styleNotes?: string[];
  starterMessages?: string[];
  locale?: string;
}): PersonaSpecV1 {
  const locale = input.locale?.startsWith('ru') ? 'ru' : 'en';
  const style = { ...DEFAULT_STYLE, ...input.style };

  return {
    schemaVersion: 1,
    identity: {
      slug: input.slug,
      isOfficial: false,
      supportedLocales: ['en', 'ru'],
    },
    mission: {
      summary: input.description.trim() || input.tagline?.trim() || `Custom persona ${input.name}`,
      objectives: ['conversation', 'companionship', 'practical help'],
    },
    behavior: {
      profile: {
        warmth: style.warmth,
        directness: style.directness,
        initiative: 50,
        creativity: style.creativity,
        skepticism: 40,
        empathy: Math.min(100, style.warmth + 10),
        humor: style.humor,
        formality: style.formality,
        verbosity: style.verbosity,
        challenge_level: 45,
      },
      styleNotes: input.styleNotes?.length
        ? input.styleNotes
        : ['match the user conversation language', 'stay in character without theatrical roleplay'],
    },
    expertise: [{ domain: 'general conversation', level: 'advanced' }],
    capabilities: ['chat', 'voice'],
    knowledgePolicy: {
      allowUserUploads: false,
      citeSources: false,
    },
    memoryPolicy: {
      userMemory: true,
      relationshipMemory: true,
      autoExtract: true,
      sensitivePromptRequired: true,
    },
    contextPolicy: {
      maxRecentMessages: 12,
      includeSummaries: true,
    },
    modelPolicy: {},
    safetyProfile: 'GENERAL',
    presentation: {
      localized: {
        en: {
          tagline: input.tagline,
          description: input.description,
          starterMessages: input.starterMessages,
        },
        ru: {
          tagline: input.tagline,
          description: input.description,
          starterMessages: input.starterMessages,
        },
      },
    },
    provenance: {
      author: 'user',
    },
  };
}

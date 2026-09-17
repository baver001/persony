import { ATHENA_PERSONA_ID, ATHENA_SPEC_V1 } from './athena-spec';
import { VIKTOR_PERSONA_ID, VIKTOR_SPEC_V1 } from './viktor-spec';
import { SOFIA_PERSONA_ID, SOFIA_SPEC_V1 } from './sofia-spec';
import { MARC_NOVA_PERSONA_ID, MARC_NOVA_SPEC_V1 } from './marc-nova-spec';
import { ELSA_PERSONA_ID, ELSA_SPEC_V1 } from './elsa-spec';
import { CHEF_MARCO_PERSONA_ID, CHEF_MARCO_SPEC_V1 } from './chef-marco-spec';
import type { OfficialPersonaDefinition } from './official-types';
import type { PersonaSpecV1 } from '../persona-spec/types';

const AVATARS = {
  athena:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=faces&auto=format&q=80',
  viktor:
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=faces&auto=format&q=80',
  sofia:
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=faces&auto=format&q=80',
  marcNova:
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=faces&auto=format&q=80',
  elsa:
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop&crop=faces&auto=format&q=80',
  chefMarco:
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&h=300&fit=crop&crop=faces&auto=format&q=80',
} as const;

/** Recommended onboarding order */
export const OFFICIAL_PERSONA_ROSTER: OfficialPersonaDefinition[] = [
  {
    id: ATHENA_PERSONA_ID,
    name: 'Athena',
    voice: 'Aoede',
    color: '#71717a',
    avatarUrl: AVATARS.athena,
    category: 'official',
    badge: 'AI Persona',
    sortOrder: 1,
    spec: ATHENA_SPEC_V1,
  },
  {
    id: VIKTOR_PERSONA_ID,
    name: 'Viktor',
    voice: 'Charon',
    color: '#10B981',
    avatarUrl: AVATARS.viktor,
    category: 'official',
    badge: 'AI Persona',
    sortOrder: 2,
    spec: VIKTOR_SPEC_V1,
  },
  {
    id: MARC_NOVA_PERSONA_ID,
    name: 'Marc Nova',
    voice: 'Puck',
    color: '#F59E0B',
    avatarUrl: AVATARS.marcNova,
    category: 'official',
    badge: 'AI Persona',
    sortOrder: 3,
    spec: MARC_NOVA_SPEC_V1,
  },
  {
    id: SOFIA_PERSONA_ID,
    name: 'Sofia',
    voice: 'Zephyr',
    color: '#8B5CF6',
    avatarUrl: AVATARS.sofia,
    category: 'official',
    badge: 'AI Persona',
    sortOrder: 4,
    spec: SOFIA_SPEC_V1,
  },
  {
    id: ELSA_PERSONA_ID,
    name: 'Elsa',
    voice: 'Kore',
    color: '#a1a1aa',
    avatarUrl: AVATARS.elsa,
    category: 'official',
    badge: 'AI Persona',
    sortOrder: 5,
    spec: ELSA_SPEC_V1,
  },
  {
    id: CHEF_MARCO_PERSONA_ID,
    name: 'Chef Marco',
    voice: 'Puck',
    color: '#EF4444',
    avatarUrl: AVATARS.chefMarco,
    category: 'official',
    badge: 'AI Persona',
    sortOrder: 6,
    spec: CHEF_MARCO_SPEC_V1,
  },
];

export const OFFICIAL_PERSONA_IDS = OFFICIAL_PERSONA_ROSTER.map((p) => p.id);

export function getOfficialPersonaById(id: string): OfficialPersonaDefinition | undefined {
  return OFFICIAL_PERSONA_ROSTER.find((p) => p.id === id);
}

export function localizedPresentation(
  spec: PersonaSpecV1,
  locale: 'en' | 'ru' = 'en'
): {
  tagline: string;
  description: string;
  starterMessages: string[];
  disclosure?: string;
} {
  const pack = spec.presentation.localized[locale] ?? spec.presentation.localized.en ?? {};
  return {
    tagline: pack.tagline ?? spec.mission.summary,
    description: pack.description ?? spec.mission.summary,
    starterMessages: pack.starterMessages ?? [],
    disclosure: pack.disclosure,
  };
}

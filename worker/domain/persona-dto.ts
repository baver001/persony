import type { PersonaRecord, PersonaVisibility } from './persona';

export type PersonaPublicDTO = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  avatarUrl: string;
  voice: string;
  category: string;
  visibility: PersonaVisibility;
  badge?: string;
  color?: string;
  starterMessages?: string[];
  ownerUserId?: string;
  isSystem?: boolean;
};

export type PersonaOwnerDTO = PersonaPublicDTO & {
  systemPrompt: string;
  currentVersion: number;
  sourcePersonaId?: string;
};

export function toPersonaPublicDTO(record: PersonaRecord, isSystem = false): PersonaPublicDTO {
  return {
    id: record.id,
    name: record.name,
    tagline: record.tagline,
    description: record.description,
    avatarUrl: record.avatarUrl,
    voice: record.voice,
    category: record.category,
    visibility: record.visibility,
    badge: record.badge,
    color: record.color,
    starterMessages: record.starterMessages,
    isSystem,
  };
}

export function toPersonaOwnerDTO(record: PersonaRecord): PersonaOwnerDTO {
  return {
    ...toPersonaPublicDTO(record, record.ownerUserId === 'system'),
    systemPrompt: record.systemPrompt,
    currentVersion: record.currentVersion,
    sourcePersonaId: record.sourcePersonaId,
  };
}

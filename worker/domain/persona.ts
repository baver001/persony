export type PersonaVisibility = 'private' | 'unlisted' | 'public';

export type PersonaRecord = {
  id: string;
  ownerUserId: string;
  name: string;
  tagline: string;
  description: string;
  avatarUrl: string;
  voice: string;
  category: string;
  visibility: PersonaVisibility;
  currentVersion: number;
  systemPrompt: string;
  badge?: string;
  color?: string;
  starterMessages?: string[];
  sourcePersonaId?: string;
};

/** Public API — never includes systemPrompt or internal config. */
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
};

/** Owner API — includes editable fields but not hidden inference config. */
export type PersonaOwnerDTO = PersonaPublicDTO & {
  ownerUserId: string;
  currentVersion: number;
  systemPrompt: string;
  sourcePersonaId?: string;
};

/** Internal inference record — never sent to clients. */
export type PersonaInferenceRecord = PersonaRecord;

export type CreatePersonaInput = {
  name: string;
  tagline: string;
  description: string;
  systemPrompt: string;
  avatarUrl: string;
  voice: string;
  category: string;
  badge?: string;
  color?: string;
  starterMessages?: string[];
  visibility?: PersonaVisibility;
  sourcePersonaId?: string;
};

export type UpdatePersonaInput = Partial<CreatePersonaInput>;

export function toPersonaPublicDTO(record: PersonaRecord): PersonaPublicDTO {
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
  };
}

export function toPersonaOwnerDTO(record: PersonaRecord): PersonaOwnerDTO {
  return {
    ...toPersonaPublicDTO(record),
    ownerUserId: record.ownerUserId,
    currentVersion: record.currentVersion,
    systemPrompt: record.systemPrompt,
    sourcePersonaId: record.sourcePersonaId,
  };
}

export type PersonaVisibility = 'private' | 'unlisted' | 'public';

/** Mutable persona identity and presentation metadata. */
export type PersonaRecord = {
  id: string;
  ownerUserId: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  avatarUrl: string;
  voice: string;
  category: string;
  visibility: PersonaVisibility;
  status: 'active' | 'deleted';
  currentVersion: number;
  badge?: string;
  color?: string;
  starterMessages?: string[];
  sourcePersonaId?: string;
};

/** Immutable compiled persona version. */
export type PersonaVersionRecord = {
  id: string;
  personaId: string;
  version: number;
  systemPrompt: string;
  configurationJson: string | null;
  createdAt: string;
};

/** Runtime view for inference and owner editing. */
export type PersonaRuntime = PersonaRecord & {
  systemPrompt: string;
  configurationJson: string | null;
  resolvedVersion: number;
};

export type PersonaPublicMeta = {
  id: string;
  slug: string;
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
  disclosure?: string;
  isOfficial?: boolean;
  sortOrder?: number;
};

export function mergePersonaRuntime(
  record: PersonaRecord,
  version: PersonaVersionRecord
): PersonaRuntime {
  return {
    ...record,
    systemPrompt: version.systemPrompt,
    configurationJson: version.configurationJson,
    resolvedVersion: version.version,
  };
}

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

export type UpdatePersonaInput = CreatePersonaInput;

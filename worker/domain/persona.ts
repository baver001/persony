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

export type PersonaPublicMeta = {
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

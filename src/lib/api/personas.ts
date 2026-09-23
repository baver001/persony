import type { Persona } from '../../types';
import { behaviorProfileFromPersona } from '../persona-form';
import { getApiHeaders } from './headers';

type PersonaVisibility = 'private' | 'unlisted' | 'public';

type OwnerPersonaDto = {
  id: string;
  name: string;
  visibility?: PersonaVisibility;
  tagline: string;
  description: string;
  systemPrompt: string;
  avatarUrl: string;
  voice: Persona['voice'];
  category: Persona['category'];
  badge?: string;
  color?: string;
  starterMessages?: string[];
  currentVersion?: number;
  configurationJson?: string | null;
};

type PublicPersonaDto = {
  id: string;
  slug?: string;
  name: string;
  tagline: string;
  description: string;
  avatarUrl: string;
  voice: Persona['voice'];
  category: Persona['category'];
  badge?: string;
  color?: string;
  starterMessages?: string[];
  disclosure?: string;
  isOfficial?: boolean;
  sortOrder?: number;
};

export class PersonasApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'PersonasApiError';
  }
}

export function ownerDtoToPersona(dto: OwnerPersonaDto): Persona {
  const persona: Persona = {
    id: dto.id,
    name: dto.name,
    tagline: dto.tagline,
    description: dto.description,
    systemPrompt: dto.systemPrompt,
    avatar: dto.avatarUrl,
    voice: dto.voice,
    category: dto.category as Persona['category'],
    badge: dto.badge,
    color: dto.color || '#6366f1',
    starterMessages: dto.starterMessages,
    isCustom: true,
    createdAt: Date.now(),
    visibility: dto.visibility,
    configurationJson: dto.configurationJson ?? undefined,
  };
  persona.behaviorProfile = behaviorProfileFromPersona(persona);
  return persona;
}

function publicDtoToPersona(dto: PublicPersonaDto): Persona {
  return {
    id: dto.id,
    name: dto.name,
    tagline: dto.tagline,
    description: dto.description,
    systemPrompt: '',
    avatar: dto.avatarUrl,
    voice: dto.voice,
    category: dto.category,
    badge: dto.badge,
    color: dto.color || '#6366f1',
    starterMessages: dto.starterMessages,
    isOfficial: dto.isOfficial,
    sortOrder: dto.sortOrder,
    disclosure: dto.disclosure,
  };
}

export async function fetchPersonaBySlug(slug: string): Promise<Persona | null> {
  const locale = document.documentElement.lang === 'ru' ? 'ru' : 'en';
  const res = await fetch(`/api/personas/by-slug/${encodeURIComponent(slug)}?locale=${locale}`, {
    headers: await getApiHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new PersonasApiError('Failed to load persona', res.status);
  const data = (await res.json()) as { persona?: PublicPersonaDto };
  return data.persona ? publicDtoToPersona(data.persona) : null;
}

export async function fetchAvailablePersonas(): Promise<Persona[]> {
  const res = await fetch('/api/personas', { headers: await getApiHeaders() });
  if (!res.ok) throw new PersonasApiError('Failed to load gallery', res.status);
  const data = (await res.json()) as { personas?: PublicPersonaDto[] };
  return (data.personas ?? []).map(publicDtoToPersona);
}

export async function installPersona(personaId: string): Promise<void> {
  const res = await fetch(`/api/me/personas/${personaId}/install`, {
    method: 'POST',
    headers: await getApiHeaders(),
  });
  if (!res.ok) {
    throw new PersonasApiError('Failed to install persona', res.status);
  }
}

export async function uninstallPersona(personaId: string): Promise<boolean> {
  const res = await fetch(`/api/me/personas/${personaId}`, {
    method: 'DELETE',
    headers: await getApiHeaders(),
  });
  return res.ok;
}

export async function fetchMyPersonas(): Promise<Persona[]> {
  const res = await fetch('/api/personas/mine', { headers: await getApiHeaders() });
  if (res.status === 401) throw new PersonasApiError('Authentication required', 401);
  if (!res.ok) throw new PersonasApiError('Failed to load your personas', res.status);
  const data = (await res.json()) as { personas?: OwnerPersonaDto[] };
  return (data.personas ?? []).map(ownerDtoToPersona);
}

export async function createPersonaOnCloud(
  persona: Omit<Persona, 'id' | 'isCustom' | 'createdAt'> & { id?: string }
): Promise<Persona | null> {
  const res = await fetch('/api/personas', {
    method: 'POST',
    headers: await getApiHeaders(),
    body: JSON.stringify({
      name: persona.name,
      tagline: persona.tagline,
      description: persona.description,
      systemPrompt: persona.systemPrompt,
      avatarUrl: persona.avatar,
      voice: persona.voice,
      category: persona.category,
      badge: persona.badge,
      color: persona.color,
      starterMessages: persona.starterMessages,
      visibility: persona.visibility || 'private',
      behaviorProfile: persona.behaviorProfile,
      configurationJson: persona.configurationJson,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { persona?: OwnerPersonaDto };
  return data.persona ? ownerDtoToPersona(data.persona) : null;
}

export async function updatePersonaOnCloud(persona: Persona): Promise<Persona | null> {
  const res = await fetch(`/api/personas/${persona.id}`, {
    method: 'PATCH',
    headers: await getApiHeaders(),
    body: JSON.stringify({
      name: persona.name,
      tagline: persona.tagline,
      description: persona.description,
      systemPrompt: persona.systemPrompt,
      avatarUrl: persona.avatar,
      voice: persona.voice,
      category: persona.category,
      badge: persona.badge,
      color: persona.color,
      starterMessages: persona.starterMessages,
      visibility: persona.visibility || 'private',
      behaviorProfile: persona.behaviorProfile,
      configurationJson: persona.configurationJson,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { persona?: OwnerPersonaDto };
  return data.persona ? ownerDtoToPersona(data.persona) : null;
}

export async function deletePersonaOnCloud(personaId: string): Promise<boolean> {
  const res = await fetch(`/api/personas/${personaId}`, {
    method: 'DELETE',
    headers: await getApiHeaders(),
  });
  return res.ok;
}

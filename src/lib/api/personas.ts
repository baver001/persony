import type { Persona } from '../../types';
import { getApiHeaders } from './headers';

type OwnerPersonaDto = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  systemPrompt: string;
  avatarUrl: string;
  voice: Persona['voice'];
  category: Persona['category'];
  badge?: string;
  color?: string;
  starterMessages?: string[];
};

function dtoToPersona(dto: OwnerPersonaDto): Persona {
  return {
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
  };
}

export async function fetchMyPersonas(): Promise<Persona[]> {
  const res = await fetch('/api/personas/mine', { headers: await getApiHeaders() });
  if (!res.ok) return [];
  const data = (await res.json()) as { personas?: OwnerPersonaDto[] };
  return (data.personas ?? []).map(dtoToPersona);
}

export async function createPersonaOnCloud(
  persona: Omit<Persona, 'id' | 'isCustom' | 'createdAt'>
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
      visibility: 'private',
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { persona?: OwnerPersonaDto };
  return data.persona ? dtoToPersona(data.persona) : null;
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
      visibility: 'private',
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { persona?: OwnerPersonaDto };
  return data.persona ? dtoToPersona(data.persona) : null;
}

export async function deletePersonaOnCloud(personaId: string): Promise<boolean> {
  const res = await fetch(`/api/personas/${personaId}`, {
    method: 'DELETE',
    headers: await getApiHeaders(),
  });
  return res.ok;
}

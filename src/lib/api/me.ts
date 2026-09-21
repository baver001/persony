import type { Persona, VoiceName } from '../../types';
import { OFFICIAL_PERSONA_IDS } from '../../../shared/personas/official-roster';
import { getApiHeaders } from './headers';

export async function fetchInstalledPersonas(): Promise<Persona[]> {
  const res = await fetch('/api/me/personas', { headers: await getApiHeaders() });
  if (!res.ok) throw new Error('Failed to load installed personas');
  const data = (await res.json()) as {
    personas: Array<{
      id: string;
      name: string;
      tagline: string;
      description: string;
      avatarUrl: string;
      voice: string;
      category: string;
      badge?: string;
      color?: string;
      starterMessages?: string[];
    }>;
  };
  return data.personas.map((p) => ({
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    avatar: p.avatarUrl,
    voice: p.voice as VoiceName,
    category: p.category as Persona['category'],
    badge: p.badge,
    color: p.color,
    starterMessages: p.starterMessages,
    systemPrompt: '',
    isCustom: p.category === 'custom',
    isOfficial: OFFICIAL_PERSONA_IDS.includes(p.id),
  }));
}

export async function updatePreferredLocale(locale: 'en' | 'ru'): Promise<void> {
  const res = await fetch('/api/me/locale', {
    method: 'PATCH',
    headers: await getApiHeaders(),
    body: JSON.stringify({ preferredLocale: locale }),
  });
  if (!res.ok) throw new Error('Failed to update locale');
}

export type MeProfile = {
  userId: string;
  preferredLocale: string;
  roles: string[];
  isOwner: boolean;
};

export async function fetchMeProfile(): Promise<MeProfile> {
  const res = await fetch('/api/me', { headers: await getApiHeaders() });
  if (!res.ok) throw new Error('AUTH_REQUIRED');
  return res.json() as Promise<MeProfile>;
}

export async function fetchOwnerOverview(): Promise<Record<string, unknown>> {
  const res = await fetch('/api/owner/overview', { headers: await getApiHeaders() });
  if (res.status === 401) throw new Error('AUTH_REQUIRED');
  if (res.status === 403) throw new Error('FORBIDDEN');
  if (!res.ok) throw new Error('INTERNAL_ERROR');
  return res.json();
}

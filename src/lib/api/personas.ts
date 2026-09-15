import type { Persona } from '../../types';
import { getApiHeaders } from './headers';

export async function syncPersonaToCloud(persona: Persona): Promise<boolean> {
  if (!persona.isCustom) return true;

  try {
    const res = await fetch('/api/personas', {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({
        id: persona.id,
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

    return res.ok;
  } catch {
    return false;
  }
}

export async function syncCustomPersonasToCloud(personas: Persona[]): Promise<void> {
  const custom = personas.filter((p) => p.isCustom);
  for (const persona of custom) {
    await syncPersonaToCloud(persona);
  }
}

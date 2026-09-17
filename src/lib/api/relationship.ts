import { getApiHeaders } from './headers';

export type RelationshipProfile = {
  bullets: string[];
  lastInteractionAt: string | null;
};

export async function fetchRelationshipProfile(personaId: string): Promise<RelationshipProfile> {
  const res = await fetch(`/api/me/personas/${personaId}/relationship`, {
    headers: await getApiHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load relationship profile');
  return (await res.json()) as RelationshipProfile;
}

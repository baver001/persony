import { listMemoriesForUser } from '../repositories/memory-repository';
import {
  getPersonaRelationship,
  upsertPersonaRelationshipTouch,
} from '../repositories/persona-relationship-repository';

export async function touchPersonaRelationship(
  db: D1Database,
  userId: string,
  personaId: string
): Promise<void> {
  await upsertPersonaRelationshipTouch(db, userId, personaId, new Date().toISOString());
}

export async function getRelationshipMemoryBullets(
  db: D1Database,
  userId: string,
  personaId: string,
  limit = 6
): Promise<string[]> {
  const memories = await listMemoriesForUser(db, userId, {
    scope: 'relationship',
    personaId,
    status: 'active',
  });
  return memories.slice(0, limit).map((m) => m.content).filter(Boolean);
}

export async function getRelationshipProfileSummary(
  db: D1Database,
  userId: string,
  personaId: string
): Promise<{ bullets: string[]; lastInteractionAt: string | null }> {
  const relationship = await getPersonaRelationship(db, userId, personaId);
  const bullets = await getRelationshipMemoryBullets(db, userId, personaId);
  return {
    bullets,
    lastInteractionAt: relationship?.lastInteractionAt ?? null,
  };
}

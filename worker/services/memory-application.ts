import { insertMemoryCandidate } from '../repositories/memory-candidate-repository';
import {
  findActiveMemoryByKind,
  findDuplicateMemory,
  insertMemory,
  supersedeMemory,
  updateMemoryContent,
  type MemoryRecord,
} from '../repositories/memory-repository';
import type { MemoryExtractionCandidate } from './memory-extractor';

export async function applyMemoryExtractionCandidates(
  db: D1Database,
  userId: string,
  personaId: string,
  conversationId: string,
  userMessageId: string,
  candidates: MemoryExtractionCandidate[],
  options?: { allowSensitiveAutoStore?: boolean }
): Promise<MemoryRecord[]> {
  const stored: MemoryRecord[] = [];

  for (const candidate of candidates) {
    if (candidate.action === 'ignore' || candidate.confidence < 0.55) continue;

    const relationshipPersonaId =
      candidate.scope === 'relationship' ? personaId : undefined;

    if (candidate.sensitivity !== 'normal' && !options?.allowSensitiveAutoStore) {
      await insertMemoryCandidate(db, {
        userId,
        personaId,
        conversationId,
        scope: candidate.scope,
        kind: candidate.kind,
        content: candidate.content,
        sensitivity: candidate.sensitivity,
        confidence: candidate.confidence,
        sourceMessageId: userMessageId,
      });
      continue;
    }

    const duplicate = await findDuplicateMemory(
      db,
      userId,
      candidate.scope,
      candidate.content,
      relationshipPersonaId
    );
    if (duplicate && candidate.action === 'create') continue;

    const memoryInput = {
      userId,
      scope: candidate.scope,
      kind: candidate.kind,
      content: candidate.content,
      personaId: relationshipPersonaId,
      conversationId,
      confidence: candidate.confidence,
      importance: candidate.importance,
      sensitivity: candidate.sensitivity,
      sourceMessageIds: [userMessageId],
    };

    if (candidate.action === 'update' && duplicate) {
      await updateMemoryContent(db, duplicate.id, userId, candidate.content);
      continue;
    }

    if (candidate.action === 'supersede') {
      const existing =
        duplicate ??
        (await findActiveMemoryByKind(
          db,
          userId,
          candidate.scope,
          candidate.kind,
          relationshipPersonaId
        ));
      if (existing) {
        const memory = await supersedeMemory(db, userId, existing.id, memoryInput);
        stored.push(memory);
        continue;
      }
    }

    const memory = await insertMemory(db, memoryInput);
    stored.push(memory);
  }

  return stored;
}

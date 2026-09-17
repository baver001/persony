import { generateId } from '../lib/ids';
import type { MemoryKind, MemoryScope } from './memory-repository';

export type MemoryCandidateStatus = 'pending' | 'accepted' | 'rejected';

export type MemoryCandidateRecord = {
  id: string;
  userId: string;
  personaId?: string;
  conversationId?: string;
  scope: MemoryScope;
  kind: MemoryKind;
  content: string;
  sensitivity: string;
  confidence: number;
  status: MemoryCandidateStatus;
  sourceMessageId?: string;
  createdAt: string;
  resolvedAt?: string;
};

export async function insertMemoryCandidate(
  db: D1Database,
  input: Omit<MemoryCandidateRecord, 'id' | 'createdAt' | 'status' | 'resolvedAt'> & {
    status?: MemoryCandidateStatus;
  }
): Promise<MemoryCandidateRecord> {
  const id = generateId();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO memory_candidates (
        id, user_id, persona_id, conversation_id, scope, kind, content,
        sensitivity, confidence, status, source_message_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.userId,
      input.personaId ?? null,
      input.conversationId ?? null,
      input.scope,
      input.kind,
      input.content,
      input.sensitivity,
      input.confidence,
      input.status ?? 'pending',
      input.sourceMessageId ?? null,
      now
    )
    .run();

  return {
    id,
    userId: input.userId,
    personaId: input.personaId,
    conversationId: input.conversationId,
    scope: input.scope,
    kind: input.kind,
    content: input.content,
    sensitivity: input.sensitivity,
    confidence: input.confidence,
    status: input.status ?? 'pending',
    sourceMessageId: input.sourceMessageId,
    createdAt: now,
  };
}

export async function listPendingMemoryCandidates(
  db: D1Database,
  userId: string
): Promise<MemoryCandidateRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM memory_candidates WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC`
    )
    .bind(userId)
    .all<{
      id: string;
      user_id: string;
      persona_id: string | null;
      conversation_id: string | null;
      scope: MemoryScope;
      kind: MemoryKind;
      content: string;
      sensitivity: string;
      confidence: number;
      status: MemoryCandidateStatus;
      source_message_id: string | null;
      created_at: string;
      resolved_at: string | null;
    }>();

  return (results ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    personaId: r.persona_id ?? undefined,
    conversationId: r.conversation_id ?? undefined,
    scope: r.scope,
    kind: r.kind,
    content: r.content,
    sensitivity: r.sensitivity,
    confidence: r.confidence,
    status: r.status,
    sourceMessageId: r.source_message_id ?? undefined,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at ?? undefined,
  }));
}

export async function resolveMemoryCandidate(
  db: D1Database,
  userId: string,
  candidateId: string,
  status: 'accepted' | 'rejected'
): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `UPDATE memory_candidates SET status = ?, resolved_at = ?
       WHERE id = ? AND user_id = ? AND status = 'pending'`
    )
    .bind(status, now, candidateId, userId)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

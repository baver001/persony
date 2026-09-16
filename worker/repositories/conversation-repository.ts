import { generateId } from '../lib/ids';

export type ConversationStatus = 'active' | 'deleted';

export type ConversationRecord = {
  id: string;
  ownerUserId: string;
  type: 'direct' | 'room';
  title: string | null;
  personaId: string | null;
  personaVersion: number | null;
  status: ConversationStatus;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
};

type ConversationRow = {
  id: string;
  owner_user_id: string;
  type: string;
  title: string | null;
  status?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
};

const ACTIVE_CONVERSATION_FILTER = `c.status = 'active'`;

function mapConversationRow(
  r: ConversationRow & { persona_id: string | null; persona_version: number | null }
): ConversationRecord {
  return {
    id: r.id,
    ownerUserId: r.owner_user_id,
    type: r.type as ConversationRecord['type'],
    title: r.title,
    personaId: r.persona_id,
    personaVersion: r.persona_version,
    status: (r.status as ConversationStatus) || 'active',
    deletedAt: r.deleted_at || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    lastMessageAt: r.last_message_at,
  };
}

export async function listConversationsForUser(
  db: D1Database,
  userId: string
): Promise<ConversationRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT c.*, cp.persona_id, cp.persona_version
       FROM conversations c
       LEFT JOIN conversation_personas cp ON cp.conversation_id = c.id
       WHERE c.owner_user_id = ? AND c.type = 'direct' AND ${ACTIVE_CONVERSATION_FILTER}
       ORDER BY COALESCE(c.last_message_at, c.updated_at) DESC`
    )
    .bind(userId)
    .all<ConversationRow & { persona_id: string | null; persona_version: number | null }>();

  return (results ?? []).map(mapConversationRow);
}

export async function getConversationForUser(
  db: D1Database,
  conversationId: string,
  userId: string
): Promise<ConversationRecord | null> {
  const row = await db
    .prepare(
      `SELECT c.*, cp.persona_id, cp.persona_version
       FROM conversations c
       LEFT JOIN conversation_personas cp ON cp.conversation_id = c.id
       WHERE c.id = ? AND c.owner_user_id = ? AND ${ACTIVE_CONVERSATION_FILTER}`
    )
    .bind(conversationId, userId)
    .first<ConversationRow & { persona_id: string | null; persona_version: number | null }>();

  if (!row) return null;

  return mapConversationRow(row);
}

export async function findDirectConversationByPersona(
  db: D1Database,
  userId: string,
  personaId: string
): Promise<ConversationRecord | null> {
  const row = await db
    .prepare(
      `SELECT c.*, cp.persona_id, cp.persona_version
       FROM conversations c
       JOIN conversation_personas cp ON cp.conversation_id = c.id
       WHERE c.owner_user_id = ? AND c.type = 'direct' AND cp.persona_id = ? AND ${ACTIVE_CONVERSATION_FILTER}
       ORDER BY c.updated_at DESC
       LIMIT 1`
    )
    .bind(userId, personaId)
    .first<ConversationRow & { persona_id: string; persona_version: number }>();

  if (!row) return null;

  return mapConversationRow(row);
}

export async function createDirectConversation(
  db: D1Database,
  userId: string,
  personaId: string,
  personaVersion: number,
  title?: string
): Promise<ConversationRecord> {
  const existing = await findDirectConversationByPersona(db, userId, personaId);
  if (existing) return existing;

  const id = generateId();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO conversations (id, owner_user_id, type, title, status, deleted_at, created_at, updated_at, last_message_at)
       VALUES (?, ?, 'direct', ?, 'active', NULL, ?, ?, NULL)`
    )
    .bind(id, userId, title || null, now, now)
    .run();

  await db
    .prepare(
      `INSERT INTO conversation_personas (conversation_id, persona_id, persona_version, role, added_at)
       VALUES (?, ?, ?, 'participant', ?)`
    )
    .bind(id, personaId, personaVersion, now)
    .run();

  return {
    id,
    ownerUserId: userId,
    type: 'direct',
    title: title || null,
    personaId,
    personaVersion,
    status: 'active',
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: null,
  };
}

export async function touchConversation(db: D1Database, conversationId: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(`UPDATE conversations SET updated_at = ?, last_message_at = ? WHERE id = ?`)
    .bind(now, now, conversationId)
    .run();
}

export async function softDeleteConversation(
  db: D1Database,
  conversationId: string,
  userId: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `UPDATE conversations
       SET status = 'deleted', deleted_at = ?, updated_at = ?
       WHERE id = ? AND owner_user_id = ? AND status = 'active'`
    )
    .bind(now, now, conversationId, userId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

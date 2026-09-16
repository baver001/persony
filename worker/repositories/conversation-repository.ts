import { generateId } from '../lib/ids';

export type ConversationRecord = {
  id: string;
  ownerUserId: string;
  type: 'direct' | 'room';
  title: string | null;
  personaId: string | null;
  personaVersion: number | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
};

type ConversationRow = {
  id: string;
  owner_user_id: string;
  type: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
};

export async function listConversationsForUser(
  db: D1Database,
  userId: string
): Promise<ConversationRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT c.*, cp.persona_id, cp.persona_version
       FROM conversations c
       LEFT JOIN conversation_personas cp ON cp.conversation_id = c.id
       WHERE c.owner_user_id = ? AND c.type = 'direct'
       ORDER BY COALESCE(c.last_message_at, c.updated_at) DESC`
    )
    .bind(userId)
    .all<ConversationRow & { persona_id: string | null; persona_version: number | null }>();

  return (results ?? []).map((r) => ({
    id: r.id,
    ownerUserId: r.owner_user_id,
    type: r.type as ConversationRecord['type'],
    title: r.title,
    personaId: r.persona_id,
    personaVersion: r.persona_version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    lastMessageAt: r.last_message_at,
  }));
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
       WHERE c.id = ? AND c.owner_user_id = ?`
    )
    .bind(conversationId, userId)
    .first<ConversationRow & { persona_id: string | null; persona_version: number | null }>();

  if (!row) return null;

  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    type: row.type as ConversationRecord['type'],
    title: row.title,
    personaId: row.persona_id,
    personaVersion: row.persona_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
  };
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
       WHERE c.owner_user_id = ? AND c.type = 'direct' AND cp.persona_id = ?
       ORDER BY c.updated_at DESC
       LIMIT 1`
    )
    .bind(userId, personaId)
    .first<ConversationRow & { persona_id: string; persona_version: number }>();

  if (!row) return null;

  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    type: 'direct',
    title: row.title,
    personaId: row.persona_id,
    personaVersion: row.persona_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
  };
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
      `INSERT INTO conversations (id, owner_user_id, type, title, created_at, updated_at, last_message_at)
       VALUES (?, ?, 'direct', ?, ?, ?, NULL)`
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
  const result = await db
    .prepare(`DELETE FROM conversations WHERE id = ? AND owner_user_id = ?`)
    .bind(conversationId, userId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

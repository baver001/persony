import type { ConversationRecord } from '../domain/conversation';

type ConversationRow = {
  id: string;
  owner_user_id: string;
  type: string;
  title: string | null;
  persona_id: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
};

function rowToRecord(row: ConversationRow): ConversationRecord {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    type: row.type as ConversationRecord['type'],
    title: row.title,
    personaId: row.persona_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
  };
}

export async function createConversation(
  db: D1Database,
  ownerUserId: string,
  personaId: string,
  personaVersion: number
): Promise<ConversationRecord> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO conversations (id, owner_user_id, type, title, persona_id, created_at, updated_at, last_message_at)
       VALUES (?, ?, 'direct', NULL, ?, ?, ?, NULL)`
    )
    .bind(id, ownerUserId, personaId, now, now)
    .run();

  await db
    .prepare(
      `INSERT INTO conversation_personas (conversation_id, persona_id, persona_version, role, added_at)
       VALUES (?, ?, ?, 'participant', ?)`
    )
    .bind(id, personaId, personaVersion, now)
    .run();

  const record = await getConversationById(db, id, ownerUserId);
  if (!record) throw new Error('Failed to create conversation');
  return record;
}

export async function getConversationById(
  db: D1Database,
  conversationId: string,
  ownerUserId: string
): Promise<ConversationRecord | null> {
  const row = await db
    .prepare(
      `SELECT id, owner_user_id, type, title, persona_id, created_at, updated_at, last_message_at
       FROM conversations
       WHERE id = ? AND owner_user_id = ?`
    )
    .bind(conversationId, ownerUserId)
    .first<ConversationRow>();

  return row ? rowToRecord(row) : null;
}

export async function findDirectConversationByPersona(
  db: D1Database,
  ownerUserId: string,
  personaId: string
): Promise<ConversationRecord | null> {
  const row = await db
    .prepare(
      `SELECT id, owner_user_id, type, title, persona_id, created_at, updated_at, last_message_at
       FROM conversations
       WHERE owner_user_id = ? AND persona_id = ? AND type = 'direct'
       ORDER BY updated_at DESC
       LIMIT 1`
    )
    .bind(ownerUserId, personaId)
    .first<ConversationRow>();

  return row ? rowToRecord(row) : null;
}

export async function listConversations(
  db: D1Database,
  ownerUserId: string,
  limit = 50
): Promise<ConversationRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT id, owner_user_id, type, title, persona_id, created_at, updated_at, last_message_at
       FROM conversations
       WHERE owner_user_id = ?
       ORDER BY COALESCE(last_message_at, updated_at) DESC
       LIMIT ?`
    )
    .bind(ownerUserId, limit)
    .all<ConversationRow>();

  return (results ?? []).map(rowToRecord);
}

export async function deleteConversation(
  db: D1Database,
  conversationId: string,
  ownerUserId: string
): Promise<boolean> {
  const existing = await getConversationById(db, conversationId, ownerUserId);
  if (!existing) return false;

  await db.prepare('DELETE FROM messages WHERE conversation_id = ?').bind(conversationId).run();
  await db
    .prepare('DELETE FROM conversation_personas WHERE conversation_id = ?')
    .bind(conversationId)
    .run();
  await db
    .prepare('DELETE FROM conversations WHERE id = ? AND owner_user_id = ?')
    .bind(conversationId, ownerUserId)
    .run();

  return true;
}

export async function touchConversation(db: D1Database, conversationId: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE conversations SET updated_at = ?, last_message_at = ? WHERE id = ?`
    )
    .bind(now, now, conversationId)
    .run();
}

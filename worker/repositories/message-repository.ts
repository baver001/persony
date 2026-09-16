import { generateId } from '../lib/ids';

export type MessageRecord = {
  id: string;
  conversationId: string;
  senderType: 'user' | 'persona';
  senderUserId: string | null;
  senderPersonaId: string | null;
  text: string;
  createdAt: string;
  idempotencyKey: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_user_id: string | null;
  sender_persona_id: string | null;
  text: string;
  created_at: string;
  idempotency_key: string | null;
};

function rowToMessage(row: MessageRow): MessageRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderType: row.sender_type as MessageRecord['senderType'],
    senderUserId: row.sender_user_id,
    senderPersonaId: row.sender_persona_id,
    text: row.text,
    createdAt: row.created_at,
    idempotencyKey: row.idempotency_key,
  };
}

export async function findMessageByIdempotencyKey(
  db: D1Database,
  conversationId: string,
  idempotencyKey: string
): Promise<MessageRecord | null> {
  const row = await db
    .prepare(
      `SELECT * FROM messages WHERE conversation_id = ? AND idempotency_key = ? LIMIT 1`
    )
    .bind(conversationId, idempotencyKey)
    .first<MessageRow>();

  return row ? rowToMessage(row) : null;
}

export async function insertUserMessage(
  db: D1Database,
  conversationId: string,
  userId: string,
  text: string,
  idempotencyKey?: string
): Promise<MessageRecord> {
  if (idempotencyKey) {
    const existing = await findMessageByIdempotencyKey(db, conversationId, idempotencyKey);
    if (existing) return existing;
  }

  const id = generateId();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO messages (
        id, conversation_id, sender_type, sender_user_id, sender_persona_id, text, created_at, idempotency_key
      ) VALUES (?, ?, 'user', ?, NULL, ?, ?, ?)`
    )
    .bind(id, conversationId, userId, text, now, idempotencyKey || null)
    .run();

  return {
    id,
    conversationId,
    senderType: 'user',
    senderUserId: userId,
    senderPersonaId: null,
    text,
    createdAt: now,
    idempotencyKey: idempotencyKey || null,
  };
}

export async function insertPersonaMessage(
  db: D1Database,
  conversationId: string,
  personaId: string,
  text: string,
  idempotencyKey?: string
): Promise<MessageRecord> {
  if (idempotencyKey) {
    const existing = await findMessageByIdempotencyKey(db, conversationId, idempotencyKey);
    if (existing) return existing;
  }

  const id = generateId();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO messages (
        id, conversation_id, sender_type, sender_user_id, sender_persona_id, text, created_at, idempotency_key
      ) VALUES (?, ?, 'persona', NULL, ?, ?, ?, ?)`
    )
    .bind(id, conversationId, personaId, text, now, idempotencyKey || null)
    .run();

  return {
    id,
    conversationId,
    senderType: 'persona',
    senderUserId: null,
    senderPersonaId: personaId,
    text,
    createdAt: now,
    idempotencyKey: idempotencyKey || null,
  };
}

export async function getMessageById(
  db: D1Database,
  messageId: string
): Promise<MessageRecord | null> {
  const row = await db
    .prepare(`SELECT * FROM messages WHERE id = ? LIMIT 1`)
    .bind(messageId)
    .first<MessageRow>();

  return row ? rowToMessage(row) : null;
}

export async function listMessages(
  db: D1Database,
  conversationId: string,
  limit = 50,
  before?: string
): Promise<MessageRecord[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  let query = `SELECT * FROM messages WHERE conversation_id = ?`;
  const binds: (string | number)[] = [conversationId];

  if (before) {
    query += ` AND created_at < (SELECT created_at FROM messages WHERE id = ?)`;
    binds.push(before);
  }

  query += ` ORDER BY created_at DESC LIMIT ?`;
  binds.push(safeLimit);

  const { results } = await db.prepare(query).bind(...binds).all<MessageRow>();
  const messages = (results ?? []).map(rowToMessage);
  return messages.reverse();
}

export async function getRecentMessagesForContext(
  db: D1Database,
  conversationId: string,
  limit = 10
): Promise<Array<{ sender: string; text: string }>> {
  const messages = await listMessages(db, conversationId, limit);
  return messages.map((m) => ({
    sender: m.senderType === 'user' ? 'user' : 'character',
    text: m.text,
  }));
}

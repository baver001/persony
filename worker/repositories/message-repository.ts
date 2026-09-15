import type { MessageRecord } from '../domain/conversation';

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_user_id: string | null;
  sender_persona_id: string | null;
  text: string;
  created_at: string;
};

function rowToRecord(row: MessageRow): MessageRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderType: row.sender_type as MessageRecord['senderType'],
    senderUserId: row.sender_user_id,
    senderPersonaId: row.sender_persona_id,
    text: row.text,
    createdAt: row.created_at,
  };
}

export async function createMessage(
  db: D1Database,
  input: {
    id?: string;
    conversationId: string;
    senderType: MessageRecord['senderType'];
    senderUserId?: string | null;
    senderPersonaId?: string | null;
    text: string;
  }
): Promise<MessageRecord> {
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO messages (
        id, conversation_id, sender_type, sender_user_id, sender_persona_id, text, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.conversationId,
      input.senderType,
      input.senderUserId ?? null,
      input.senderPersonaId ?? null,
      input.text,
      now
    )
    .run();

  return {
    id,
    conversationId: input.conversationId,
    senderType: input.senderType,
    senderUserId: input.senderUserId ?? null,
    senderPersonaId: input.senderPersonaId ?? null,
    text: input.text,
    createdAt: now,
  };
}

export async function listMessages(
  db: D1Database,
  conversationId: string,
  limit = 50,
  before?: string
): Promise<MessageRecord[]> {
  let query = `SELECT id, conversation_id, sender_type, sender_user_id, sender_persona_id, text, created_at
               FROM messages
               WHERE conversation_id = ?`;
  const binds: (string | number)[] = [conversationId];

  if (before) {
    query += ` AND created_at < (SELECT created_at FROM messages WHERE id = ?)`;
    binds.push(before);
  }

  query += ` ORDER BY created_at DESC LIMIT ?`;
  binds.push(limit);

  const stmt = db.prepare(query);
  const { results } = await stmt.bind(...binds).all<MessageRow>();

  const records = (results ?? []).map(rowToRecord);
  return records.reverse();
}

export async function getRecentMessagesForInference(
  db: D1Database,
  conversationId: string,
  limit = 20
): Promise<MessageRecord[]> {
  return listMessages(db, conversationId, limit);
}

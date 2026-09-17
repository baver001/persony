import { generateId } from '../lib/ids';

export async function upsertMessageFeedback(
  db: D1Database,
  input: {
    userId: string;
    messageId: string;
    conversationId: string;
    feedback: 'up' | 'down';
  }
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO message_feedback (id, user_id, message_id, conversation_id, feedback, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, message_id) DO UPDATE SET feedback = excluded.feedback, created_at = excluded.created_at`
    )
    .bind(
      generateId(),
      input.userId,
      input.messageId,
      input.conversationId,
      input.feedback,
      now
    )
    .run();
}

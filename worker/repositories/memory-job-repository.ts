import { generateId } from '../lib/ids';

export type MemoryJobStatus = 'pending' | 'completed' | 'failed';

export async function createMemoryJob(
  db: D1Database,
  input: {
    userId: string;
    conversationId: string;
    userMessageId: string;
    personaId: string;
  }
): Promise<string> {
  const id = generateId();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO memory_jobs (
        id, user_id, conversation_id, user_message_id, persona_id,
        status, error_code, created_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?, NULL)`
    )
    .bind(
      id,
      input.userId,
      input.conversationId,
      input.userMessageId,
      input.personaId,
      now
    )
    .run();
  return id;
}

export async function markMemoryJobCompleted(db: D1Database, jobId: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE memory_jobs SET status = 'completed', completed_at = ?, error_code = NULL WHERE id = ?`
    )
    .bind(now, jobId)
    .run();
}

export async function markMemoryJobFailed(
  db: D1Database,
  jobId: string,
  errorCode: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE memory_jobs SET status = 'failed', completed_at = ?, error_code = ? WHERE id = ?`
    )
    .bind(now, errorCode.slice(0, 500), jobId)
    .run();
}

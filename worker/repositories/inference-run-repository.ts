import { generateId } from '../lib/ids';

export type InferenceRunStatus = 'pending' | 'streaming' | 'completed' | 'failed';

export type InferenceRunRecord = {
  id: string;
  userId: string;
  conversationId: string;
  clientRequestId: string;
  userMessageId: string | null;
  personaMessageId: string | null;
  personaId: string;
  personaVersion: number;
  status: InferenceRunStatus;
  provider: string | null;
  model: string | null;
  startedAt: string;
  completedAt: string | null;
  errorCode: string | null;
};

type InferenceRunRow = {
  id: string;
  user_id: string;
  conversation_id: string;
  client_request_id: string;
  user_message_id: string | null;
  persona_message_id: string | null;
  persona_id: string;
  persona_version: number;
  status: string;
  provider: string | null;
  model: string | null;
  started_at: string;
  completed_at: string | null;
  error_code: string | null;
};

function rowToRecord(row: InferenceRunRow): InferenceRunRecord {
  return {
    id: row.id,
    userId: row.user_id,
    conversationId: row.conversation_id,
    clientRequestId: row.client_request_id,
    userMessageId: row.user_message_id,
    personaMessageId: row.persona_message_id,
    personaId: row.persona_id,
    personaVersion: row.persona_version,
    status: row.status as InferenceRunStatus,
    provider: row.provider,
    model: row.model,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorCode: row.error_code,
  };
}

export async function findInferenceRunByClientRequest(
  db: D1Database,
  conversationId: string,
  clientRequestId: string
): Promise<InferenceRunRecord | null> {
  const row = await db
    .prepare(
      `SELECT * FROM inference_runs
       WHERE conversation_id = ? AND client_request_id = ?
       LIMIT 1`
    )
    .bind(conversationId, clientRequestId)
    .first<InferenceRunRow>();

  return row ? rowToRecord(row) : null;
}

export async function createInferenceRun(
  db: D1Database,
  input: {
    userId: string;
    conversationId: string;
    clientRequestId: string;
    personaId: string;
    personaVersion: number;
    provider?: string;
    model?: string;
  }
): Promise<InferenceRunRecord> {
  const existing = await findInferenceRunByClientRequest(
    db,
    input.conversationId,
    input.clientRequestId
  );
  if (existing) return existing;

  const id = generateId();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO inference_runs (
        id, user_id, conversation_id, client_request_id,
        user_message_id, persona_message_id, persona_id, persona_version,
        status, provider, model, started_at, completed_at, error_code
      ) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, 'pending', ?, ?, ?, NULL, NULL)`
    )
    .bind(
      id,
      input.userId,
      input.conversationId,
      input.clientRequestId,
      input.personaId,
      input.personaVersion,
      input.provider || null,
      input.model || null,
      now
    )
    .run();

  return {
    id,
    userId: input.userId,
    conversationId: input.conversationId,
    clientRequestId: input.clientRequestId,
    userMessageId: null,
    personaMessageId: null,
    personaId: input.personaId,
    personaVersion: input.personaVersion,
    status: 'pending',
    provider: input.provider || null,
    model: input.model || null,
    startedAt: now,
    completedAt: null,
    errorCode: null,
  };
}

export async function markInferenceRunStreaming(
  db: D1Database,
  runId: string,
  userMessageId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE inference_runs
       SET status = 'streaming', user_message_id = ?
       WHERE id = ?`
    )
    .bind(userMessageId, runId)
    .run();
}

export async function markInferenceRunCompleted(
  db: D1Database,
  runId: string,
  personaMessageId: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE inference_runs
       SET status = 'completed', persona_message_id = ?, completed_at = ?, error_code = NULL
       WHERE id = ?`
    )
    .bind(personaMessageId, now, runId)
    .run();
}

export async function markInferenceRunFailed(
  db: D1Database,
  runId: string,
  errorCode: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE inference_runs
       SET status = 'failed', completed_at = ?, error_code = ?
       WHERE id = ?`
    )
    .bind(now, errorCode.slice(0, 500), runId)
    .run();
}

export async function resetInferenceRunForRetry(
  db: D1Database,
  runId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE inference_runs
       SET status = 'pending', persona_message_id = NULL, completed_at = NULL, error_code = NULL
       WHERE id = ? AND status = 'failed'`
    )
    .bind(runId)
    .run();
}

import type { CostConfidence } from '../billing/cost-confidence';
import { isKnownCostConfidence } from '../billing/cost-confidence';
import { generateId } from '../lib/ids';

export type InferenceListFilters = {
  since?: string;
  until?: string;
  operation?: string;
  provider?: string;
  model?: string;
  status?: string;
  costConfidence?: CostConfidence;
  userId?: string;
  personaId?: string;
  fallback?: 'yes' | 'no';
  limit?: number;
  offset?: number;
};

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
  operationType: string;
  requestedProvider: string | null;
  requestedModel: string | null;
  actualProvider: string | null;
  actualModel: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedInputTokens: number | null;
  usageEstimated: boolean;
  providerCostMicrousd: number | null;
  costConfidence: CostConfidence;
  pricingVersion: string | null;
  pricingEntryId: string | null;
  costCalculatedAt: string | null;
  costBreakdownJson: string | null;
  energyReserved: number;
  energyCharged: number;
  latencyMs: number | null;
  fallbackCount: number;
  fallbackReason: string | null;
  providerRequestId: string | null;
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
  operation_type?: string | null;
  requested_provider?: string | null;
  requested_model?: string | null;
  actual_provider?: string | null;
  actual_model?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cached_input_tokens?: number | null;
  usage_estimated?: number | null;
  provider_cost_microusd?: number | null;
  cost_confidence?: string | null;
  pricing_version?: string | null;
  pricing_entry_id?: string | null;
  cost_calculated_at?: string | null;
  cost_breakdown_json?: string | null;
  energy_reserved?: number | null;
  energy_charged?: number | null;
  latency_ms?: number | null;
  fallback_count?: number | null;
  fallback_reason?: string | null;
  provider_request_id?: string | null;
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
    operationType: row.operation_type ?? 'text_chat',
    requestedProvider: row.requested_provider ?? row.provider,
    requestedModel: row.requested_model ?? row.model,
    actualProvider: row.actual_provider ?? row.provider,
    actualModel: row.actual_model ?? row.model,
    inputTokens: row.input_tokens ?? null,
    outputTokens: row.output_tokens ?? null,
    cachedInputTokens: row.cached_input_tokens ?? null,
    usageEstimated: Boolean(row.usage_estimated),
    costConfidence: (row.cost_confidence as CostConfidence) ?? 'unpriced',
    providerCostMicrousd: isKnownCostConfidence(
      (row.cost_confidence as CostConfidence) ?? 'unpriced'
    )
      ? row.provider_cost_microusd ?? 0
      : null,
    pricingVersion: row.pricing_version ?? null,
    pricingEntryId: row.pricing_entry_id ?? null,
    costCalculatedAt: row.cost_calculated_at ?? null,
    costBreakdownJson: row.cost_breakdown_json ?? null,
    energyReserved: row.energy_reserved ?? 0,
    energyCharged: row.energy_charged ?? 0,
    latencyMs: row.latency_ms ?? null,
    fallbackCount: row.fallback_count ?? 0,
    fallbackReason: row.fallback_reason ?? null,
    providerRequestId: row.provider_request_id ?? null,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorCode: row.error_code,
  };
}

export async function findInferenceRunById(
  db: D1Database,
  runId: string
): Promise<InferenceRunRecord | null> {
  const row = await db
    .prepare(`SELECT * FROM inference_runs WHERE id = ? LIMIT 1`)
    .bind(runId)
    .first<InferenceRunRow>();
  return row ? rowToRecord(row) : null;
}

function buildListWhere(filters: InferenceListFilters): { sql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.since) {
    clauses.push('started_at >= ?');
    params.push(filters.since);
  }
  if (filters.until) {
    clauses.push('started_at <= ?');
    params.push(filters.until);
  }
  if (filters.operation) {
    clauses.push('operation_type = ?');
    params.push(filters.operation);
  }
  if (filters.provider) {
    clauses.push('COALESCE(actual_provider, provider) = ?');
    params.push(filters.provider);
  }
  if (filters.model) {
    clauses.push('COALESCE(actual_model, model) = ?');
    params.push(filters.model);
  }
  if (filters.status) {
    clauses.push('status = ?');
    params.push(filters.status);
  }
  if (filters.costConfidence) {
    clauses.push('cost_confidence = ?');
    params.push(filters.costConfidence);
  }
  if (filters.userId) {
    clauses.push('user_id = ?');
    params.push(filters.userId);
  }
  if (filters.personaId) {
    clauses.push('persona_id = ?');
    params.push(filters.personaId);
  }
  if (filters.fallback === 'yes') {
    clauses.push('fallback_count > 0');
  } else if (filters.fallback === 'no') {
    clauses.push('fallback_count = 0');
  }

  const sql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { sql, params };
}

export async function listInferenceRuns(
  db: D1Database,
  filters: InferenceListFilters
): Promise<{ rows: InferenceRunRecord[]; total: number }> {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);
  const { sql, params } = buildListWhere(filters);

  const countRow = await db
    .prepare(`SELECT COUNT(*) as count FROM inference_runs ${sql}`)
    .bind(...params)
    .first<{ count: number }>();

  const { results } = await db
    .prepare(
      `SELECT * FROM inference_runs ${sql} ORDER BY started_at DESC LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all<InferenceRunRow>();

  return {
    rows: (results ?? []).map(rowToRecord),
    total: countRow?.count ?? 0,
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
    operationType: 'text_chat',
    requestedProvider: input.provider || null,
    requestedModel: input.model || null,
    actualProvider: null,
    actualModel: null,
    inputTokens: null,
    outputTokens: null,
    cachedInputTokens: null,
    usageEstimated: false,
    providerCostMicrousd: null,
    costConfidence: 'unpriced',
    pricingVersion: null,
    pricingEntryId: null,
    costCalculatedAt: null,
    costBreakdownJson: null,
    energyReserved: 0,
    energyCharged: 0,
    latencyMs: null,
    fallbackCount: 0,
    fallbackReason: null,
    providerRequestId: null,
    startedAt: now,
    completedAt: null,
    errorCode: null,
  };
}

export async function updateInferenceRunEconomics(
  db: D1Database,
  runId: string,
  input: {
    requestedProvider?: string;
    requestedModel?: string;
    actualProvider?: string;
    actualModel?: string;
    inputTokens?: number;
    outputTokens?: number;
    cachedInputTokens?: number;
    usageEstimated?: boolean;
    providerCostMicrousd?: number | null;
    costConfidence?: CostConfidence;
    pricingVersion?: string;
    pricingEntryId?: string | null;
    costCalculatedAt?: string;
    costBreakdownJson?: string | null;
    energyReserved?: number;
    energyCharged?: number;
    latencyMs?: number;
    fallbackCount?: number;
    fallbackReason?: string;
    providerRequestId?: string;
  }
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  const set = (column: string, value: unknown) => {
    fields.push(`${column} = ?`);
    values.push(value);
  };

  if (input.requestedProvider !== undefined) {
    set('requested_provider', input.requestedProvider);
  }
  if (input.requestedModel !== undefined) {
    set('requested_model', input.requestedModel);
  }
  if (input.actualProvider !== undefined) {
    set('actual_provider', input.actualProvider);
    set('provider', input.actualProvider);
  }
  if (input.actualModel !== undefined) {
    set('actual_model', input.actualModel);
    set('model', input.actualModel);
  }
  if (input.inputTokens !== undefined) set('input_tokens', input.inputTokens);
  if (input.outputTokens !== undefined) set('output_tokens', input.outputTokens);
  if (input.cachedInputTokens !== undefined) {
    set('cached_input_tokens', input.cachedInputTokens);
  }
  if (input.usageEstimated !== undefined) {
    set('usage_estimated', input.usageEstimated ? 1 : 0);
  }
  if (input.providerCostMicrousd !== undefined) {
    set('provider_cost_microusd', input.providerCostMicrousd ?? 0);
  }
  if (input.costConfidence !== undefined) {
    set('cost_confidence', input.costConfidence);
  }
  if (input.pricingVersion !== undefined) {
    set('pricing_version', input.pricingVersion);
  }
  if (input.pricingEntryId !== undefined) {
    set('pricing_entry_id', input.pricingEntryId);
  }
  if (input.costCalculatedAt !== undefined) {
    set('cost_calculated_at', input.costCalculatedAt);
  }
  if (input.costBreakdownJson !== undefined) {
    set('cost_breakdown_json', input.costBreakdownJson);
  }
  if (input.energyReserved !== undefined) set('energy_reserved', input.energyReserved);
  if (input.energyCharged !== undefined) set('energy_charged', input.energyCharged);
  if (input.latencyMs !== undefined) set('latency_ms', input.latencyMs);
  if (input.fallbackCount !== undefined) set('fallback_count', input.fallbackCount);
  if (input.fallbackReason !== undefined) set('fallback_reason', input.fallbackReason);
  if (input.providerRequestId !== undefined) {
    set('provider_request_id', input.providerRequestId);
  }

  if (!fields.length) return;

  values.push(runId);
  await db
    .prepare(`UPDATE inference_runs SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();
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

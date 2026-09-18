import { generateId } from '../lib/ids';

export type PurchaseIntentStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export type PurchaseIntentRecord = {
  id: string;
  userId: string;
  packId: string;
  paddleTransactionId: string | null;
  status: PurchaseIntentStatus;
  createdAt: string;
};

export async function createPurchaseIntent(
  db: D1Database,
  input: { userId: string; packId: string; customData?: Record<string, string> }
): Promise<PurchaseIntentRecord> {
  const id = generateId();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO billing_purchase_intents (
        id, user_id, pack_id, status, custom_data_json, created_at, updated_at
      ) VALUES (?, ?, ?, 'pending', ?, ?, ?)`
    )
    .bind(id, input.userId, input.packId, JSON.stringify(input.customData ?? {}), now, now)
    .run();

  return {
    id,
    userId: input.userId,
    packId: input.packId,
    paddleTransactionId: null,
    status: 'pending',
    createdAt: now,
  };
}

export async function recordPaddleWebhookEvent(
  db: D1Database,
  input: { eventId: string; eventType: string; payloadHash?: string }
): Promise<boolean> {
  const existing = await db
    .prepare(`SELECT event_id FROM paddle_webhook_events WHERE event_id = ? LIMIT 1`)
    .bind(input.eventId)
    .first();

  if (existing) return false;

  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO paddle_webhook_events (event_id, event_type, received_at, status, payload_hash)
       VALUES (?, ?, ?, 'received', ?)`
    )
    .bind(input.eventId, input.eventType, now, input.payloadHash ?? null)
    .run();

  return true;
}

export async function markPaddleWebhookProcessed(
  db: D1Database,
  eventId: string,
  status: 'processed' | 'ignored' | 'failed',
  errorMessage?: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE paddle_webhook_events
       SET status = ?, processed_at = ?, error_message = ?
       WHERE event_id = ?`
    )
    .bind(status, now, errorMessage?.slice(0, 500) ?? null, eventId)
    .run();
}

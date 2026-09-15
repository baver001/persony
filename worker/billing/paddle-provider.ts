import { FULL_BATTERY_UNITS } from './constants';
import { creditEnergy } from './wallet-repository';

/** Recharge packages (config-driven, not immutable). */
export const RECHARGE_PACKAGES = [
  { id: 'pack_10', amountUsd: 10, energyUnits: FULL_BATTERY_UNITS * 5 },
  { id: 'pack_20', amountUsd: 20, energyUnits: FULL_BATTERY_UNITS * 11 },
  { id: 'pack_50', amountUsd: 50, energyUnits: FULL_BATTERY_UNITS * 30 },
] as const;

export type PaddleWebhookEvent = {
  event_id: string;
  event_type: string;
  data?: {
    id?: string;
    custom_data?: { user_id?: string; package_id?: string };
    status?: string;
    details?: { totals?: { total?: string } };
  };
};

export async function isWebhookProcessed(
  db: D1Database,
  eventId: string
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT external_event_id FROM webhook_events WHERE provider = 'paddle' AND external_event_id = ?`
    )
    .bind(eventId)
    .first();
  return Boolean(row);
}

export async function markWebhookProcessed(db: D1Database, eventId: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO webhook_events (provider, external_event_id, processed_at) VALUES ('paddle', ?, ?)`
    )
    .bind(eventId, new Date().toISOString())
    .run();
}

export async function handlePaddleTransactionCompleted(
  db: D1Database,
  event: PaddleWebhookEvent
): Promise<{ credited: boolean; energyUnits: number }> {
  const eventId = event.event_id;
  if (!eventId || await isWebhookProcessed(db, eventId)) {
    return { credited: false, energyUnits: 0 };
  }

  const userId = event.data?.custom_data?.user_id;
  const packageId = event.data?.custom_data?.package_id;
  if (!userId || !packageId) {
    await markWebhookProcessed(db, eventId);
    return { credited: false, energyUnits: 0 };
  }

  const pack = RECHARGE_PACKAGES.find((p) => p.id === packageId);
  if (!pack) {
    await markWebhookProcessed(db, eventId);
    return { credited: false, energyUnits: 0 };
  }

  const paymentId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO payments (id, user_id, provider, external_transaction_id, amount, currency, status, energy_granted, created_at)
       VALUES (?, ?, 'paddle', ?, ?, 'USD', 'completed', ?, ?)`
    )
    .bind(
      paymentId,
      userId,
      event.data?.id || eventId,
      pack.amountUsd * 100,
      pack.energyUnits,
      now
    )
    .run();

  await creditEnergy(db, userId, pack.energyUnits, 'purchase', {
    paymentId,
    retailMicrousd: pack.amountUsd * 1_000_000,
  });

  await markWebhookProcessed(db, eventId);
  return { credited: true, energyUnits: pack.energyUnits };
}

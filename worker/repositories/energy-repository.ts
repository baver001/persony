import { generateId } from '../lib/ids';

export type EnergyWalletRow = {
  user_id: string;
  available_units: number;
  reserve_units: number;
  updated_at: string;
  last_energy_update_at: string | null;
  last_billable_usage_at: string | null;
  welcome_granted: number;
};

export type EnergyLedgerType =
  | 'usage'
  | 'welcome_grant'
  | 'beta_regeneration'
  | 'owner_adjustment'
  | 'purchase';

export async function getEnergyWallet(
  db: D1Database,
  userId: string
): Promise<EnergyWalletRow | null> {
  return db
    .prepare(`SELECT * FROM energy_wallets WHERE user_id = ? LIMIT 1`)
    .bind(userId)
    .first<EnergyWalletRow>();
}

export async function insertEnergyWallet(
  db: D1Database,
  input: {
    userId: string;
    availableUnits: number;
    welcomeGranted: boolean;
    now: string;
  }
): Promise<EnergyWalletRow> {
  await db
    .prepare(
      `INSERT INTO energy_wallets (
        user_id, available_units, reserve_units, updated_at,
        last_energy_update_at, last_billable_usage_at, welcome_granted
      ) VALUES (?, ?, 0, ?, ?, NULL, ?)`
    )
    .bind(
      input.userId,
      input.availableUnits,
      input.now,
      input.now,
      input.welcomeGranted ? 1 : 0
    )
    .run();

  return {
    user_id: input.userId,
    available_units: input.availableUnits,
    reserve_units: 0,
    updated_at: input.now,
    last_energy_update_at: input.now,
    last_billable_usage_at: null,
    welcome_granted: input.welcomeGranted ? 1 : 0,
  };
}

export async function updateEnergyWalletUnits(
  db: D1Database,
  userId: string,
  availableUnits: number,
  now: string,
  lastBillableUsageAt?: string | null
): Promise<void> {
  if (lastBillableUsageAt !== undefined) {
    await db
      .prepare(
        `UPDATE energy_wallets
         SET available_units = ?, updated_at = ?, last_energy_update_at = ?,
             last_billable_usage_at = ?
         WHERE user_id = ?`
      )
      .bind(availableUnits, now, now, lastBillableUsageAt, userId)
      .run();
    return;
  }

  await db
    .prepare(
      `UPDATE energy_wallets
       SET available_units = ?, updated_at = ?, last_energy_update_at = ?
       WHERE user_id = ?`
    )
    .bind(availableUnits, now, now, userId)
    .run();
}

export async function findLedgerByInferenceRun(
  db: D1Database,
  inferenceRunId: string
): Promise<{ id: string } | null> {
  return db
    .prepare(
      `SELECT id FROM energy_ledger WHERE inference_run_id = ? LIMIT 1`
    )
    .bind(inferenceRunId)
    .first<{ id: string }>();
}

export async function insertEnergyLedgerEntry(
  db: D1Database,
  input: {
    userId: string;
    type: EnergyLedgerType;
    energyDelta: number;
    inferenceRunId?: string;
    usageEventId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<string> {
  const id = generateId();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO energy_ledger (
        id, user_id, type, energy_delta, retail_value_microusd, provider_cost_microusd,
        usage_event_id, payment_id, created_at, metadata_json, inference_run_id
      ) VALUES (?, ?, ?, ?, 0, 0, ?, NULL, ?, ?, ?)`
    )
    .bind(
      id,
      input.userId,
      input.type,
      input.energyDelta,
      input.usageEventId ?? null,
      now,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.inferenceRunId ?? null
    )
    .run();
  return id;
}

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
  | 'purchase'
  | 'reservation_settle'
  | 'reservation_release';

export type EnergyReservationRow = {
  id: string;
  user_id: string;
  inference_run_id: string;
  reserved_units: number;
  settled_units: number | null;
  status: string;
  created_at: string;
  settled_at: string | null;
  metadata_json: string | null;
};

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

export async function findEnergyReservationByInferenceRun(
  db: D1Database,
  inferenceRunId: string
): Promise<EnergyReservationRow | null> {
  return db
    .prepare(`SELECT * FROM energy_reservations WHERE inference_run_id = ? LIMIT 1`)
    .bind(inferenceRunId)
    .first<EnergyReservationRow>();
}

/**
 * Atomically move units from available → reserve. Fails when balance insufficient.
 */
export async function atomicReserveEnergyUnits(
  db: D1Database,
  userId: string,
  units: number,
  now: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE energy_wallets
       SET available_units = available_units - ?,
           reserve_units = reserve_units + ?,
           updated_at = ?,
           last_energy_update_at = ?
       WHERE user_id = ? AND available_units >= ?`
    )
    .bind(units, units, now, now, userId, units)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

export async function insertEnergyReservation(
  db: D1Database,
  input: {
    id: string;
    userId: string;
    inferenceRunId: string;
    reservedUnits: number;
    now: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO energy_reservations (
        id, user_id, inference_run_id, reserved_units, settled_units,
        status, created_at, settled_at, metadata_json
      ) VALUES (?, ?, ?, ?, NULL, 'active', ?, NULL, ?)`
    )
    .bind(
      input.id,
      input.userId,
      input.inferenceRunId,
      input.reservedUnits,
      input.now,
      input.metadata ? JSON.stringify(input.metadata) : null
    )
    .run();
}

export async function finalizeEnergyReservation(
  db: D1Database,
  input: {
    reservationId: string;
    userId: string;
    reservedUnits: number;
    actualUnits: number;
    now: string;
    inferenceRunId: string;
    operation: string;
  }
): Promise<void> {
  const extraCharge = Math.max(0, input.actualUnits - input.reservedUnits);

  const walletUpdate = await db
    .prepare(
      `UPDATE energy_wallets
       SET reserve_units = reserve_units - ?,
           available_units = available_units + ? - ?,
           updated_at = ?,
           last_energy_update_at = ?,
           last_billable_usage_at = ?
       WHERE user_id = ? AND available_units >= ?`
    )
    .bind(
      input.reservedUnits,
      input.reservedUnits,
      input.actualUnits,
      input.now,
      input.now,
      input.now,
      input.userId,
      extraCharge
    )
    .run();

  if ((walletUpdate.meta?.changes ?? 0) === 0 && extraCharge > 0) {
    throw new Error('Insufficient energy to settle reservation');
  }

  await db
    .prepare(
      `UPDATE energy_reservations
       SET status = 'settled', settled_units = ?, settled_at = ?
       WHERE id = ?`
    )
    .bind(input.actualUnits, input.now, input.reservationId)
    .run();

  if (input.actualUnits > 0) {
    await insertEnergyLedgerEntry(db, {
      userId: input.userId,
      type: 'reservation_settle',
      energyDelta: -input.actualUnits,
      inferenceRunId: input.inferenceRunId,
      metadata: { operation: input.operation, reserved: input.reservedUnits },
    });
  }
}

export async function releaseEnergyReservation(
  db: D1Database,
  input: {
    reservationId: string;
    userId: string;
    reservedUnits: number;
    now: string;
    inferenceRunId: string;
    reason: string;
  }
): Promise<void> {
  await db
    .prepare(
      `UPDATE energy_wallets
       SET reserve_units = reserve_units - ?,
           available_units = available_units + ?,
           updated_at = ?,
           last_energy_update_at = ?
       WHERE user_id = ?`
    )
    .bind(
      input.reservedUnits,
      input.reservedUnits,
      input.now,
      input.now,
      input.userId
    )
    .run();

  await db
    .prepare(
      `UPDATE energy_reservations
       SET status = 'released', settled_units = 0, settled_at = ?
       WHERE id = ?`
    )
    .bind(input.now, input.reservationId)
    .run();

  await insertEnergyLedgerEntry(db, {
    userId: input.userId,
    type: 'reservation_release',
    energyDelta: 0,
    inferenceRunId: input.inferenceRunId,
    metadata: { reason: input.reason },
  });
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

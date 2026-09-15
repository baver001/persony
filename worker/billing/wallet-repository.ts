import { FULL_BATTERY_UNITS } from './constants';

export type WalletSnapshot = {
  userId: string;
  availableUnits: number;
  reserveUnits: number;
  batteryPercent: number;
  reserveBatteries: number;
};

export async function getOrCreateWallet(db: D1Database, userId: string): Promise<WalletSnapshot> {
  const row = await db
    .prepare('SELECT available_units, reserve_units FROM energy_wallets WHERE user_id = ?')
    .bind(userId)
    .first<{ available_units: number; reserve_units: number }>();

  if (row) {
    return toSnapshot(userId, row.available_units, row.reserve_units);
  }

  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO energy_wallets (user_id, available_units, reserve_units, updated_at)
       VALUES (?, 0, 0, ?)`
    )
    .bind(userId, now)
    .run();

  return toSnapshot(userId, 0, 0);
}

export function toSnapshot(
  userId: string,
  availableUnits: number,
  reserveUnits: number
): WalletSnapshot {
  const batteryPercent = Math.min(100, Math.round((availableUnits / FULL_BATTERY_UNITS) * 100));
  const reserveBatteries = Math.floor(reserveUnits / FULL_BATTERY_UNITS);
  return { userId, availableUnits, reserveUnits, batteryPercent, reserveBatteries };
}

export async function grantTrialBattery(db: D1Database, userId: string): Promise<boolean> {
  const user = await db
    .prepare('SELECT trial_granted_at FROM users WHERE id = ?')
    .bind(userId)
    .first<{ trial_granted_at: string | null }>();

  if (user?.trial_granted_at) return false;

  const now = new Date().toISOString();
  await getOrCreateWallet(db, userId);

  await db
    .prepare(
      `UPDATE energy_wallets SET available_units = available_units + ?, updated_at = ? WHERE user_id = ?`
    )
    .bind(FULL_BATTERY_UNITS, now, userId)
    .run();

  await db
    .prepare(
      `INSERT INTO energy_ledger (id, user_id, type, energy_delta, retail_value_microusd, provider_cost_microusd, created_at, metadata_json)
       VALUES (?, ?, 'trial_grant', ?, 2_000_000, 0, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      userId,
      FULL_BATTERY_UNITS,
      now,
      JSON.stringify({ reason: 'welcome_battery' })
    )
    .run();

  await db
    .prepare('UPDATE users SET trial_granted_at = ?, updated_at = ? WHERE id = ?')
    .bind(now, now, userId)
    .run();

  return true;
}

export async function debitEnergy(
  db: D1Database,
  userId: string,
  energyUnits: number,
  meta: {
    providerCostMicrousd: number;
    retailCostMicrousd: number;
    usageEventId?: string;
  }
): Promise<boolean> {
  const wallet = await getOrCreateWallet(db, userId);
  let available = wallet.availableUnits;
  let reserve = wallet.reserveUnits;

  if (available + reserve < energyUnits) return false;

  if (available >= energyUnits) {
    available -= energyUnits;
  } else {
    const remaining = energyUnits - available;
    available = 0;
    while (remaining > 0 && reserve >= FULL_BATTERY_UNITS) {
      reserve -= FULL_BATTERY_UNITS;
      available += FULL_BATTERY_UNITS;
    }
    if (available < remaining) return false;
    available -= remaining;
  }

  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE energy_wallets SET available_units = ?, reserve_units = ?, updated_at = ? WHERE user_id = ?`
    )
    .bind(available, reserve, now, userId)
    .run();

  await db
    .prepare(
      `INSERT INTO energy_ledger (id, user_id, type, energy_delta, retail_value_microusd, provider_cost_microusd, usage_event_id, created_at)
       VALUES (?, ?, 'usage', ?, ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      userId,
      -energyUnits,
      meta.retailCostMicrousd,
      meta.providerCostMicrousd,
      meta.usageEventId || null,
      now
    )
    .run();

  return true;
}

export async function creditEnergy(
  db: D1Database,
  userId: string,
  energyUnits: number,
  type: 'purchase' | 'refund' | 'adjustment' | 'promo',
  meta: { paymentId?: string; retailMicrousd?: number }
): Promise<void> {
  const wallet = await getOrCreateWallet(db, userId);
  let available = wallet.availableUnits;
  let reserve = wallet.reserveUnits;

  available += energyUnits;
  while (available > FULL_BATTERY_UNITS) {
    available -= FULL_BATTERY_UNITS;
    reserve += FULL_BATTERY_UNITS;
  }

  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE energy_wallets SET available_units = ?, reserve_units = ?, updated_at = ? WHERE user_id = ?`
    )
    .bind(available, reserve, now, userId)
    .run();

  await db
    .prepare(
      `INSERT INTO energy_ledger (id, user_id, type, energy_delta, retail_value_microusd, provider_cost_microusd, payment_id, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      userId,
      type,
      energyUnits,
      meta.retailMicrousd ?? 0,
      meta.paymentId ?? null,
      now
    )
    .run();
}

export async function hasEnergy(db: D1Database, userId: string): Promise<boolean> {
  const wallet = await getOrCreateWallet(db, userId);
  return wallet.availableUnits + wallet.reserveUnits > 0;
}

import {
  type BatteryConfig,
  DEFAULT_BATTERY_CONFIG,
  isSimulationBatteryMode,
  loadBatteryConfig,
  percentageFromUnits,
  unitsForOperation,
} from '../billing/battery-config';
import {
  energyUnitsFromProviderCost,
  loadRetailPricingConfig,
  type RetailPricingConfig,
} from '../billing/retail-pricing';
import { generateId } from '../lib/ids';
import {
  atomicReserveEnergyUnits,
  findEnergyReservationByInferenceRun,
  findLedgerByInferenceRun,
  finalizeEnergyReservation,
  getEnergyWallet,
  insertEnergyLedgerEntry,
  insertEnergyReservation,
  insertEnergyWallet,
  releaseEnergyReservation,
  updateEnergyWalletUnits,
} from '../repositories/energy-repository';

export type BatteryStatus =
  | 'full'
  | 'normal'
  | 'low'
  | 'critical'
  | 'empty'
  | 'recharging';

export type BatterySnapshot = {
  percentage: number;
  status: BatteryStatus;
  mode: string;
  isRecharging: boolean;
  fullAt: string | null;
  enabled: boolean;
};

export class BatteryEmptyError extends Error {
  readonly status = 402;
  readonly code = 'BATTERY_EMPTY';
  constructor(public readonly snapshot: BatterySnapshot) {
    super('Battery is empty');
    this.name = 'BatteryEmptyError';
  }
}

export class BatteryDisabledError extends Error {
  readonly status = 503;
  constructor() {
    super('Battery system disabled');
    this.name = 'BatteryDisabledError';
  }
}

function statusFromPercentage(pct: number, isRecharging: boolean): BatteryStatus {
  if (pct <= 0) return isRecharging ? 'recharging' : 'empty';
  if (pct >= 100) return 'full';
  if (pct <= 10) return 'critical';
  if (pct <= 25) return 'low';
  return 'normal';
}

function parseIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

export function computeRegeneratedUnits(
  wallet: {
    available_units: number;
    last_energy_update_at: string | null;
    last_billable_usage_at: string | null;
  },
  config: BatteryConfig,
  nowMs: number
): { units: number; isRecharging: boolean; fullAt: string | null } {
  if (!isSimulationBatteryMode(config.battery_mode)) {
    return { units: wallet.available_units, isRecharging: false, fullAt: null };
  }

  const capacity = config.battery_capacity_units;
  if (wallet.available_units >= capacity) {
    return { units: capacity, isRecharging: false, fullAt: null };
  }

  const lastBillable = parseIso(wallet.last_billable_usage_at);
  const lastUpdate = parseIso(wallet.last_energy_update_at) ?? nowMs;
  const delayMs = config.battery_regen_delay_minutes * 60 * 1000;
  const fullMs = config.battery_regen_full_hours * 60 * 60 * 1000;
  const regenStart = lastBillable ? lastBillable + delayMs : lastUpdate;
  const eligibleMs = Math.max(0, nowMs - regenStart);

  if (eligibleMs <= 0) {
    return { units: wallet.available_units, isRecharging: false, fullAt: null };
  }

  const regenRate = capacity / fullMs;
  const restored = Math.floor(eligibleMs * regenRate);
  const nextUnits = Math.min(capacity, wallet.available_units + restored);
  const isRecharging = nextUnits < capacity;

  let fullAt: string | null = null;
  if (isRecharging && regenRate > 0) {
    const remaining = capacity - nextUnits;
    fullAt = new Date(nowMs + remaining / regenRate).toISOString();
  }

  return { units: nextUnits, isRecharging, fullAt };
}

export async function ensureEnergyWallet(
  db: D1Database,
  userId: string,
  config?: BatteryConfig
): Promise<void> {
  const cfg = config ?? (await loadBatteryConfig(db));
  const existing = await getEnergyWallet(db, userId);
  if (existing) return;

  const now = new Date().toISOString();
  const welcomeUnits = cfg.battery_welcome_units;
  await insertEnergyWallet(db, {
    userId,
    availableUnits: welcomeUnits,
    welcomeGranted: true,
    now,
  });

  await insertEnergyLedgerEntry(db, {
    userId,
    type: 'welcome_grant',
    energyDelta: welcomeUnits,
    metadata: { reason: 'welcome_battery' },
  });
}

export async function materializeBatteryState(
  db: D1Database,
  userId: string,
  config?: BatteryConfig
): Promise<{ availableUnits: number; isRecharging: boolean; fullAt: string | null }> {
  const cfg = config ?? (await loadBatteryConfig(db));
  await ensureEnergyWallet(db, userId, cfg);

  const wallet = await getEnergyWallet(db, userId);
  if (!wallet) {
    return { availableUnits: 0, isRecharging: false, fullAt: null };
  }

  const now = new Date().toISOString();
  const nowMs = Date.parse(now);
  const { units, isRecharging, fullAt } = computeRegeneratedUnits(wallet, cfg, nowMs);

  if (units !== wallet.available_units) {
    const delta = units - wallet.available_units;
    if (delta > 0) {
      await insertEnergyLedgerEntry(db, {
        userId,
        type: 'beta_regeneration',
        energyDelta: delta,
        metadata: { mode: 'lazy' },
      });
    }
    await updateEnergyWalletUnits(db, userId, units, now);
  }

  return { availableUnits: units, isRecharging, fullAt };
}

export async function getBatterySnapshot(
  db: D1Database,
  userId: string
): Promise<BatterySnapshot> {
  const config = await loadBatteryConfig(db);
  if (!config.battery_enabled || config.battery_mode === 'disabled') {
    return {
      percentage: 100,
      status: 'full',
      mode: config.battery_mode,
      isRecharging: false,
      fullAt: null,
      enabled: false,
    };
  }

  const { availableUnits, isRecharging, fullAt } = await materializeBatteryState(
    db,
    userId,
    config
  );
  const pct = percentageFromUnits(availableUnits, config.battery_capacity_units);

  const displayMode =
    config.battery_mode === 'beta_regen' ? 'simulation' : config.battery_mode;

  return {
    percentage: pct,
    status: statusFromPercentage(pct, isRecharging),
    mode: displayMode,
    isRecharging,
    fullAt,
    enabled: true,
  };
}

export async function assertBatteryAllowsAI(
  db: D1Database,
  userId: string
): Promise<BatterySnapshot> {
  const snapshot = await getBatterySnapshot(db, userId);
  if (!snapshot.enabled) return snapshot;
  if (snapshot.percentage <= 0) {
    throw new BatteryEmptyError(snapshot);
  }
  return snapshot;
}

const RESERVE_BUFFER_RATIO = 1.25;

export function estimateMaxEnergyUnits(
  operation: string,
  config: BatteryConfig,
  tokenHint?: { input?: number; output?: number }
): number {
  const base = unitsForOperation(operation, config, tokenHint);
  return Math.max(1, Math.ceil(base * RESERVE_BUFFER_RATIO));
}

export function actualEnergyUnitsForUsage(
  operation: string,
  config: BatteryConfig,
  tokenHint?: { input?: number; output?: number },
  providerCostMicrousd?: number,
  retailPricing?: RetailPricingConfig
): number {
  if (providerCostMicrousd && providerCostMicrousd > 0) {
    return energyUnitsFromProviderCost(providerCostMicrousd, retailPricing);
  }
  return unitsForOperation(operation, config, tokenHint);
}

export async function reserveEnergyForInference(
  db: D1Database,
  userId: string,
  inferenceRunId: string,
  operation = 'text_chat',
  tokenHint?: { input?: number; output?: number }
): Promise<{ reservedUnits: number; reservationId: string }> {
  const config = await loadBatteryConfig(db);
  if (!config.battery_enabled || config.battery_mode === 'disabled') {
    return { reservedUnits: 0, reservationId: '' };
  }

  const existing = await findEnergyReservationByInferenceRun(db, inferenceRunId);
  if (existing) {
    return { reservedUnits: existing.reserved_units, reservationId: existing.id };
  }

  await materializeBatteryState(db, userId, config);
  const reservedUnits = estimateMaxEnergyUnits(operation, config, tokenHint);
  const now = new Date().toISOString();
  const ok = await atomicReserveEnergyUnits(db, userId, reservedUnits, now);
  if (!ok) {
    const snapshot = await getBatterySnapshot(db, userId);
    throw new BatteryEmptyError(snapshot);
  }

  const reservationId = generateId();
  await insertEnergyReservation(db, {
    id: reservationId,
    userId,
    inferenceRunId,
    reservedUnits,
    now,
    metadata: { operation },
  });

  return { reservedUnits, reservationId };
}

export async function settleEnergyForInference(
  db: D1Database,
  userId: string,
  inferenceRunId: string,
  operation = 'text_chat',
  tokenHint?: { input?: number; output?: number },
  providerCostMicrousd?: number
): Promise<BatterySnapshot> {
  const config = await loadBatteryConfig(db);
  if (!config.battery_enabled || config.battery_mode === 'disabled') {
    return {
      percentage: 100,
      status: 'full',
      mode: config.battery_mode,
      isRecharging: false,
      fullAt: null,
      enabled: false,
    };
  }

  const reservation = await findEnergyReservationByInferenceRun(db, inferenceRunId);
  if (!reservation) {
    return chargeBatteryForInference(
      db,
      userId,
      inferenceRunId,
      operation,
      tokenHint
    );
  }

  if (reservation.status === 'settled') {
    return getBatterySnapshot(db, userId);
  }

  const retailPricing = await loadRetailPricingConfig(db);
  const actualUnits = actualEnergyUnitsForUsage(
    operation,
    config,
    tokenHint,
    providerCostMicrousd,
    retailPricing
  );
  const now = new Date().toISOString();

  await finalizeEnergyReservation(db, {
    reservationId: reservation.id,
    userId,
    reservedUnits: reservation.reserved_units,
    actualUnits,
    now,
    inferenceRunId,
    operation,
  });

  return getBatterySnapshot(db, userId);
}

export async function releaseEnergyForInference(
  db: D1Database,
  userId: string,
  inferenceRunId: string,
  reason = 'inference_failed'
): Promise<void> {
  const reservation = await findEnergyReservationByInferenceRun(db, inferenceRunId);
  if (!reservation || reservation.status !== 'active') return;

  const now = new Date().toISOString();
  await releaseEnergyReservation(db, {
    reservationId: reservation.id,
    userId,
    reservedUnits: reservation.reserved_units,
    now,
    inferenceRunId,
    reason,
  });
}

export async function withEnergyReservation<T>(
  db: D1Database | undefined,
  userId: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!db) return fn();

  const runId = generateId();
  await reserveEnergyForInference(db, userId, runId, operation);
  try {
    const result = await fn();
    await settleEnergyForInference(db, userId, runId, operation);
    return result;
  } catch (err) {
    await releaseEnergyForInference(db, userId, runId, 'operation_failed');
    throw err;
  }
}

export async function chargeBatteryForInference(
  db: D1Database,
  userId: string,
  inferenceRunId: string,
  operation = 'text_chat',
  tokenHint?: { input?: number; output?: number }
): Promise<BatterySnapshot> {
  const config = await loadBatteryConfig(db);
  if (!config.battery_enabled) {
    return {
      percentage: 100,
      status: 'full',
      mode: config.battery_mode,
      isRecharging: false,
      fullAt: null,
      enabled: false,
    };
  }

  const existing = await findLedgerByInferenceRun(db, inferenceRunId);
  if (existing) {
    return getBatterySnapshot(db, userId);
  }

  await materializeBatteryState(db, userId, config);
  const wallet = await getEnergyWallet(db, userId);
  if (!wallet) {
    throw new Error('Energy wallet missing');
  }

  const cost = unitsForOperation(operation, config, tokenHint);
  const nextUnits = Math.max(0, wallet.available_units - cost);
  const now = new Date().toISOString();

  await insertEnergyLedgerEntry(db, {
    userId,
    type: 'usage',
    energyDelta: -cost,
    inferenceRunId,
    metadata: { operation },
  });

  await updateEnergyWalletUnits(db, userId, nextUnits, now, now);
  return getBatterySnapshot(db, userId);
}

export async function ownerAdjustBattery(
  db: D1Database,
  userId: string,
  targetPercentage: number,
  actorUserId: string,
  reason?: string
): Promise<BatterySnapshot> {
  const config = await loadBatteryConfig(db);
  await ensureEnergyWallet(db, userId, config);
  await materializeBatteryState(db, userId, config);

  const capacity = config.battery_capacity_units;
  const clampedPct = Math.min(100, Math.max(0, targetPercentage));
  const targetUnits = Math.round((clampedPct / 100) * capacity);
  const wallet = await getEnergyWallet(db, userId);
  const current = wallet?.available_units ?? 0;
  const delta = targetUnits - current;
  const now = new Date().toISOString();

  if (delta !== 0) {
    await insertEnergyLedgerEntry(db, {
      userId,
      type: 'owner_adjustment',
      energyDelta: delta,
      metadata: { actorUserId, reason, targetPercentage: clampedPct },
    });
    await updateEnergyWalletUnits(db, userId, targetUnits, now);
  }

  return getBatterySnapshot(db, userId);
}

export { DEFAULT_BATTERY_CONFIG };

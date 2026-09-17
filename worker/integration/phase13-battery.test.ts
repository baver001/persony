import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  chargeBatteryForInference,
  ensureEnergyWallet,
  getBatterySnapshot,
  ownerAdjustBattery,
} from '../services/energy-service';
import { findLedgerByInferenceRun } from '../repositories/energy-repository';
import { createTestD1 } from '../test/sqlite-d1';

const migrationsDir = join(process.cwd(), 'worker/db/migrations');
const userId = 'battery_user_1';

describe('Phase 1.3 battery beta', () => {
  let db: D1Database;

  beforeEach(async () => {
    db = createTestD1(migrationsDir);
    await ensureEnergyWallet(db, userId);
  });

  it('grants welcome battery once at 100%', async () => {
    const snapshot = await getBatterySnapshot(db, userId);
    expect(snapshot.percentage).toBe(100);
    expect(snapshot.enabled).toBe(true);
  });

  it('decreases battery on usage', async () => {
    await chargeBatteryForInference(db, userId, 'run_1', 'text_chat');
    const after = await getBatterySnapshot(db, userId);
    expect(after.percentage).toBeLessThan(100);
  });

  it('does not double-charge the same inference run', async () => {
    await chargeBatteryForInference(db, userId, 'run_dup', 'text_chat');
    const first = await getBatterySnapshot(db, userId);
    await chargeBatteryForInference(db, userId, 'run_dup', 'text_chat');
    const second = await getBatterySnapshot(db, userId);
    expect(second.percentage).toBe(first.percentage);
    const ledger = await findLedgerByInferenceRun(db, 'run_dup');
    expect(ledger?.id).toBeTruthy();
  });

  it('owner can reset battery to 100%', async () => {
    await chargeBatteryForInference(db, userId, 'run_owner', 'text_chat');
    const low = await getBatterySnapshot(db, userId);
    expect(low.percentage).toBeLessThan(100);
    const reset = await ownerAdjustBattery(db, userId, 100, 'owner_1', 'test reset');
    expect(reset.percentage).toBe(100);
  });
});

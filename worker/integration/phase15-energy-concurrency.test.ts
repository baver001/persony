import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_BATTERY_CONFIG } from '../billing/battery-config';
import { updateEnergyWalletUnits } from '../repositories/energy-repository';
import { ensureEnergyWallet, reserveEnergyForInference } from '../services/energy-service';
import { createTestD1 } from '../test/sqlite-d1';
import { generateId } from '../lib/ids';

const migrationsDir = join(process.cwd(), 'worker/db/migrations');

describe('phase15 energy concurrency', () => {
  it('prevents over-reservation when balance only covers one request', async () => {
    const db = createTestD1(migrationsDir);
    const userId = 'user-concurrency';
    const config = {
      ...DEFAULT_BATTERY_CONFIG,
      battery_capacity_units: 10_000,
      battery_welcome_units: 10_000,
    };

    await ensureEnergyWallet(db, userId, config);
    const now = new Date().toISOString();
    await updateEnergyWalletUnits(db, userId, 160, now);

    const runA = generateId();
    const runB = generateId();

    await reserveEnergyForInference(db, userId, runA, 'chat_text');

    await expect(
      reserveEnergyForInference(db, userId, runB, 'chat_text')
    ).rejects.toMatchObject({ code: 'BATTERY_EMPTY' });
  });
});

import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_BATTERY_CONFIG } from '../billing/battery-config';
import { getEnergyWallet } from '../repositories/energy-repository';
import { ensureEnergyWallet, withEnergyReservation } from './energy-service';
import { createTestD1 } from '../test/sqlite-d1';

const migrationsDir = join(process.cwd(), 'worker/db/migrations');

describe('withEnergyReservation', () => {
  it('settles on success and releases on failure without double charge', async () => {
    const db = createTestD1(migrationsDir);
    const userId = 'user-wrap';
    await ensureEnergyWallet(db, userId, DEFAULT_BATTERY_CONFIG);
    const before = (await getEnergyWallet(db, userId))!.available_units;

    await withEnergyReservation(db, userId, 'text_chat', async () => 'ok');
    const afterSuccess = (await getEnergyWallet(db, userId))!.available_units;
    expect(afterSuccess).toBeLessThan(before);

    await expect(
      withEnergyReservation(db, userId, 'text_chat', async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    const afterFailure = (await getEnergyWallet(db, userId))!.available_units;
    expect(afterFailure).toBe(afterSuccess);
  });
});

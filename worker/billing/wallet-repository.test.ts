import { describe, expect, it } from 'vitest';
import { toSnapshot } from './wallet-repository';
import { FULL_BATTERY_UNITS } from './constants';

describe('Wallet snapshot', () => {
  it('shows battery 0-100%', () => {
    expect(toSnapshot('u1', 0, 0).batteryPercent).toBe(0);
    expect(toSnapshot('u1', FULL_BATTERY_UNITS, 0).batteryPercent).toBe(100);
    expect(toSnapshot('u1', FULL_BATTERY_UNITS / 2, 0).batteryPercent).toBe(50);
  });

  it('never shows more than 100% battery', () => {
    expect(toSnapshot('u1', FULL_BATTERY_UNITS * 2, 0).batteryPercent).toBe(100);
  });

  it('calculates reserve batteries', () => {
    expect(toSnapshot('u1', 0, FULL_BATTERY_UNITS * 2).reserveBatteries).toBe(2);
  });
});

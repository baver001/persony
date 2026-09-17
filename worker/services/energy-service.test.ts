import { describe, expect, it } from 'vitest';
import { DEFAULT_BATTERY_CONFIG, percentageFromUnits } from '../billing/battery-config';
import { computeRegeneratedUnits } from './energy-service';

describe('energy-service', () => {
  const config = { ...DEFAULT_BATTERY_CONFIG, battery_capacity_units: 10_000 };

  it('percentage caps at 100', () => {
    expect(percentageFromUnits(12_000, 10_000)).toBe(100);
    expect(percentageFromUnits(5_000, 10_000)).toBe(50);
  });

  it('does not regenerate before idle delay', () => {
    const now = Date.parse('2026-01-01T12:00:00.000Z');
    const result = computeRegeneratedUnits(
      {
        available_units: 2_000,
        last_energy_update_at: '2026-01-01T11:00:00.000Z',
        last_billable_usage_at: '2026-01-01T11:50:00.000Z',
      },
      config,
      now
    );
    expect(result.units).toBe(2_000);
    expect(result.isRecharging).toBe(false);
  });

  it('regenerates toward full over configured hours after delay', () => {
    const lastBillable = Date.parse('2026-01-01T00:00:00.000Z');
    const delayMs = config.battery_regen_delay_minutes * 60 * 1000;
    const fullMs = config.battery_regen_full_hours * 60 * 60 * 1000;
    const now = lastBillable + delayMs + fullMs;

    const result = computeRegeneratedUnits(
      {
        available_units: 0,
        last_energy_update_at: '2026-01-01T00:00:00.000Z',
        last_billable_usage_at: new Date(lastBillable).toISOString(),
      },
      config,
      now
    );

    expect(result.units).toBe(10_000);
    expect(result.isRecharging).toBe(false);
  });

  it('partial regeneration between delay and full window', () => {
    const lastBillable = Date.parse('2026-01-01T00:00:00.000Z');
    const delayMs = config.battery_regen_delay_minutes * 60 * 1000;
    const halfFullMs = (config.battery_regen_full_hours * 60 * 60 * 1000) / 2;
    const now = lastBillable + delayMs + halfFullMs;

    const result = computeRegeneratedUnits(
      {
        available_units: 0,
        last_energy_update_at: '2026-01-01T00:00:00.000Z',
        last_billable_usage_at: new Date(lastBillable).toISOString(),
      },
      config,
      now
    );

    expect(result.units).toBeGreaterThan(4_000);
    expect(result.units).toBeLessThan(6_000);
    expect(result.isRecharging).toBe(true);
  });
});

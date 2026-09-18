import { describe, expect, it } from 'vitest';
import { DEFAULT_BATTERY_CONFIG, isSimulationBatteryMode } from './battery-config';

describe('battery-config', () => {
  it('defaults to simulation mode', () => {
    expect(DEFAULT_BATTERY_CONFIG.battery_mode).toBe('simulation');
  });

  it('treats beta_regen as simulation', () => {
    expect(isSimulationBatteryMode('simulation')).toBe(true);
    expect(isSimulationBatteryMode('beta_regen')).toBe(true);
    expect(isSimulationBatteryMode('paid')).toBe(false);
  });
});

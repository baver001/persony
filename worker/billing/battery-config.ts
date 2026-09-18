import { getSystemSetting } from '../repositories/settings-repository';

export type BatteryMode = 'simulation' | 'beta_regen' | 'paid';

/** Modes where charge drains on use and restores over idle time (no payments). */
export function isSimulationBatteryMode(mode: BatteryMode): boolean {
  return mode === 'simulation' || mode === 'beta_regen';
}

export type BatteryConfig = {
  battery_enabled: boolean;
  battery_mode: BatteryMode;
  battery_capacity_units: number;
  battery_welcome_units: number;
  battery_regen_delay_minutes: number;
  battery_regen_full_hours: number;
  beta_usage_scale: number;
};

export const DEFAULT_BATTERY_CONFIG: BatteryConfig = {
  battery_enabled: true,
  battery_mode: 'simulation',
  battery_capacity_units: 10_000,
  battery_welcome_units: 10_000,
  battery_regen_delay_minutes: 30,
  battery_regen_full_hours: 8,
  beta_usage_scale: 1,
};

const OPERATION_FALLBACK_UNITS: Record<string, number> = {
  text_chat: 120,
  voice_transcription: 80,
  live_voice: 350,
  tool_call: 60,
  summarize_call: 90,
  generate_avatar: 150,
  generate_character: 200,
};

export async function loadBatteryConfig(db: D1Database): Promise<BatteryConfig> {
  const merged: BatteryConfig = { ...DEFAULT_BATTERY_CONFIG };

  const numericKeys = [
    'battery_capacity_units',
    'battery_welcome_units',
    'battery_regen_delay_minutes',
    'battery_regen_full_hours',
    'beta_usage_scale',
  ] as const;

  const enabled = await getSystemSetting(db, 'battery_enabled');
  if (enabled !== null && enabled !== undefined) {
    merged.battery_enabled = Boolean(enabled);
  }

  const mode = await getSystemSetting(db, 'battery_mode');
  if (mode === 'paid' || mode === 'beta_regen' || mode === 'simulation') {
    merged.battery_mode = mode;
  }

  for (const key of numericKeys) {
    const value = await getSystemSetting(db, key);
    if (typeof value === 'number') {
      merged[key] = value;
    }
  }

  return merged;
}

export function unitsForOperation(
  operation: string,
  config: BatteryConfig,
  tokenHint?: { input?: number; output?: number }
): number {
  const input = tokenHint?.input ?? 0;
  const output = tokenHint?.output ?? 0;
  const tokenBased = Math.ceil(input / 80 + output / 40);
  const fallback = OPERATION_FALLBACK_UNITS[operation] ?? OPERATION_FALLBACK_UNITS.text_chat;
  const base = tokenBased > 0 ? Math.max(fallback, tokenBased) : fallback;
  return Math.max(1, Math.round(base * config.beta_usage_scale));
}

export function percentageFromUnits(available: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((available / capacity) * 100)));
}

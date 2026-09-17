import { getApiHeaders } from './headers';

export type BatterySnapshot = {
  percentage: number;
  status: 'full' | 'normal' | 'low' | 'critical' | 'empty' | 'recharging';
  mode: string;
  isRecharging: boolean;
  fullAt: string | null;
  enabled: boolean;
};

export async function fetchBatterySnapshot(): Promise<BatterySnapshot | null> {
  const res = await fetch('/api/me/battery', { headers: await getApiHeaders() });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error('Failed to load battery');
  return (await res.json()) as BatterySnapshot;
}

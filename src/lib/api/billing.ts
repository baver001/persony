import { getApiHeaders } from './headers';

export type BillingStatus = {
  enabled: boolean;
  provider: 'paddle' | null;
  checkoutAvailable: boolean;
  packs: Array<{
    id: string;
    label: string;
    energyUnits: number;
    currency: string;
    amountCents: number;
  }>;
};

export async function fetchBillingStatus(): Promise<BillingStatus | null> {
  const res = await fetch('/api/me/billing', { headers: await getApiHeaders() });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error('Failed to load billing status');
  return (await res.json()) as BillingStatus;
}

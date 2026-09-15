import { getApiHeaders } from './headers';

export type WalletInfo = {
  batteryPercent: number;
  reserveBatteries: number;
};

export type RechargePackage = {
  id: string;
  amountUsd: number;
  energyUnits: number;
};

export async function fetchWallet(): Promise<WalletInfo | null> {
  try {
    const res = await fetch('/api/billing/wallet', { headers: await getApiHeaders() });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchRechargePackages(): Promise<RechargePackage[]> {
  try {
    const res = await fetch('/api/billing/packages');
    if (!res.ok) return [];
    const data = (await res.json()) as { packages: RechargePackage[] };
    return data.packages;
  } catch {
    return [];
  }
}

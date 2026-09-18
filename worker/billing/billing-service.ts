import type { PersonyEnv } from '../types/env';
import { ENERGY_PACK_CATALOG } from './energy-packs';
import { createBillingProvider, isBillingEnabled } from './paddle-provider';

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

export function getBillingStatus(env: PersonyEnv): BillingStatus {
  const enabled = isBillingEnabled(env);
  return {
    enabled,
    provider: enabled ? 'paddle' : null,
    checkoutAvailable: false,
    packs: ENERGY_PACK_CATALOG.map((p) => ({
      id: p.id,
      label: p.label,
      energyUnits: p.energyUnits,
      currency: p.currency,
      amountCents: p.amountCents,
    })),
  };
}

export function getBillingProvider(env: PersonyEnv) {
  return createBillingProvider(env);
}

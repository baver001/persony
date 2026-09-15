import type { Context } from 'hono';
import { hasEnergy } from '../billing/wallet-repository';
import type { PersonyEnv } from '../types/env';
import { AuthRequiredError, getAuthContext } from './auth';

export class InsufficientEnergyError extends Error {
  readonly status = 402;
  constructor() {
    super('Insufficient Energy — recharge to continue');
    this.name = 'InsufficientEnergyError';
  }
}

/**
 * Gates billable AI endpoints: authenticated user + Energy > 0.
 */
export async function requireAIEntitlement(
  c: Context<{ Bindings: PersonyEnv }>
): Promise<string> {
  const auth = await getAuthContext(c);
  if (!auth.isAuthenticated || !auth.userId) {
    throw new AuthRequiredError();
  }

  if (c.env.DB) {
    let has = await hasEnergy(c.env.DB, auth.userId);
    if (!has) {
      const { grantTrialBattery } = await import('../billing/wallet-repository');
      await grantTrialBattery(c.env.DB, auth.userId);
      has = await hasEnergy(c.env.DB, auth.userId);
    }
    if (!has) {
      throw new InsufficientEnergyError();
    }
  }

  return auth.userId;
}

export async function getEnergyLevel(
  c: Context<{ Bindings: PersonyEnv }>,
  userId: string
): Promise<{ percent: number; low: boolean; critical: boolean }> {
  if (!c.env.DB) return { percent: 100, low: false, critical: false };

  const { getOrCreateWallet } = await import('../billing/wallet-repository');
  const wallet = await getOrCreateWallet(c.env.DB, userId);
  const percent = wallet.batteryPercent;
  return {
    percent,
    low: percent <= 15 && percent > 5,
    critical: percent <= 5,
  };
}

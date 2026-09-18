import type { BillingProvider, BillingCheckoutResult, BillingWebhookResult } from './billing-provider';
import { BillingNotConfiguredError } from './billing-provider';
import type { PersonyEnv } from '../types/env';

export function isBillingEnabled(env: PersonyEnv): boolean {
  return env.BILLING_ENABLED === 'true' && Boolean(env.PADDLE_API_KEY && env.PADDLE_WEBHOOK_SECRET);
}

/**
 * Paddle adapter — prepared but inactive until BILLING_ENABLED=true and secrets are set.
 * @see specs/billing-future.md
 */
export class PaddleBillingProvider implements BillingProvider {
  constructor(private readonly env: PersonyEnv) {}

  private assertConfigured(): void {
    if (!isBillingEnabled(this.env)) {
      throw new BillingNotConfiguredError();
    }
  }

  async createCheckout(): Promise<BillingCheckoutResult> {
    this.assertConfigured();
    // Future: POST to Paddle Transactions API, return checkout URL.
    throw new BillingNotConfiguredError();
  }

  async handleWebhook(): Promise<BillingWebhookResult> {
    this.assertConfigured();
    throw new BillingNotConfiguredError();
  }

  async chargeAutoRecharge(): Promise<{ charged: boolean; energyGranted?: number }> {
    this.assertConfigured();
    return { charged: false };
  }
}

export function createBillingProvider(env: PersonyEnv): BillingProvider {
  return new PaddleBillingProvider(env);
}

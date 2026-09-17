/**
 * Future billing integration (Paddle). Not wired in beta — interface only.
 * @see specs/billing-future.md
 */

export type BillingCheckoutResult = {
  checkoutUrl: string;
  sessionId: string;
};

export type BillingWebhookResult = {
  handled: boolean;
  energyGranted?: number;
};

export interface BillingProvider {
  createCheckout(input: {
    userId: string;
    packId: string;
    customData?: Record<string, string>;
  }): Promise<BillingCheckoutResult>;

  handleWebhook(rawBody: string, signature: string): Promise<BillingWebhookResult>;

  chargeAutoRecharge(input: {
    userId: string;
    packId: string;
    thresholdPct: number;
  }): Promise<{ charged: boolean; energyGranted?: number }>;
}

export class BillingNotConfiguredError extends Error {
  constructor() {
    super('Billing provider is not configured');
    this.name = 'BillingNotConfiguredError';
  }
}

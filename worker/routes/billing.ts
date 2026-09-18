import { Hono } from 'hono';
import { BillingNotConfiguredError } from '../billing/billing-provider';
import { getBillingProvider, getBillingStatus } from '../billing/billing-service';
import { getEnergyPack } from '../billing/energy-packs';
import { createPurchaseIntent } from '../repositories/billing-repository';
import { AuthRequiredError, requireUser } from '../middleware/auth';
import type { PersonyEnv } from '../types/env';

export const billingRoutes = new Hono<{ Bindings: PersonyEnv }>();

billingRoutes.get('/billing/status', async (c) => {
  return c.json(getBillingStatus(c.env));
});

billingRoutes.get('/me/billing', async (c) => {
  try {
    await requireUser(c);
    return c.json(getBillingStatus(c.env));
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

billingRoutes.post('/billing/checkout', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const body = (await c.req.json().catch(() => ({}))) as { packId?: string };
    const pack = body.packId ? getEnergyPack(body.packId) : undefined;
    if (!pack) return c.json({ error: 'Invalid pack' }, 400);

    const status = getBillingStatus(c.env);
    if (!status.enabled) {
      return c.json(
        {
          error: 'Billing is not enabled',
          code: 'BILLING_NOT_CONFIGURED',
          message: 'Payments are not available yet. Battery recharges automatically in simulation mode.',
        },
        501
      );
    }

    await createPurchaseIntent(c.env.DB, {
      userId,
      packId: pack.id,
      customData: { project: 'persony', userId },
    });

    const provider = getBillingProvider(c.env);
    const checkout = await provider.createCheckout({
      userId,
      packId: pack.id,
      customData: { project: 'persony', userId },
    });

    return c.json(checkout);
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    if (err instanceof BillingNotConfiguredError) {
      return c.json({ error: err.message, code: 'BILLING_NOT_CONFIGURED' }, 501);
    }
    throw err;
  }
});

billingRoutes.post('/billing/webhook/paddle', async (c) => {
  const status = getBillingStatus(c.env);
  if (!status.enabled) {
    return c.json({ error: 'Billing webhook not configured', code: 'BILLING_NOT_CONFIGURED' }, 503);
  }

  const rawBody = await c.req.text();
  const signature = c.req.header('Paddle-Signature') ?? '';
  const provider = getBillingProvider(c.env);

  try {
    const result = await provider.handleWebhook(rawBody, signature);
    return c.json(result);
  } catch (err) {
    if (err instanceof BillingNotConfiguredError) {
      return c.json({ error: err.message }, 503);
    }
    throw err;
  }
});

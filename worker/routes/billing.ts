import { Hono } from 'hono';
import { RECHARGE_PACKAGES, handlePaddleTransactionCompleted } from '../billing/paddle-provider';
import { getOrCreateWallet } from '../billing/wallet-repository';
import { AuthRequiredError, requireUser } from '../middleware/auth';
import type { PersonyEnv } from '../types/env';

export const billingRoutes = new Hono<{ Bindings: PersonyEnv }>();

billingRoutes.get('/billing/wallet', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);
    const wallet = await getOrCreateWallet(c.env.DB, userId);
    return c.json({
      batteryPercent: wallet.batteryPercent,
      reserveBatteries: wallet.reserveBatteries,
    });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

billingRoutes.get('/billing/packages', (c) => {
  return c.json({ packages: RECHARGE_PACKAGES });
});

billingRoutes.post('/billing/webhook', async (c) => {
  if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

  const body = await c.req.json();
  const eventType = body?.event_type as string;

  if (eventType === 'transaction.completed' || eventType === 'transaction.paid') {
    const result = await handlePaddleTransactionCompleted(c.env.DB, body);
    return c.json({ ok: true, ...result });
  }

  return c.json({ ok: true, ignored: true });
});

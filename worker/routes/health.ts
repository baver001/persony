import { Hono } from 'hono';
import { APP_VERSION } from '../lib/version';
import type { PersonyEnv } from '../types/env';
import { isDbReady } from '../repositories/persona-repository';

export const healthRoutes = new Hono<{ Bindings: PersonyEnv }>();

healthRoutes.get('/health', async (c) => {
  const dbReady = c.env.DB ? await isDbReady(c.env.DB) : false;
  return c.json({
    status: 'ok',
    service: 'persony',
    version: APP_VERSION,
    deployment: c.env.ENVIRONMENT || 'development',
    database: dbReady ? 'ready' : c.env.DB ? 'pending_migration' : 'not_configured',
    timestamp: Date.now(),
  });
});

/** Public runtime config for the SPA (publishable keys only). */
healthRoutes.get('/config', (c) => {
  const clerkPublishableKey = c.env.CLERK_PUBLISHABLE_KEY || null;
  const authRequired =
    c.env.ENVIRONMENT === 'production' || Boolean(c.env.CLERK_SECRET_KEY);

  const appUrl = c.env.APP_URL?.replace(/\/$/, '') || null;

  return c.json({
    authRequired,
    clerkPublishableKey,
    appUrl,
  });
});

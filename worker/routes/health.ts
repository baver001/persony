import { Hono } from 'hono';
import type { PersonyEnv } from '../types/env';
import { isDbReady } from '../repositories/persona-repository';

export const healthRoutes = new Hono<{ Bindings: PersonyEnv }>();

healthRoutes.get('/health', async (c) => {
  const dbReady = c.env.DB ? await isDbReady(c.env.DB) : false;
  return c.json({
    status: 'ok',
    service: 'persony',
    db: dbReady ? 'ready' : c.env.DB ? 'pending_migration' : 'not_configured',
    timestamp: Date.now(),
  });
});

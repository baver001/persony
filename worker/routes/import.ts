import { Hono } from 'hono';
import { localImportSchema } from '../lib/validation';
import { AuthRequiredError, requireUser } from '../middleware/auth';
import { importLocalV1 } from '../services/import-service';
import type { PersonyEnv } from '../types/env';

export const importRoutes = new Hono<{ Bindings: PersonyEnv }>();

importRoutes.post('/import/local-v1', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const body = await c.req.json();
    const parsed = localImportSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid import payload', details: parsed.error.flatten() }, 400);
    }

    const result = await importLocalV1(c.env.DB, userId, parsed.data);
    return c.json(result);
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

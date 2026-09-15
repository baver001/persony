import { Hono } from 'hono';
import { z } from 'zod';
import { AuthRequiredError, getAuthContext, requireUser } from '../middleware/auth';
import {
  getPublicPersonaBySlug,
  installPersona,
  listDiscoverPersonas,
  publishPersona,
  recordShare,
  remixPersona,
} from '../services/catalog-service';
import type { PersonyEnv } from '../types/env';

const publishSchema = z.object({
  visibility: z.enum(['unlisted', 'public']),
});

export const catalogRoutes = new Hono<{ Bindings: PersonyEnv }>();

catalogRoutes.get('/discover', async (c) => {
  if (!c.env.DB) {
    return c.json({ personas: [] });
  }
  const personas = await listDiscoverPersonas(c.env.DB);
  return c.json({ personas });
});

catalogRoutes.get('/p/:slug', async (c) => {
  if (!c.env.DB) return c.json({ error: 'Not found' }, 404);
  const persona = await getPublicPersonaBySlug(c.env.DB, c.req.param('slug'));
  if (!persona) return c.json({ error: 'Not found' }, 404);
  return c.json({ persona });
});

catalogRoutes.post('/personas/:id/publish', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const body = await c.req.json();
    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

    const ok = await publishPersona(c.env.DB, userId, c.req.param('id'), parsed.data.visibility);
    if (!ok) return c.json({ error: 'Not found' }, 404);
    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

catalogRoutes.post('/personas/:id/install', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const ok = await installPersona(c.env.DB, userId, c.req.param('id'));
    if (!ok) return c.json({ error: 'Cannot install' }, 400);
    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

catalogRoutes.post('/personas/:id/remix', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const newId = await remixPersona(c.env.DB, userId, c.req.param('id'));
    if (!newId) return c.json({ error: 'Cannot remix' }, 400);
    return c.json({ personaId: newId });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

catalogRoutes.post('/personas/:id/share', async (c) => {
  if (!c.env.DB) return c.json({ ok: true });
  const auth = await getAuthContext(c);
  const channel = (await c.req.json().catch(() => ({}))) as { channel?: string };
  await recordShare(c.env.DB, c.req.param('id'), auth.userId, channel.channel || 'link');
  return c.json({ ok: true });
});

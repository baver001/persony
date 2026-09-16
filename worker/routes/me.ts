import { Hono } from 'hono';
import { z } from 'zod';
import { toPersonaPublicDTO } from '../domain/persona-dto';
import { AuthRequiredError, requireUser } from '../middleware/auth';
import { getPersonaRecord } from '../repositories/persona-repository';
import {
  installPersonaForUser,
  listInstalledPersonas,
  uninstallPersonaForUser,
} from '../repositories/user-persona-repository';
import { getUserLocale, updateUserLocale } from '../repositories/user-repository';
import type { PersonyEnv } from '../types/env';

const localeSchema = z.object({
  preferredLocale: z.enum(['en', 'ru']),
});

export const meRoutes = new Hono<{ Bindings: PersonyEnv }>();

meRoutes.get('/me', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);
    const locale = await getUserLocale(c.env.DB, userId);
    return c.json({ userId, preferredLocale: locale });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error_code: 'AUTH_REQUIRED' }, 401);
    return c.json({ error_code: 'INTERNAL_ERROR' }, 500);
  }
});

meRoutes.patch('/me/locale', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);
    const body = await c.req.json();
    const parsed = localeSchema.safeParse(body);
    if (!parsed.success) return c.json({ error_code: 'INVALID_PAYLOAD' }, 400);
    await updateUserLocale(c.env.DB, userId, parsed.data.preferredLocale);
    return c.json({ preferredLocale: parsed.data.preferredLocale });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error_code: 'AUTH_REQUIRED' }, 401);
    return c.json({ error_code: 'INTERNAL_ERROR' }, 500);
  }
});

meRoutes.get('/me/personas', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);

    const installed = await listInstalledPersonas(c.env.DB, userId);
    const personas = [];
    for (const row of installed) {
      const persona = await getPersonaRecord(c.env, c.env.DB, row.personaId);
      if (persona) {
        personas.push({
          ...toPersonaPublicDTO(persona),
          installedVersion: row.personaVersion,
          pinned: row.pinned,
        });
      }
    }

    return c.json({ personas });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error_code: 'AUTH_REQUIRED' }, 401);
    return c.json({ error_code: 'INTERNAL_ERROR' }, 500);
  }
});

meRoutes.post('/me/personas/:personaId/install', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);
    const personaId = c.req.param('personaId');
    const persona = await getPersonaRecord(c.env, c.env.DB, personaId);
    if (!persona) return c.json({ error_code: 'PERSONA_NOT_FOUND' }, 404);
    await installPersonaForUser(c.env.DB, userId, persona.id, persona.currentVersion);
    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error_code: 'AUTH_REQUIRED' }, 401);
    return c.json({ error_code: 'INTERNAL_ERROR' }, 500);
  }
});

meRoutes.delete('/me/personas/:personaId', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);
    const ok = await uninstallPersonaForUser(c.env.DB, userId, c.req.param('personaId'));
    return c.json({ ok });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error_code: 'AUTH_REQUIRED' }, 401);
    return c.json({ error_code: 'INTERNAL_ERROR' }, 500);
  }
});

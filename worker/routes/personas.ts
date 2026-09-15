import { Hono } from 'hono';
import { toPersonaOwnerDTO, toPersonaPublicDTO } from '../domain/persona';
import {
  createPersonaSchema,
  legacyImportSchema,
  updatePersonaSchema,
  upsertPersonaSchema,
} from '../lib/validation';
import { AuthRequiredError, getAuthContext, requireUser } from '../middleware/auth';
import {
  createPersonaInDb,
  ensureDefaultPersonasSeeded,
  getPersonaById,
  listPublicPersonas,
  PersonaIdCollisionError,
  PersonaNotOwnedError,
  softDeletePersona,
  updatePersonaInDb,
  upsertPersonaInDb,
} from '../repositories/persona-repository';
import { importLegacyData } from '../services/import-service';
import type { PersonyEnv } from '../types/env';

export const personaRoutes = new Hono<{ Bindings: PersonyEnv }>();

personaRoutes.get('/personas', async (c) => {
  if (c.env.DB) await ensureDefaultPersonasSeeded(c.env.DB);
  const personas = await listPublicPersonas(c.env.DB);
  return c.json({ personas });
});

personaRoutes.get('/personas/:id', async (c) => {
  const auth = await getAuthContext(c);
  const persona = await getPersonaById(c.env.DB, c.req.param('id'), auth.userId);
  if (!persona) return c.json({ error: 'Persona not found' }, 404);

  const isOwner = auth.userId && persona.ownerUserId === auth.userId;
  if (isOwner) {
    return c.json({ persona: toPersonaOwnerDTO(persona) });
  }

  return c.json({ persona: toPersonaPublicDTO(persona) });
});

personaRoutes.post('/personas', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) {
      return c.json({ error: 'Database not configured' }, 503);
    }

    await ensureDefaultPersonasSeeded(c.env.DB);
    const body = await c.req.json();

    // Legacy upsert when client sends id (backward compat during migration)
    const legacyParsed = upsertPersonaSchema.safeParse(body);
    if (legacyParsed.success && legacyParsed.data.id) {
      const record = await upsertPersonaInDb(c.env.DB, userId, legacyParsed.data);
      return c.json({ persona: toPersonaOwnerDTO(record) });
    }

    const parsed = createPersonaSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid persona payload', details: parsed.error.flatten() }, 400);
    }

    const record = await createPersonaInDb(c.env.DB, userId, parsed.data);
    return c.json({ persona: toPersonaOwnerDTO(record) }, 201);
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return c.json({ error: 'Authentication required to save custom personas' }, 401);
    }
    if (err instanceof PersonaIdCollisionError) {
      return c.json({ error: err.message }, 409);
    }
    if (err instanceof PersonaNotOwnedError) {
      return c.json({ error: err.message }, 403);
    }
    throw err;
  }
});

personaRoutes.patch('/personas/:id', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const body = await c.req.json();
    const parsed = updatePersonaSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid persona payload', details: parsed.error.flatten() }, 400);
    }

    const record = await updatePersonaInDb(c.env.DB, userId, c.req.param('id'), parsed.data);
    return c.json({ persona: toPersonaOwnerDTO(record) });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    if (err instanceof PersonaNotOwnedError) {
      return c.json({ error: err.message }, 403);
    }
    throw err;
  }
});

personaRoutes.delete('/personas/:id', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const deleted = await softDeletePersona(c.env.DB, userId, c.req.param('id'));
    if (!deleted) return c.json({ error: 'Persona not found' }, 404);
    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    throw err;
  }
});

personaRoutes.post('/import/legacy', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const body = await c.req.json();
    const parsed = legacyImportSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid import payload', details: parsed.error.flatten() }, 400);
    }

    const userRow = await c.env.DB
      .prepare('SELECT legacy_imported_at FROM users WHERE id = ?')
      .bind(userId)
      .first<{ legacy_imported_at: string | null }>();

    const alreadyImported = Boolean(userRow?.legacy_imported_at);
    const result = await importLegacyData(c.env.DB, userId, parsed.data, alreadyImported);

    if (!result.skipped) {
      await c.env.DB
        .prepare('UPDATE users SET legacy_imported_at = ?, updated_at = ? WHERE id = ?')
        .bind(new Date().toISOString(), new Date().toISOString(), userId)
        .run();
    }

    return c.json({ result });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    throw err;
  }
});

personaRoutes.get('/me', async (c) => {
  const auth = await getAuthContext(c);
  return c.json({
    userId: auth.userId,
    authProvider: auth.authProvider,
    authProviderUserId: auth.authProviderUserId,
    isAuthenticated: auth.isAuthenticated,
  });
});

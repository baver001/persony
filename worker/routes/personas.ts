import { Hono } from 'hono';
import { toPersonaOwnerDTO, toPersonaPublicDTO } from '../domain/persona-dto';
import {
  ensureOfficialPersonasSeeded,
  getAccessiblePersona,
  listPublicPersonas,
  listUserPersonas,
  createPersonaInDb,
  updatePersonaInDb,
  softDeletePersona,
  SYSTEM_OWNER,
} from '../repositories/persona-repository';
import { createPersonaSchema, updatePersonaSchema } from '../lib/validation';
import {
  AuthRequiredError,
  getAuthContext,
  PersonaOwnershipError,
  requireUser,
} from '../middleware/auth';
import { requireAIEntitlement } from '../middleware/entitlement';
import type { PersonyEnv } from '../types/env';

export const personaRoutes = new Hono<{ Bindings: PersonyEnv }>();

personaRoutes.get('/personas', async (c) => {
  if (c.env.DB) await ensureOfficialPersonasSeeded(c.env.DB);
  const personas = await listPublicPersonas(c.env, c.env.DB);
  return c.json({ personas });
});

personaRoutes.get('/personas/mine', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ personas: [] });

    const records = await listUserPersonas(c.env.DB, userId);
    return c.json({
      personas: records.map((r) => toPersonaOwnerDTO(r)),
    });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

personaRoutes.get('/personas/:id', async (c) => {
  const auth = await getAuthContext(c);
  const persona = await getAccessiblePersona(c.env, c.env.DB, c.req.param('id'), auth.userId);
  if (!persona) return c.json({ error: 'Persona not found' }, 404);

  const isOwner = auth.userId && persona.ownerUserId === auth.userId;
  const isSystem = persona.ownerUserId === SYSTEM_OWNER;

  if (isOwner && !isSystem) {
    return c.json({ persona: toPersonaOwnerDTO(persona) });
  }

  return c.json({ persona: toPersonaPublicDTO(persona, isSystem) });
});

personaRoutes.post('/personas', async (c) => {
  try {
    const userId = await requireAIEntitlement(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const body = await c.req.json();
    const parsed = createPersonaSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid persona payload', details: parsed.error.flatten() }, 400);
    }

    const record = await createPersonaInDb(c.env.DB, userId, parsed.data);
    return c.json({ persona: toPersonaOwnerDTO(record) }, 201);
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

personaRoutes.patch('/personas/:id', async (c) => {
  try {
    const userId = await requireAIEntitlement(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const body = await c.req.json();
    const parsed = updatePersonaSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid persona payload', details: parsed.error.flatten() }, 400);
    }

    const record = await updatePersonaInDb(c.env.DB, userId, c.req.param('id'), parsed.data);
    return c.json({ persona: toPersonaOwnerDTO(record) });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    if (err instanceof PersonaOwnershipError) return c.json({ error: err.message }, 403);
    throw err;
  }
});

personaRoutes.delete('/personas/:id', async (c) => {
  try {
    const userId = await requireAIEntitlement(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    await softDeletePersona(c.env.DB, userId, c.req.param('id'));
    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    if (err instanceof PersonaOwnershipError) return c.json({ error: err.message }, 403);
    throw err;
  }
});

personaRoutes.get('/me', async (c) => {
  const auth = await getAuthContext(c);
  return c.json({
    userId: auth.userId,
    authProvider: auth.authProvider,
    isAuthenticated: auth.isAuthenticated,
  });
});

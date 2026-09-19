import { Hono } from 'hono';
import { toPersonaOwnerDTO, toPersonaPublicDTO } from '../domain/persona-dto';
import {
  ensureOfficialPersonasSeeded,
  getAccessiblePersona,
  findPublicPersonaBySlug,
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
import { clientIp, rateLimitMiddleware } from '../middleware/rate-limit';
import { enrichPersonaCreateInput, type PersonaPayload } from '../services/persona-spec-builder';
import type { PersonyEnv } from '../types/env';

export const personaRoutes = new Hono<{ Bindings: PersonyEnv }>();

personaRoutes.get(
  '/personas',
  rateLimitMiddleware({
    scope: 'public_personas',
    limit: 120,
    windowSec: 60,
    key: (c) => clientIp(c),
  }),
  async (c) => {
    if (c.env.DB) await ensureOfficialPersonasSeeded(c.env.DB);
    const locale = c.req.query('locale') === 'ru' ? 'ru' : 'en';
    const personas = await listPublicPersonas(c.env, c.env.DB, locale);
    const official = personas.filter((p) => p.isOfficial);
    const community = personas.filter((p) => !p.isOfficial);
    return c.json({ personas, official, community });
  }
);

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

personaRoutes.get(
  '/personas/by-slug/:slug',
  rateLimitMiddleware({
    scope: 'public_persona_slug',
    limit: 60,
    windowSec: 60,
    key: (c) => clientIp(c),
  }),
  async (c) => {
  const slug = c.req.param('slug');
  const locale = c.req.query('locale') === 'ru' ? 'ru' : 'en';
  const persona = await findPublicPersonaBySlug(c.env, c.env.DB, slug, locale);
  if (!persona) return c.json({ error: 'Persona not found' }, 404);
  return c.json({ persona });
  }
);

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

    const enriched = enrichPersonaCreateInput(parsed.data as PersonaPayload);
    const record = await createPersonaInDb(c.env.DB, userId, enriched);
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

    const enriched = enrichPersonaCreateInput(parsed.data as PersonaPayload, {
      slug: c.req.param('id'),
    });
    const record = await updatePersonaInDb(c.env.DB, userId, c.req.param('id'), enriched);
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


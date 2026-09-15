import { Hono } from 'hono';
import {
  ensureDefaultPersonasSeeded,
  getPersonaById,
  listPublicPersonas,
  upsertPersonaInDb,
} from '../repositories/persona-repository';
import { upsertPersonaSchema } from '../lib/validation';
import { AuthRequiredError, getAuthContext, requireUser } from '../middleware/auth';
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
  if (!isOwner && persona.ownerUserId !== 'system') {
    return c.json({
      persona: {
        id: persona.id,
        name: persona.name,
        tagline: persona.tagline,
        description: persona.description,
        avatarUrl: persona.avatarUrl,
        voice: persona.voice,
        category: persona.category,
        visibility: persona.visibility,
        badge: persona.badge,
        color: persona.color,
        starterMessages: persona.starterMessages,
      },
    });
  }

  return c.json({ persona });
});

personaRoutes.post('/personas', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) {
      return c.json({ error: 'Database not configured' }, 503);
    }

    await ensureDefaultPersonasSeeded(c.env.DB);
    const body = await c.req.json();
    const parsed = upsertPersonaSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid persona payload', details: parsed.error.flatten() }, 400);
    }

    const record = await upsertPersonaInDb(c.env.DB, userId, {
      id: parsed.data.id,
      name: parsed.data.name,
      tagline: parsed.data.tagline,
      description: parsed.data.description,
      systemPrompt: parsed.data.systemPrompt,
      avatarUrl: parsed.data.avatarUrl,
      voice: parsed.data.voice,
      category: parsed.data.category,
      badge: parsed.data.badge,
      color: parsed.data.color,
      starterMessages: parsed.data.starterMessages,
      visibility: parsed.data.visibility,
      sourcePersonaId: parsed.data.sourcePersonaId,
    });

    return c.json({ persona: record });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return c.json({ error: 'Authentication required to save custom personas' }, 401);
    }
    throw err;
  }
});

personaRoutes.get('/me', async (c) => {
  const auth = await getAuthContext(c);
  return c.json({
    userId: auth.userId,
    isAuthenticated: auth.isAuthenticated,
  });
});

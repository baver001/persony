import { Hono } from 'hono';
import { createRoomConversationSchema } from '../lib/validation';
import { AuthRequiredError, requireUser } from '../middleware/auth';
import {
  createRoomConversation,
  listConversationPersonas,
  listRoomConversationsForUser,
} from '../repositories/conversation-repository';
import { ensureOfficialPersonasSeeded, getAccessiblePersona } from '../repositories/persona-repository';
import type { PersonyEnv } from '../types/env';

export const roomRoutes = new Hono<{ Bindings: PersonyEnv }>();

roomRoutes.get('/rooms', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ rooms: [] });

    const rooms = await listRoomConversationsForUser(c.env.DB, userId);
    const enriched = await Promise.all(
      rooms.map(async (room) => ({
        ...room,
        participants: await listConversationPersonas(c.env.DB!, room.id),
      }))
    );

    return c.json({ rooms: enriched });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

roomRoutes.post('/rooms', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    await ensureOfficialPersonasSeeded(c.env.DB);
    const body = await c.req.json();
    const parsed = createRoomConversationSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Invalid room payload' }, 400);

    const uniqueIds = [...new Set(parsed.data.personaIds)];
    if (uniqueIds.length < 2) {
      return c.json({ error: 'Room requires at least two distinct personas' }, 400);
    }

    const personas = [];
    for (const personaId of uniqueIds) {
      const persona = await getAccessiblePersona(c.env, c.env.DB, personaId, userId);
      if (!persona) return c.json({ error: `Persona not found: ${personaId}` }, 404);
      personas.push({ personaId: persona.id, personaVersion: persona.currentVersion });
    }

    const room = await createRoomConversation(c.env.DB, userId, parsed.data.title, personas);
    const participants = await listConversationPersonas(c.env.DB, room.id);

    return c.json({ room: { ...room, participants } }, 201);
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

roomRoutes.get('/rooms/:id', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const rooms = await listRoomConversationsForUser(c.env.DB, userId);
    const room = rooms.find((r) => r.id === c.req.param('id'));
    if (!room) return c.json({ error: 'Room not found' }, 404);

    const participants = await listConversationPersonas(c.env.DB, room.id);
    return c.json({ room: { ...room, participants } });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

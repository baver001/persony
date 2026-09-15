import { Hono } from 'hono';
import { z } from 'zod';
import { requireAIEntitlement } from '../middleware/ai-entitlement';
import { AuthRequiredError, requireUser } from '../middleware/auth';
import { createRoom, handleRoomMessage } from '../services/room-service';
import type { PersonyEnv } from '../types/env';

const createRoomSchema = z.object({
  title: z.string().min(1).max(120),
  personas: z.array(z.object({ personaId: z.string(), role: z.string().optional() })).min(2).max(6),
});

const roomMessageSchema = z.object({
  text: z.string().min(1).max(32_000),
  askTeam: z.boolean().optional(),
});

export const roomRoutes = new Hono<{ Bindings: PersonyEnv }>();

roomRoutes.post('/rooms', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const body = await c.req.json();
    const parsed = createRoomSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

    const roomId = await createRoom(c.env.DB, userId, parsed.data.title, parsed.data.personas);
    return c.json({ roomId }, 201);
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

roomRoutes.post('/rooms/:id/messages', async (c) => {
  try {
    const userId = await requireAIEntitlement(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const body = await c.req.json();
    const parsed = roomMessageSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

    const result = await handleRoomMessage(c.env, {
      userId,
      conversationId: c.req.param('id'),
      text: parsed.data.text,
      askTeam: parsed.data.askTeam,
    });

    if (result instanceof ReadableStream) {
      return new Response(result, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    return c.json(result);
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ error: err instanceof Error ? err.message : 'Room error' }, 400);
  }
});

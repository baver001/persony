import { Hono } from 'hono';
import { z } from 'zod';
import { AuthRequiredError, requireUser } from '../middleware/auth';
import { deleteMemory, listMemories, upsertMemory } from '../repositories/memory-repository';
import type { PersonyEnv } from '../types/env';

const updateMemorySchema = z.object({
  content: z.string().min(1).max(2000),
  kind: z.enum(['fact', 'preference', 'goal', 'project', 'decision', 'relationship', 'summary', 'open_task']).optional(),
  scope: z.enum(['user', 'persona_relationship', 'room']).optional(),
  personaId: z.string().optional(),
  conversationId: z.string().optional(),
});

export const memoryRoutes = new Hono<{ Bindings: PersonyEnv }>();

memoryRoutes.get('/memory', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const scope = c.req.query('scope');
    const personaId = c.req.query('personaId');
    const conversationId = c.req.query('conversationId');

    const memories = await listMemories(c.env.DB, userId, {
      scope: scope as 'user' | 'persona_relationship' | 'room' | undefined,
      personaId,
      conversationId,
    });

    return c.json({ memories });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

memoryRoutes.post('/memory', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const body = await c.req.json();
    const parsed = updateMemorySchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

    const memory = await upsertMemory(c.env.DB, {
      userId,
      scope: parsed.data.scope || 'user',
      kind: parsed.data.kind || 'fact',
      content: parsed.data.content,
      personaId: parsed.data.personaId,
      conversationId: parsed.data.conversationId,
    });

    return c.json({ memory });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

memoryRoutes.delete('/memory/:id', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const deleted = await deleteMemory(c.env.DB, userId, c.req.param('id'));
    if (!deleted) return c.json({ error: 'Not found' }, 404);
    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

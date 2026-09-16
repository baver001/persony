import { Hono } from 'hono';
import { z } from 'zod';
import { AuthRequiredError, requireUser } from '../middleware/auth';
import {
  getMemoryForUser,
  listMemoriesForUser,
  setMemoryStatus,
  updateMemoryContent,
} from '../repositories/memory-repository';
import type { PersonyEnv } from '../types/env';

const updateMemorySchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  status: z.enum(['active', 'disabled', 'deleted']).optional(),
});

export const memoryRoutes = new Hono<{ Bindings: PersonyEnv }>();

memoryRoutes.get('/memories', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const scope = c.req.query('scope');
    const personaId = c.req.query('personaId');

    const memories = await listMemoriesForUser(c.env.DB, userId, {
      scope: scope === 'user' || scope === 'relationship' || scope === 'room' ? scope : undefined,
      personaId: personaId || undefined,
    });

    return c.json({ memories });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error_code: 'AUTH_REQUIRED' }, 401);
    return c.json({ error_code: 'INTERNAL_ERROR' }, 500);
  }
});

memoryRoutes.patch('/memories/:id', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const body = await c.req.json();
    const parsed = updateMemorySchema.safeParse(body);
    if (!parsed.success) return c.json({ error_code: 'INVALID_PAYLOAD' }, 400);

    const memoryId = c.req.param('id');
    const existing = await getMemoryForUser(c.env.DB, memoryId, userId);
    if (!existing) return c.json({ error_code: 'MEMORY_NOT_FOUND' }, 404);

    if (parsed.data.content) {
      await updateMemoryContent(c.env.DB, memoryId, userId, parsed.data.content);
    }
    if (parsed.data.status) {
      await setMemoryStatus(c.env.DB, memoryId, userId, parsed.data.status);
    }

    const updated = await getMemoryForUser(c.env.DB, memoryId, userId);
    return c.json({ memory: updated });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error_code: 'AUTH_REQUIRED' }, 401);
    return c.json({ error_code: 'INTERNAL_ERROR' }, 500);
  }
});

import { Hono } from 'hono';
import { createConversationSchema, conversationMessageSchema } from '../lib/validation';
import { AuthRequiredError, requireUser } from '../middleware/auth';
import { requireAIEntitlement } from '../middleware/entitlement';
import {
  createDirectConversation,
  getConversationForUser,
  listConversationsForUser,
  softDeleteConversation,
} from '../repositories/conversation-repository';
import { listMessages } from '../repositories/message-repository';
import { ensureDefaultPersonasSeeded, getAccessiblePersona } from '../repositories/persona-repository';
import {
  ConversationAccessError,
  InferenceInProgressError,
  streamConversationReply,
} from '../services/chat-service';
import { PersonaNotFoundError } from '../services/persona-service';
import type { PersonyEnv } from '../types/env';

export const conversationRoutes = new Hono<{ Bindings: PersonyEnv }>();

conversationRoutes.get('/conversations', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ conversations: [] });
    const conversations = await listConversationsForUser(c.env.DB, userId);
    return c.json({ conversations });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

conversationRoutes.post('/conversations', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    await ensureDefaultPersonasSeeded(c.env.DB);
    const body = await c.req.json();
    const parsed = createConversationSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

    const persona = await getAccessiblePersona(c.env, c.env.DB, parsed.data.personaId, userId);
    if (!persona) return c.json({ error: 'Persona not found' }, 404);

    const conversation = await createDirectConversation(
      c.env.DB,
      userId,
      persona.id,
      persona.currentVersion,
      parsed.data.title
    );

    return c.json({ conversation }, 201);
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

conversationRoutes.get('/conversations/:id', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const conversation = await getConversationForUser(c.env.DB, c.req.param('id'), userId);
    if (!conversation) return c.json({ error: 'Not found' }, 404);
    return c.json({ conversation });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

conversationRoutes.get('/conversations/:id/messages', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const conversationId = c.req.param('id');
    const conversation = await getConversationForUser(c.env.DB, conversationId, userId);
    if (!conversation) return c.json({ error: 'Not found' }, 404);

    const limit = Number(c.req.query('limit') || 50);
    const before = c.req.query('before') || undefined;
    const messages = await listMessages(c.env.DB, conversationId, limit, before);

    return c.json({ messages });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

conversationRoutes.post('/conversations/:id/messages', async (c) => {
  try {
    const userId = await requireAIEntitlement(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const body = await c.req.json();
    const parsed = conversationMessageSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Invalid message payload' }, 400);

    const stream = await streamConversationReply(
      c.env,
      userId,
      c.req.param('id'),
      parsed.data.text,
      parsed.data.clientRequestId,
      parsed.data.modelText
    );

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    if (err instanceof ConversationAccessError) return c.json({ error: err.message }, 403);
    if (err instanceof InferenceInProgressError) return c.json({ error: err.message }, 409);
    if (err instanceof PersonaNotFoundError) return c.json({ error: err.message }, 404);
    throw err;
  }
});

conversationRoutes.delete('/conversations/:id', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const ok = await softDeleteConversation(c.env.DB, c.req.param('id'), userId);
    if (!ok) return c.json({ error: 'Not found' }, 404);
    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

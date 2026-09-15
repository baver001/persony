import { Hono } from 'hono';
import { toConversationDTO, toMessageDTO } from '../domain/conversation';
import { sendMessageSchema, createConversationSchema } from '../lib/validation';
import { InsufficientEnergyError } from '../middleware/ai-entitlement';
import { AuthRequiredError, requireUser } from '../middleware/auth';
import {
  deleteConversation,
  listConversations,
  touchConversation,
} from '../repositories/conversation-repository';
import {
  ConversationNotFoundError,
  getOrCreateDirectConversation,
  loadConversationMessages,
  persistPersonaMessage,
  persistUserMessage,
} from '../services/conversation-service';
import { buildInferenceMessages, assertConversationOwner } from '../services/conversation-service';
import { PersonaNotFoundError, resolvePersonaForInference } from '../services/persona-service';
import { runChatInference } from '../services/inference-service';
import { buildAugmentedSystemPrompt, extractMemoriesFromExchange } from '../services/memory-service';
import type { PersonyEnv } from '../types/env';
import { requireAIEntitlement } from '../middleware/ai-entitlement';

export const conversationRoutes = new Hono<{ Bindings: PersonyEnv }>();

conversationRoutes.get('/conversations', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const conversations = await listConversations(c.env.DB, userId);
    return c.json({ conversations: conversations.map(toConversationDTO) });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    throw err;
  }
});

conversationRoutes.post('/conversations', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const body = await c.req.json();
    const parsed = createConversationSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid payload', details: parsed.error.flatten() }, 400);
    }

    const conversation = await getOrCreateDirectConversation(
      c.env.DB,
      userId,
      parsed.data.personaId
    );
    return c.json({ conversation: toConversationDTO(conversation) });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    if (err instanceof PersonaNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    throw err;
  }
});

conversationRoutes.get('/conversations/:id', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const conversation = await assertConversationOwner(c.env.DB, c.req.param('id'), userId);
    return c.json({ conversation: toConversationDTO(conversation) });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    if (err instanceof ConversationNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    throw err;
  }
});

conversationRoutes.delete('/conversations/:id', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const deleted = await deleteConversation(c.env.DB, c.req.param('id'), userId);
    if (!deleted) return c.json({ error: 'Conversation not found' }, 404);
    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    throw err;
  }
});

conversationRoutes.get('/conversations/:id/messages', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const messages = await loadConversationMessages(c.env.DB, c.req.param('id'), userId);
    return c.json({ messages: messages.map(toMessageDTO) });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    if (err instanceof ConversationNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    throw err;
  }
});

conversationRoutes.post('/conversations/:id/messages', async (c) => {
  try {
    const userId = await requireAIEntitlement(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const conversationId = c.req.param('id');
    const conversation = await assertConversationOwner(c.env.DB, conversationId, userId);

    const body = await c.req.json();
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid message payload', details: parsed.error.flatten() }, 400);
    }

    const personaId = conversation.personaId;
    if (!personaId) {
      return c.json({ error: 'Conversation has no linked persona' }, 400);
    }

    const persona = await resolvePersonaForInference(c.env, personaId, userId);
    await persistUserMessage(c.env.DB, conversationId, userId, parsed.data.text);
    const history = await buildInferenceMessages(c.env.DB, conversationId, userId);

    const systemPrompt = await buildAugmentedSystemPrompt(
      c.env,
      userId,
      persona.systemPrompt,
      personaId,
      conversationId
    );

    const stream = await runChatInference(c.env, {
      userId,
      systemPrompt,
      messages: history,
      conversationId,
      personaId,
    });

    const [clientStream, teeStream] = stream.tee();
    const reader = teeStream.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';

    void (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6)) as { text?: string };
              if (data.text) accumulated += data.text;
            } catch {
              // ignore malformed SSE lines
            }
          }
        }
        if (accumulated.trim()) {
          await persistPersonaMessage(c.env.DB!, conversationId, personaId, accumulated.trim());
          await touchConversation(c.env.DB!, conversationId);
          await extractMemoriesFromExchange(c.env, {
            userId,
            personaId,
            conversationId,
            userText: parsed.data.text,
            assistantText: accumulated.trim(),
          });
        }
      } catch (err) {
        console.error('Failed to persist assistant message:', err);
      } finally {
        reader.releaseLock();
      }
    })();

    return new Response(clientStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    if (err instanceof InsufficientEnergyError) {
      return c.json({ error: err.message, code: 'energy_empty' }, 402);
    }
    if (err instanceof ConversationNotFoundError || err instanceof PersonaNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    throw err;
  }
});

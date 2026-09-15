import { Hono } from 'hono';
import { handleChat } from '../lib/gemini';
import { chatRequestSchema } from '../lib/validation';
import { requireAIEntitlement } from '../middleware/ai-entitlement';
import { AuthRequiredError } from '../middleware/auth';
import { touchConversation } from '../repositories/conversation-repository';
import {
  assertConversationOwner,
  buildInferenceMessages,
  getOrCreateDirectConversation,
  persistPersonaMessage,
  persistUserMessage,
} from '../services/conversation-service';
import { ConversationNotFoundError } from '../services/conversation-service';
import { PersonaNotFoundError, resolvePersonaForInference } from '../services/persona-service';
import type { PersonyEnv } from '../types/env';

export const chatRoutes = new Hono<{ Bindings: PersonyEnv }>();

chatRoutes.post('/chat', async (c) => {
  try {
    const userId = await requireAIEntitlement(c);

    const body = await c.req.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid chat payload', details: parsed.error.flatten() }, 400);
    }

    const { conversationId, personaId, text, messages } = parsed.data;

    // Server-authoritative path: conversationId + text
    if (conversationId && text && c.env.DB) {
      const conversation = await assertConversationOwner(c.env.DB, conversationId, userId);
      const resolvedPersonaId = conversation.personaId ?? personaId;
      if (!resolvedPersonaId) {
        return c.json({ error: 'Conversation has no linked persona' }, 400);
      }

      const persona = await resolvePersonaForInference(c.env, resolvedPersonaId, userId);
      await persistUserMessage(c.env.DB, conversationId, userId, text);
      const history = await buildInferenceMessages(c.env.DB, conversationId, userId);

      const stream = await handleChat(c.env.GEMINI_API_KEY, persona.systemPrompt, history);
      return streamAndPersistAssistant(c.env, stream, conversationId, resolvedPersonaId);
    }

    // Legacy path: personaId + messages (still requires auth; deprecated for cloud clients)
    if (!personaId || !messages?.length) {
      return c.json(
        { error: 'Provide conversationId+text or personaId+messages' },
        400
      );
    }

    const persona = await resolvePersonaForInference(c.env, personaId, userId);
    const normalizedMessages = messages.map((m) => ({
      sender: m.sender === 'model' ? 'character' : m.sender,
      text: m.text,
    }));

    if (c.env.DB) {
      const conversation = await getOrCreateDirectConversation(c.env.DB, userId, personaId);
      const lastUser = normalizedMessages[normalizedMessages.length - 1];
      if (lastUser?.sender === 'user') {
        await persistUserMessage(c.env.DB, conversation.id, userId, lastUser.text);
      }
      const stream = await handleChat(c.env.GEMINI_API_KEY, persona.systemPrompt, normalizedMessages);
      return streamAndPersistAssistant(c.env, stream, conversation.id, personaId);
    }

    const stream = await handleChat(c.env.GEMINI_API_KEY, persona.systemPrompt, normalizedMessages);
    return new Response(stream, {
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
    if (err instanceof PersonaNotFoundError || err instanceof ConversationNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    throw err;
  }
});

function streamAndPersistAssistant(
  env: PersonyEnv,
  stream: ReadableStream<Uint8Array>,
  conversationId: string,
  personaId: string
): Response {
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
      if (accumulated.trim() && env.DB) {
        await persistPersonaMessage(env.DB, conversationId, personaId, accumulated.trim());
        await touchConversation(env.DB, conversationId);
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
}

import { Hono } from 'hono';
import { handleChat } from '../lib/gemini';
import { chatRequestSchema } from '../lib/validation';
import { getAuthContext } from '../middleware/auth';
import { PersonaNotFoundError, resolvePersonaForInference } from '../services/persona-service';
import type { PersonyEnv } from '../types/env';

export const chatRoutes = new Hono<{ Bindings: PersonyEnv }>();

chatRoutes.post('/chat', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid chat payload', details: parsed.error.flatten() }, 400);
    }

    const auth = await getAuthContext(c);
    const persona = await resolvePersonaForInference(c.env, parsed.data.personaId, auth.userId);

    const messages = parsed.data.messages.map((m) => ({
      sender: m.sender === 'model' ? 'character' : m.sender,
      text: m.text,
    }));

    const stream = await handleChat(c.env.GEMINI_API_KEY, persona.systemPrompt, messages);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    if (err instanceof PersonaNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    throw err;
  }
});

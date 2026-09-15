import { Hono } from 'hono';
import { formatCleanErrorMessage } from '../lib/errors';
import { handleGenerateCharacter, handleTranscribe } from '../lib/gemini';
import { generateCharacterSchema, transcribeRequestSchema } from '../lib/validation';
import { requireAIEntitlement } from '../middleware/ai-entitlement';
import { AuthRequiredError } from '../middleware/auth';
import type { PersonyEnv } from '../types/env';
import { chatRoutes } from './chat';
import { conversationRoutes } from './conversations';
import { healthRoutes } from './health';
import { personaRoutes } from './personas';

export const apiRoutes = new Hono<{ Bindings: PersonyEnv }>();

apiRoutes.route('/', healthRoutes);
apiRoutes.route('/', chatRoutes);
apiRoutes.route('/', conversationRoutes);
apiRoutes.route('/', personaRoutes);

apiRoutes.post('/transcribe', async (c) => {
  try {
    await requireAIEntitlement(c);

    const body = await c.req.json();
    const parsed = transcribeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid transcribe payload' }, 400);
    }
    const result = await handleTranscribe(
      c.env.GEMINI_API_KEY,
      parsed.data.audioBase64,
      parsed.data.mimeType
    );
    return c.json(result);
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    return c.json({ error: formatCleanErrorMessage(err) }, 500);
  }
});

apiRoutes.post('/generate-character', async (c) => {
  try {
    await requireAIEntitlement(c);

    const body = await c.req.json();
    const parsed = generateCharacterSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Prompt is required' }, 400);
    }
    const result = await handleGenerateCharacter(c.env.GEMINI_API_KEY, parsed.data.prompt);
    return c.json(result);
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    return c.json({ error: formatCleanErrorMessage(err) }, 500);
  }
});

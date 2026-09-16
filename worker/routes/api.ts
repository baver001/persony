import { Hono } from 'hono';
import { formatCleanErrorMessage } from '../lib/errors';
import { handleGenerateCharacter, handleTranscribe } from '../lib/gemini';
import { generateCharacterSchema, transcribeRequestSchema } from '../lib/validation';
import { AuthRequiredError } from '../middleware/auth';
import { bodySizeLimit } from '../middleware/body-limit';
import { requireAIEntitlement } from '../middleware/entitlement';
import type { PersonyEnv } from '../types/env';
import { conversationRoutes } from './conversations';
import { healthRoutes } from './health';
import { importRoutes } from './import';
import { meRoutes } from './me';
import { memoryRoutes } from './memories';
import { ownerRoutes } from './owner';
import { personaRoutes } from './personas';

export const apiRoutes = new Hono<{ Bindings: PersonyEnv }>();

apiRoutes.use('*', bodySizeLimit(10 * 1024 * 1024));

apiRoutes.route('/', healthRoutes);
apiRoutes.route('/', personaRoutes);
apiRoutes.route('/', conversationRoutes);
apiRoutes.route('/', importRoutes);
apiRoutes.route('/', memoryRoutes);
apiRoutes.route('/', meRoutes);
apiRoutes.route('/', ownerRoutes);

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
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
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
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ error: formatCleanErrorMessage(err) }, 500);
  }
});

import { Hono } from 'hono';
import { formatCleanErrorMessage } from '../lib/errors';
import { generateCharacterSchema, transcribeRequestSchema } from '../lib/validation';
import { requireAIEntitlement } from '../middleware/ai-entitlement';
import { InsufficientEnergyError } from '../middleware/ai-entitlement';
import { AuthRequiredError } from '../middleware/auth';
import { runGenerateCharacter, runTranscribe } from '../services/inference-service';
import type { PersonyEnv } from '../types/env';
import { billingRoutes } from './billing';
import { byokRoutes } from './byok';
import { catalogRoutes } from './catalog';
import { chatRoutes } from './chat';
import { conversationRoutes } from './conversations';
import { healthRoutes } from './health';
import { memoryRoutes } from './memory';
import { personaRoutes } from './personas';
import { roomRoutes } from './rooms';

export const apiRoutes = new Hono<{ Bindings: PersonyEnv }>();

apiRoutes.route('/', healthRoutes);
apiRoutes.route('/', chatRoutes);
apiRoutes.route('/', conversationRoutes);
apiRoutes.route('/', personaRoutes);
apiRoutes.route('/', billingRoutes);
apiRoutes.route('/', memoryRoutes);
apiRoutes.route('/', roomRoutes);
apiRoutes.route('/', catalogRoutes);
apiRoutes.route('/', byokRoutes);

apiRoutes.post('/transcribe', async (c) => {
  try {
    const userId = await requireAIEntitlement(c);

    const body = await c.req.json();
    const parsed = transcribeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid transcribe payload' }, 400);
    }
    const result = await runTranscribe(
      c.env,
      userId,
      parsed.data.audioBase64,
      parsed.data.mimeType
    );
    return c.json(result);
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    if (err instanceof InsufficientEnergyError) {
      return c.json({ error: err.message, code: 'energy_empty' }, 402);
    }
    return c.json({ error: formatCleanErrorMessage(err) }, 500);
  }
});

apiRoutes.post('/generate-character', async (c) => {
  try {
    const userId = await requireAIEntitlement(c);

    const body = await c.req.json();
    const parsed = generateCharacterSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Prompt is required' }, 400);
    }
    const result = await runGenerateCharacter(c.env, userId, parsed.data.prompt);
    return c.json(result);
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    if (err instanceof InsufficientEnergyError) {
      return c.json({ error: err.message, code: 'energy_empty' }, 402);
    }
    return c.json({ error: formatCleanErrorMessage(err) }, 500);
  }
});

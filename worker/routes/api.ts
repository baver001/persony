import { Hono } from 'hono';
import { formatCleanErrorMessage } from '../lib/errors';
import {
  handleGenerateAvatar,
  handleGenerateCharacter,
  handleSummarizeCall,
  handleTranscribe,
} from '../lib/gemini';
import {
  generateAvatarSchema,
  generateCharacterSchema,
  summarizeCallSchema,
  transcribeRequestSchema,
} from '../lib/validation';
import { bodySizeLimit } from '../middleware/body-limit';
import { getAuthContext } from '../middleware/auth';
import { requireAIEntitlement } from '../middleware/entitlement';
import { mapApiError } from '../lib/api-errors';
import { clientIp, rateLimitMiddleware } from '../middleware/rate-limit';
import { withEnergyReservation } from '../services/energy-service';
import type { PersonyEnv } from '../types/env';
import { conversationRoutes } from './conversations';
import { healthRoutes } from './health';
import { importRoutes } from './import';
import { meRoutes } from './me';
import { memoryRoutes } from './memories';
import { ownerRoutes } from './owner';
import { personaRoutes } from './personas';
import { billingRoutes } from './billing';
import { roomRoutes } from './rooms';

export const apiRoutes = new Hono<{ Bindings: PersonyEnv }>();

apiRoutes.use('*', bodySizeLimit(10 * 1024 * 1024));

apiRoutes.route('/', healthRoutes);
apiRoutes.route('/', personaRoutes);
apiRoutes.route('/', conversationRoutes);
apiRoutes.route('/', importRoutes);
apiRoutes.route('/', memoryRoutes);
apiRoutes.route('/', meRoutes);
apiRoutes.route('/', ownerRoutes);
apiRoutes.route('/', billingRoutes);
apiRoutes.route('/', roomRoutes);

const aiUserRateLimit = rateLimitMiddleware({
  scope: 'ai_endpoint',
  limit: 30,
  windowSec: 60,
  key: async (c) => {
    const auth = await getAuthContext(c);
    return auth.userId || clientIp(c);
  },
});

const aiHeavyRateLimit = rateLimitMiddleware({
  scope: 'ai_heavy',
  limit: 12,
  windowSec: 60,
  key: async (c) => {
    const auth = await getAuthContext(c);
    return auth.userId || clientIp(c);
  },
});

apiRoutes.post('/transcribe', aiUserRateLimit, async (c) => {
  try {
    const userId = await requireAIEntitlement(c);
    const body = await c.req.json();
    const parsed = transcribeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid transcribe payload' }, 400);
    }
    const result = await withEnergyReservation(
      c.env.DB,
      userId,
      'voice_transcription',
      () =>
        handleTranscribe(
          c.env.GEMINI_API_KEY,
          parsed.data.audioBase64,
          parsed.data.mimeType
        )
    );
    return c.json(result);
  } catch (err) {
    const mapped = mapApiError(err, formatCleanErrorMessage(err));
    return c.json(mapped.body, mapped.status as 401 | 402 | 429 | 500);
  }
});

apiRoutes.post('/generate-character', aiHeavyRateLimit, async (c) => {
  try {
    const userId = await requireAIEntitlement(c);
    const body = await c.req.json();
    const parsed = generateCharacterSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Prompt is required' }, 400);
    }
    const result = await withEnergyReservation(
      c.env.DB,
      userId,
      'generate_character',
      () => handleGenerateCharacter(c.env.GEMINI_API_KEY, parsed.data.prompt)
    );
    return c.json(result);
  } catch (err) {
    const mapped = mapApiError(err, formatCleanErrorMessage(err));
    return c.json(mapped.body, mapped.status as 401 | 402 | 429 | 500);
  }
});

apiRoutes.post('/summarize-call', aiUserRateLimit, async (c) => {
  try {
    const userId = await requireAIEntitlement(c);
    const body = await c.req.json();
    const parsed = summarizeCallSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid summarize-call payload' }, 400);
    }
    const result = await withEnergyReservation(
      c.env.DB,
      userId,
      'summarize_call',
      () => handleSummarizeCall(c.env.GEMINI_API_KEY, parsed.data)
    );
    return c.json(result);
  } catch (err) {
    const mapped = mapApiError(err, formatCleanErrorMessage(err));
    return c.json(mapped.body, mapped.status as 401 | 402 | 429 | 500);
  }
});

apiRoutes.post('/generate-avatar', aiHeavyRateLimit, async (c) => {
  try {
    const userId = await requireAIEntitlement(c);
    const body = await c.req.json();
    const parsed = generateAvatarSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Prompt is required' }, 400);
    }
    const result = await withEnergyReservation(
      c.env.DB,
      userId,
      'generate_avatar',
      () =>
        handleGenerateAvatar(
          c.env.GEMINI_API_KEY,
          parsed.data.prompt,
          parsed.data.personaName
        )
    );
    return c.json(result);
  } catch (err) {
    const mapped = mapApiError(err, formatCleanErrorMessage(err));
    return c.json(mapped.body, mapped.status as 401 | 402 | 429 | 500);
  }
});

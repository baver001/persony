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
import { runAvatarWithInference } from '../services/avatar-inference-service';
import { runTranscribeWithInference } from '../services/transcribe-inference-service';
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
    if (c.env.DB && parsed.data.personaId && parsed.data.clientRequestId) {
      const tracked = await runTranscribeWithInference(
        c.env.DB,
        userId,
        c.env.GEMINI_API_KEY,
        {
          audioBase64: parsed.data.audioBase64,
          mimeType: parsed.data.mimeType,
          personaId: parsed.data.personaId,
          clientRequestId: `${parsed.data.clientRequestId}:transcribe`,
          conversationId: parsed.data.conversationId,
        }
      );
      return c.json({ transcript: tracked.transcript });
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
    return c.json({ transcript: result.transcript });
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
      'persona_generation',
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
      'call_summary',
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
    if (c.env.DB && parsed.data.personaId && parsed.data.clientRequestId) {
      const tracked = await runAvatarWithInference(c.env.DB, userId, c.env.GEMINI_API_KEY, {
        prompt: parsed.data.prompt,
        personaName: parsed.data.personaName,
        personaId: parsed.data.personaId,
        clientRequestId: parsed.data.clientRequestId,
      });
      return c.json({ imageDataUrl: tracked.imageDataUrl });
    }

    const result = await withEnergyReservation(
      c.env.DB,
      userId,
      'avatar_generation',
      () =>
        handleGenerateAvatar(
          c.env.GEMINI_API_KEY,
          parsed.data.prompt,
          parsed.data.personaName
        )
    );
    return c.json({ imageDataUrl: result.imageDataUrl });
  } catch (err) {
    const mapped = mapApiError(err, formatCleanErrorMessage(err));
    return c.json(mapped.body, mapped.status as 401 | 402 | 429 | 500);
  }
});

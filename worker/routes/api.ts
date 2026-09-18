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
import { generateId } from '../lib/ids';
import { bodySizeLimit } from '../middleware/body-limit';
import { requireAIEntitlement } from '../middleware/entitlement';
import { mapApiError } from '../lib/api-errors';
import { chargeBatteryForInference } from '../services/energy-service';
import type { PersonyEnv } from '../types/env';
import { conversationRoutes } from './conversations';
import { healthRoutes } from './health';
import { importRoutes } from './import';
import { meRoutes } from './me';
import { memoryRoutes } from './memories';
import { ownerRoutes } from './owner';
import { personaRoutes } from './personas';
import { billingRoutes } from './billing';

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

apiRoutes.post('/transcribe', async (c) => {
  try {
    const userId = await requireAIEntitlement(c);
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
    if (c.env.DB) {
      await chargeBatteryForInference(c.env.DB, userId, generateId(), 'voice_transcription').catch(
        () => undefined
      );
    }
    return c.json(result);
  } catch (err) {
    const mapped = mapApiError(err, formatCleanErrorMessage(err));
    return c.json(mapped.body, mapped.status as 401 | 402 | 500);
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
    const result = await handleGenerateCharacter(c.env.GEMINI_API_KEY, parsed.data.prompt);
    if (c.env.DB) {
      await chargeBatteryForInference(c.env.DB, userId, generateId(), 'generate_character').catch(
        () => undefined
      );
    }
    return c.json(result);
  } catch (err) {
    const mapped = mapApiError(err, formatCleanErrorMessage(err));
    return c.json(mapped.body, mapped.status as 401 | 402 | 500);
  }
});

apiRoutes.post('/summarize-call', async (c) => {
  try {
    const userId = await requireAIEntitlement(c);
    const body = await c.req.json();
    const parsed = summarizeCallSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid summarize-call payload' }, 400);
    }
    const result = await handleSummarizeCall(c.env.GEMINI_API_KEY, parsed.data);
    if (c.env.DB) {
      await chargeBatteryForInference(c.env.DB, userId, generateId(), 'summarize_call').catch(
        () => undefined
      );
    }
    return c.json(result);
  } catch (err) {
    const mapped = mapApiError(err, formatCleanErrorMessage(err));
    return c.json(mapped.body, mapped.status as 401 | 402 | 500);
  }
});

apiRoutes.post('/generate-avatar', async (c) => {
  try {
    const userId = await requireAIEntitlement(c);
    const body = await c.req.json();
    const parsed = generateAvatarSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Prompt is required' }, 400);
    }
    const result = await handleGenerateAvatar(
      c.env.GEMINI_API_KEY,
      parsed.data.prompt,
      parsed.data.personaName
    );
    if (c.env.DB) {
      await chargeBatteryForInference(c.env.DB, userId, generateId(), 'generate_avatar').catch(
        () => undefined
      );
    }
    return c.json(result);
  } catch (err) {
    const mapped = mapApiError(err, formatCleanErrorMessage(err));
    return c.json(mapped.body, mapped.status as 401 | 402 | 500);
  }
});

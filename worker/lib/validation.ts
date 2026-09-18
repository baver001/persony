import { z } from 'zod';

export const MAX_CHAT_MESSAGE_CHARS = 50_000;
export const MAX_TRANSCRIBE_BASE64_CHARS = 8_000_000;
export const MAX_WS_JSON_BYTES = 256_000;
export const MAX_WS_AUDIO_CHUNK_CHARS = 512_000;

export const conversationMessageSchema = z
  .object({
    text: z.string().min(1).max(MAX_CHAT_MESSAGE_CHARS),
    clientRequestId: z.string().min(1).max(128).optional(),
    idempotencyKey: z.string().min(1).max(128).optional(),
    modelText: z.string().min(1).max(MAX_CHAT_MESSAGE_CHARS).optional(),
  })
  .transform((data) => ({
    text: data.text,
    modelText: data.modelText,
    clientRequestId: data.clientRequestId || data.idempotencyKey,
  }))
  .refine((data) => Boolean(data.clientRequestId), {
    message: 'clientRequestId is required',
  });

export const messageFeedbackSchema = z.object({
  feedback: z.enum(['up', 'down']),
});

export const createConversationSchema = z.object({
  personaId: z.string().min(1).max(128),
  title: z.string().max(200).optional(),
});

export const createRoomConversationSchema = z.object({
  title: z.string().min(1).max(120),
  personaIds: z.array(z.string().min(1).max(128)).min(2).max(4),
});

const behaviorProfileSchema = z.object({
  warmth: z.number().min(0).max(100).optional(),
  directness: z.number().min(0).max(100).optional(),
  creativity: z.number().min(0).max(100).optional(),
  formality: z.number().min(0).max(100).optional(),
  verbosity: z.number().min(0).max(100).optional(),
  humor: z.number().min(0).max(100).optional(),
});

export const createPersonaSchema = z.object({
  name: z.string().min(1).max(120),
  tagline: z.string().max(200).optional().default(''),
  description: z.string().max(2000).optional().default(''),
  systemPrompt: z.string().min(1).max(32_000),
  avatarUrl: z.string().max(4096),
  voice: z.string().min(1).max(32),
  category: z.string().min(1).max(32),
  badge: z.string().max(64).optional(),
  color: z.string().max(32).optional(),
  starterMessages: z.array(z.string().max(500)).max(10).optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
  sourcePersonaId: z.string().max(128).optional(),
  behaviorProfile: behaviorProfileSchema.optional(),
  configurationJson: z.string().max(32_000).optional(),
});

export const updatePersonaSchema = createPersonaSchema;

export const transcribeRequestSchema = z.object({
  audioBase64: z.string().min(1).max(MAX_TRANSCRIBE_BASE64_CHARS),
  mimeType: z.string().max(64).optional(),
  personaId: z.string().min(1).max(64).optional(),
  clientRequestId: z.string().min(1).max(128).optional(),
  conversationId: z.string().min(1).max(128).optional(),
});

export const generateCharacterSchema = z.object({
  prompt: z.string().min(1).max(4000),
});

export const generateAvatarSchema = z.object({
  prompt: z.string().min(1).max(2000),
  personaName: z.string().max(120).optional(),
  personaId: z.string().min(1).max(64).optional(),
  clientRequestId: z.string().min(1).max(128).optional(),
});

const callTranscriptTurnSchema = z.object({
  sender: z.enum(['user', 'character']),
  text: z.string().min(1).max(8_000),
});

export const summarizeCallSchema = z.object({
  personaName: z.string().min(1).max(120),
  personaTagline: z.string().max(200).optional(),
  systemPrompt: z.string().max(8_000).optional(),
  durationSecs: z.number().int().min(0).max(86_400),
  locale: z.string().max(16).optional(),
  transcripts: z.array(callTranscriptTurnSchema).min(1).max(200),
});

export const liveInitSchema = z.object({
  type: z.literal('init'),
  personaId: z.string().min(1).max(128),
  conversationId: z.string().min(1).max(128).optional(),
  callSessionId: z.string().min(1).max(128).optional(),
  characterName: z.string().max(120).optional(),
  voiceName: z.string().max(32).optional(),
  authToken: z.string().max(4096).optional(),
  devUserId: z.string().max(128).optional(),
});

export const liveAudioSchema = z.object({
  type: z.literal('audio'),
  data: z.string().min(1).max(MAX_WS_AUDIO_CHUNK_CHARS),
});

export const liveTextSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(1).max(MAX_CHAT_MESSAGE_CHARS),
});

export const localImportSchema = z.object({
  schemaVersion: z.literal(1),
  personas: z
    .array(
      z.object({
        localId: z.string().min(1).max(128),
        name: z.string().min(1).max(120),
        tagline: z.string().max(200).optional().default(''),
        description: z.string().max(2000).optional().default(''),
        systemPrompt: z.string().min(1).max(32_000),
        avatarUrl: z.string().max(4096),
        voice: z.string().min(1).max(32),
        category: z.string().min(1).max(32),
        badge: z.string().max(64).optional(),
        color: z.string().max(32).optional(),
        starterMessages: z.array(z.string().max(500)).max(10).optional(),
      })
    )
    .max(100),
  conversations: z
    .array(
      z.object({
        localPersonaId: z.string().min(1).max(128),
        messages: z
          .array(
            z.object({
              localId: z.string().min(1).max(128),
              sender: z.enum(['user', 'character']),
              text: z.string().min(1).max(MAX_CHAT_MESSAGE_CHARS),
              timestamp: z.number().optional(),
            })
          )
          .max(500),
      })
    )
    .max(100),
});

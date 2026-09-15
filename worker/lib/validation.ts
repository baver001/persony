import { z } from 'zod';

export const chatRequestSchema = z
  .object({
    personaId: z.string().min(1).optional(),
    conversationId: z.string().min(1).optional(),
    text: z.string().min(1).max(32_000).optional(),
    messages: z
      .array(
        z.object({
          sender: z.enum(['user', 'character', 'model']),
          text: z.string(),
        })
      )
      .min(1)
      .max(50)
      .optional(),
  })
  .refine(
    (data) =>
      Boolean(data.conversationId && data.text) ||
      Boolean(data.personaId && data.messages && data.messages.length > 0),
    { message: 'Provide conversationId+text or personaId+messages' }
  );

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
  sourcePersonaId: z.string().optional(),
});

export const updatePersonaSchema = createPersonaSchema.partial();

/** @deprecated Legacy upsert — prefer createPersonaSchema */
export const upsertPersonaSchema = createPersonaSchema.extend({
  id: z.string().min(1).max(128),
});

export const createConversationSchema = z.object({
  personaId: z.string().min(1),
});

export const sendMessageSchema = z.object({
  text: z.string().min(1).max(32_000),
});

export const legacyImportSchema = z.object({
  personas: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      tagline: z.string().optional(),
      description: z.string().optional(),
      systemPrompt: z.string(),
      avatar: z.string().optional(),
      voice: z.string().optional(),
      category: z.string().optional(),
      badge: z.string().optional(),
      color: z.string().optional(),
      starterMessages: z.array(z.string()).optional(),
      isCustom: z.boolean().optional(),
    })
  ),
  messagesByPersona: z.record(
    z.string(),
    z.array(
      z.object({
        id: z.string(),
        characterId: z.string(),
        sender: z.enum(['user', 'character', 'system']),
        text: z.string(),
        timestamp: z.number(),
      })
    )
  ),
});

export const transcribeRequestSchema = z.object({
  audioBase64: z.string().min(1),
  mimeType: z.string().optional(),
});

export const generateCharacterSchema = z.object({
  prompt: z.string().min(1).max(4000),
});

export const liveInitSchema = z.object({
  type: z.literal('init'),
  personaId: z.string().min(1),
  conversationId: z.string().optional(),
  characterName: z.string().optional(),
  voiceName: z.string().optional(),
  recentChatContext: z
    .array(z.object({ sender: z.string(), text: z.string() }))
    .max(20)
    .optional(),
});

import { z } from 'zod';

export const chatRequestSchema = z.object({
  personaId: z.string().min(1),
  conversationId: z.string().optional(),
  messages: z
    .array(
      z.object({
        sender: z.enum(['user', 'character', 'model']),
        text: z.string(),
      })
    )
    .min(1)
    .max(50),
});

export const upsertPersonaSchema = z.object({
  id: z.string().min(1).max(128),
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
  characterName: z.string().optional(),
  voiceName: z.string().optional(),
  recentChatContext: z
    .array(z.object({ sender: z.string(), text: z.string() }))
    .max(20)
    .optional(),
});

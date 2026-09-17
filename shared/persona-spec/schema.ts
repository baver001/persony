import { z } from 'zod';

const behaviorValue = z.number().int().min(0).max(100);

export const BehaviorVectorSchema = z.object({
  warmth: behaviorValue,
  directness: behaviorValue,
  initiative: behaviorValue,
  creativity: behaviorValue,
  skepticism: behaviorValue,
  empathy: behaviorValue,
  humor: behaviorValue,
  formality: behaviorValue,
  verbosity: behaviorValue,
  challenge_level: behaviorValue,
});

export const PersonaSpecV1Schema = z.object({
  schemaVersion: z.literal(1),
  identity: z.object({
    slug: z.string().min(1).max(64),
    isOfficial: z.boolean().optional(),
    supportedLocales: z.array(z.string().min(2).max(8)).optional(),
  }),
  mission: z.object({
    summary: z.string().min(1).max(500),
    objectives: z.array(z.string().min(1).max(120)).min(1).max(20),
  }),
  behavior: z.object({
    profile: BehaviorVectorSchema,
    styleNotes: z.array(z.string().min(1).max(240)).max(20),
  }),
  expertise: z
    .array(
      z.object({
        domain: z.string().min(1).max(120),
        level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
      })
    )
    .max(20),
  capabilities: z
    .array(
      z.enum([
        'chat',
        'voice',
        'web_search',
        'files',
        'knowledge_base',
        'code',
        'github',
        'images',
        'calendar',
        'email',
        'tools',
      ])
    )
    .min(1),
  knowledgePolicy: z.object({
    allowUserUploads: z.boolean(),
    citeSources: z.boolean(),
  }),
  memoryPolicy: z.object({
    userMemory: z.boolean(),
    relationshipMemory: z.boolean(),
    autoExtract: z.boolean(),
    sensitivePromptRequired: z.boolean(),
  }),
  contextPolicy: z.object({
    maxRecentMessages: z.number().int().min(1).max(50),
    includeSummaries: z.boolean(),
  }),
  modelPolicy: z.object({
    preferredProvider: z.string().optional(),
    preferredModel: z.string().optional(),
  }),
  safetyProfile: z.enum(['GENERAL', 'SENSITIVE', 'REGULATED']),
  presentation: z.object({
    localized: z.record(
      z.string(),
      z.object({
        tagline: z.string().optional(),
        description: z.string().optional(),
        starterMessages: z.array(z.string().min(1).max(500)).optional(),
        disclosure: z.string().optional(),
      })
    ),
  }),
  provenance: z
    .object({
      author: z.string().optional(),
      sourcePersonaId: z.string().optional(),
    })
    .optional(),
});

export type PersonaSpecV1Input = z.infer<typeof PersonaSpecV1Schema>;

export function parsePersonaSpecV1(
  value: unknown
): { ok: true; spec: PersonaSpecV1Input } | { ok: false; error: string } {
  const parsed = PersonaSpecV1Schema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }
  return { ok: true, spec: parsed.data };
}

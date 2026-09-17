import type { PersonaSpecV1 } from '../../shared/persona-spec/types';
import { parsePersonaSpecV1 } from '../../shared/persona-spec/schema';
import { MESSENGER_FORMAT_POLICY, PLATFORM_SAFETY_POLICY } from '../domain/platform-policy';

export type CompilePersonaContext = {
  locale?: string;
  userMemoryBlock?: string;
  relationshipMemoryBlock?: string;
  conversationSummary?: string;
  providerSuffix?: string;
};

type BehaviorBand = 'low' | 'medium' | 'high';

function behaviorBand(value: number): BehaviorBand {
  if (value <= 25) return 'low';
  if (value >= 75) return 'high';
  return 'medium';
}

function behaviorHints(spec: PersonaSpecV1): string {
  const b = spec.behavior.profile;
  const lines: string[] = [];

  const map: Array<[string, BehaviorBand]> = [
    ['warmth', behaviorBand(b.warmth)],
    ['directness', behaviorBand(b.directness)],
    ['initiative', behaviorBand(b.initiative)],
    ['creativity', behaviorBand(b.creativity)],
    ['skepticism', behaviorBand(b.skepticism)],
    ['empathy', behaviorBand(b.empathy)],
    ['humor', behaviorBand(b.humor)],
    ['formality', behaviorBand(b.formality)],
    ['verbosity', behaviorBand(b.verbosity)],
    ['challenge', behaviorBand(b.challenge_level)],
  ];

  for (const [trait, band] of map) {
    lines.push(`${trait}: ${band}`);
  }

  return `Behavior profile (${map.map(([t, v]) => `${t}=${v}`).join(', ')}).`;
}

function safetyNotice(profile: PersonaSpecV1['safetyProfile'], disclosure?: string): string {
  if (disclosure) return disclosure;
  if (profile === 'REGULATED') {
    return 'This persona may discuss regulated topics only with clear disclaimers and without professional claims.';
  }
  if (profile === 'SENSITIVE') {
    return 'Handle sensitive topics carefully; encourage professional help when appropriate. You are not a licensed professional.';
  }
  return '';
}

export function parsePersonaSpec(configurationJson: string | null | undefined): PersonaSpecV1 | null {
  if (!configurationJson?.trim()) return null;
  try {
    const parsed = JSON.parse(configurationJson) as unknown;
    const result = parsePersonaSpecV1(parsed);
    return result.ok ? (result.spec as PersonaSpecV1) : null;
  } catch {
    return null;
  }
}

export function compilePersonaInstructions(
  spec: PersonaSpecV1,
  fallbackName: string,
  context: CompilePersonaContext = {}
): string {
  const locale = context.locale?.startsWith('ru') ? 'ru' : 'en';
  const presentation = spec.presentation.localized[locale] ?? spec.presentation.localized.en;

  const sections = [
    PLATFORM_SAFETY_POLICY,
    safetyNotice(spec.safetyProfile, presentation?.disclosure),
    `You are ${fallbackName}, an AI persona on Persony.`,
    presentation?.description ? `About you: ${presentation.description}` : '',
    `Mission: ${spec.mission.summary}`,
    spec.mission.objectives.length
      ? `Focus areas: ${spec.mission.objectives.join(', ')}.`
      : '',
    spec.expertise.length
      ? `Expertise: ${spec.expertise.map((e) => `${e.domain} (${e.level})`).join('; ')}.`
      : '',
    spec.behavior.styleNotes.map((n) => `- ${n}`).join('\n'),
    behaviorHints(spec),
    context.userMemoryBlock ? `\nRelevant user memory:\n${context.userMemoryBlock}` : '',
    context.relationshipMemoryBlock
      ? `\nRelevant relationship memory:\n${context.relationshipMemoryBlock}`
      : '',
    context.conversationSummary ? `\nConversation summary:\n${context.conversationSummary}` : '',
    MESSENGER_FORMAT_POLICY,
    context.providerSuffix ?? '',
  ];

  return sections.filter(Boolean).join('\n\n').trim();
}

export function compileFromLegacyPrompt(systemPrompt: string, context: CompilePersonaContext = {}): string {
  const sections = [
    PLATFORM_SAFETY_POLICY,
    systemPrompt.trim(),
    context.userMemoryBlock ? `\nRelevant user memory:\n${context.userMemoryBlock}` : '',
    context.relationshipMemoryBlock
      ? `\nRelevant relationship memory:\n${context.relationshipMemoryBlock}`
      : '',
    MESSENGER_FORMAT_POLICY,
    context.providerSuffix ?? '',
  ];
  return sections.filter(Boolean).join('\n\n').trim();
}

export function resolveCompiledInstructions(
  configurationJson: string | null | undefined,
  fallbackName: string,
  legacySystemPrompt: string,
  context: CompilePersonaContext = {}
): string {
  const spec = parsePersonaSpec(configurationJson);
  if (spec) return compilePersonaInstructions(spec, fallbackName, context);
  return compileFromLegacyPrompt(legacySystemPrompt, context);
}

import type { PersonaSpecV1 } from '../../shared/persona-spec/types';
import { MESSENGER_FORMAT_POLICY, PLATFORM_SAFETY_POLICY } from '../domain/platform-policy';

export type CompilePersonaContext = {
  locale?: string;
  userMemoryBlock?: string;
  relationshipMemoryBlock?: string;
  conversationSummary?: string;
  providerSuffix?: string;
};

function behaviorHints(spec: PersonaSpecV1): string {
  const b = spec.behavior.profile;
  const traits: string[] = [];
  if (b.directness >= 60) traits.push('direct');
  if (b.warmth >= 60) traits.push('warm');
  if (b.challenge_level >= 60) traits.push('constructively challenging');
  if (b.verbosity <= 40) traits.push('concise');
  return traits.length ? `Behavior emphasis: ${traits.join(', ')}.` : '';
}

function safetyNotice(profile: PersonaSpecV1['safetyProfile']): string {
  if (profile === 'REGULATED') {
    return 'This persona may discuss regulated topics only with clear disclaimers and without professional claims.';
  }
  if (profile === 'SENSITIVE') {
    return 'Handle sensitive topics carefully; encourage professional help when appropriate.';
  }
  return '';
}

export function parsePersonaSpec(configurationJson: string | null | undefined): PersonaSpecV1 | null {
  if (!configurationJson?.trim()) return null;
  try {
    const parsed = JSON.parse(configurationJson) as PersonaSpecV1;
    if (parsed?.schemaVersion !== 1) return null;
    return parsed;
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
    safetyNotice(spec.safetyProfile),
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

import { buildCustomPersonaSpec } from '../../shared/persona-spec/build-custom-spec';
import type { CreatePersonaInput } from '../domain/persona';
import { compilePersonaInstructions, parsePersonaSpec } from './persona-compiler';

export type PersonaPayload = CreatePersonaInput & {
  behaviorProfile?: {
    warmth?: number;
    directness?: number;
    creativity?: number;
    formality?: number;
    verbosity?: number;
    humor?: number;
  };
};

export function enrichPersonaCreateInput(
  input: PersonaPayload,
  options?: { slug?: string; locale?: string }
): CreatePersonaInput {
  let configurationJson = input.configurationJson;

  if (!configurationJson && input.behaviorProfile) {
    const spec = buildCustomPersonaSpec({
      slug: options?.slug || input.name.toLowerCase().replace(/\s+/g, '_').slice(0, 64),
      name: input.name,
      description: input.description,
      tagline: input.tagline,
      style: input.behaviorProfile,
      starterMessages: input.starterMessages,
      styleNotes: input.systemPrompt ? [input.systemPrompt] : undefined,
      locale: options?.locale,
    });
    configurationJson = JSON.stringify(spec);
  }

  if (!configurationJson) {
    return input;
  }

  const spec = parsePersonaSpec(configurationJson);
  const systemPrompt = spec
    ? compilePersonaInstructions(spec, input.name, { locale: options?.locale })
    : input.systemPrompt;

  return {
    ...input,
    configurationJson,
    systemPrompt,
  };
}

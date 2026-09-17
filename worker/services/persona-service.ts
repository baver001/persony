import type { PersonaRuntime } from '../domain/persona';
import {
  ensureOfficialPersonasSeeded,
  getAccessiblePersona,
} from '../repositories/persona-repository';
import type { PersonyEnv } from '../types/env';

export class PersonaNotFoundError extends Error {
  readonly status = 404;
  constructor(personaId: string) {
    super(`Persona not found: ${personaId}`);
    this.name = 'PersonaNotFoundError';
  }
}

export async function resolvePersonaForInference(
  env: PersonyEnv,
  personaId: string,
  requesterUserId: string | null
): Promise<PersonaRuntime> {
  if (env.DB) {
    await ensureOfficialPersonasSeeded(env.DB);
  }

  const persona = await getAccessiblePersona(env, env.DB, personaId, requesterUserId);
  if (!persona?.systemPrompt?.trim()) {
    throw new PersonaNotFoundError(personaId);
  }
  return persona;
}

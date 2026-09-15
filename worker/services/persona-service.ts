import type { PersonaRecord } from '../domain/persona';
import { ensureDefaultPersonasSeeded, getPersonaById } from '../repositories/persona-repository';
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
): Promise<PersonaRecord> {
  if (env.DB) {
    await ensureDefaultPersonasSeeded(env.DB);
  }

  const persona = await getPersonaById(env.DB, personaId, requesterUserId);
  if (!persona?.systemPrompt?.trim()) {
    throw new PersonaNotFoundError(personaId);
  }
  return persona;
}

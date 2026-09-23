import type { Persona } from '../types';
import { DEFAULT_PERSONAS } from '../data/defaultPersonas';

export const STORAGE_KEY_SELECTED_PERSONA_ID = 'persony_selected_persona_id_v1';
export const STORAGE_KEY_BETA_DATA_EPOCH = 'persony_beta_data_epoch_v1';
/** Bump when server-side beta persona reset invalidates local persona cache. */
export const BETA_DATA_EPOCH = 1;

const PERSONA_CACHE_KEYS = [
  'persony_personas_v1',
  'persony_messages_v1',
  STORAGE_KEY_SELECTED_PERSONA_ID,
  'persony_pending_persona_v1',
  'persony_pending_edit_v1',
];

export function migrateBetaPersonaCacheEpoch(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_BETA_DATA_EPOCH);
    const epoch = stored ? Number(stored) : 0;
    if (epoch >= BETA_DATA_EPOCH) return;

    for (const key of PERSONA_CACHE_KEYS) {
      localStorage.removeItem(key);
    }
    localStorage.setItem(STORAGE_KEY_BETA_DATA_EPOCH, String(BETA_DATA_EPOCH));
  } catch {
    // ignore private mode / SSR
  }
}

export function readStoredSelectedPersonaId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_SELECTED_PERSONA_ID);
  } catch {
    return null;
  }
}

export function writeStoredSelectedPersonaId(personaId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_SELECTED_PERSONA_ID, personaId);
  } catch {
    // ignore
  }
}

export function resolvePersonaById(
  personas: Persona[],
  personaId: string | null | undefined,
  fallback?: Persona
): Persona {
  if (personaId) {
    const found = personas.find((p) => p.id === personaId);
    if (found) return found;
  }
  return fallback ?? personas[0] ?? DEFAULT_PERSONAS[0];
}

export function pickDefaultPersonaId(personas: Persona[]): string {
  return personas[0]?.id ?? DEFAULT_PERSONAS[0].id;
}

export function resolvePersonaByIdOptional(
  personas: Persona[],
  personaId: string | null | undefined
): Persona | null {
  if (!personaId) return null;
  return personas.find((p) => p.id === personaId) ?? null;
}

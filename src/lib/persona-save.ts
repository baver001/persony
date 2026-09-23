import type { Persona } from '../types';

export type PersonaSaveResult =
  | { ok: true; persona: Persona }
  | { ok: false; error: string };

export type PersonaSaveHandler = (persona: Persona) => Promise<PersonaSaveResult>;

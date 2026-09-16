import type { Context } from 'hono';
import { AuthRequiredError, requireUser } from './auth';
import type { PersonyEnv } from '../types/env';

/** Phase 1: authenticated user. Phase 3: trial/energy balance. */
export async function requireAIEntitlement(c: Context<{ Bindings: PersonyEnv }>): Promise<string> {
  try {
    return await requireUser(c);
  } catch (err) {
    if (err instanceof AuthRequiredError) throw err;
    throw err;
  }
}

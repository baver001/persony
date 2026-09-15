import type { Context } from 'hono';
import type { PersonyEnv } from '../types/env';
import { AuthRequiredError, getAuthContext } from './auth';

/**
 * Gates billable AI endpoints. Today: authenticated user.
 * Phase 3 will add Energy > 0 check.
 */
export async function requireAIEntitlement(
  c: Context<{ Bindings: PersonyEnv }>
): Promise<string> {
  const auth = await getAuthContext(c);
  if (!auth.isAuthenticated || !auth.userId) {
    throw new AuthRequiredError();
  }
  return auth.userId;
}

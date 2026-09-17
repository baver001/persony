import type { Context } from 'hono';
import { BatteryEmptyError } from '../services/energy-service';
import { assertBatteryAllowsAI } from '../services/energy-service';
import { AuthRequiredError, requireUser } from './auth';
import type { PersonyEnv } from '../types/env';

export class AIEntitlementError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AIEntitlementError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Authenticated user with sufficient Battery for new AI compute. */
export async function requireAIEntitlement(c: Context<{ Bindings: PersonyEnv }>): Promise<string> {
  try {
    const userId = await requireUser(c);
    if (c.env.DB) {
      try {
        await assertBatteryAllowsAI(c.env.DB, userId);
      } catch (err) {
        if (err instanceof BatteryEmptyError) {
          throw new AIEntitlementError(402, err.code, err.message, err.snapshot);
        }
        throw err;
      }
    }
    return userId;
  } catch (err) {
    if (err instanceof AuthRequiredError) throw err;
    if (err instanceof AIEntitlementError) throw err;
    throw err;
  }
}

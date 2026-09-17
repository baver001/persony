import { AuthRequiredError } from '../middleware/auth';
import { AIEntitlementError } from '../middleware/entitlement';

export function mapApiError(
  err: unknown,
  fallbackMessage = 'Internal error'
): { status: number; body: Record<string, unknown> } {
  if (err instanceof AuthRequiredError) {
    return { status: 401, body: { error: 'Authentication required' } };
  }
  if (err instanceof AIEntitlementError) {
    return {
      status: err.status,
      body: {
        error: err.message,
        error_code: err.code,
        battery: err.details,
      },
    };
  }
  return { status: 500, body: { error: fallbackMessage } };
}

import type { PersonyEnv } from '../types/env';
import { isProduction } from './env';

const DEV_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8787',
  'http://127.0.0.1:8787',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

/**
 * Returns allowed CORS origin or null if request must be rejected.
 * Production: same-origin only (no cross-origin API).
 */
export function resolveAllowedCorsOrigin(
  origin: string | undefined,
  env: PersonyEnv,
  requestUrl: string
): string | null {
  if (!origin) {
    // Same-origin navigations / non-CORS requests — no ACAO header needed.
    return null;
  }

  if (isProduction(env)) {
    try {
      const reqOrigin = new URL(requestUrl).origin;
      return origin === reqOrigin ? origin : null;
    } catch {
      return null;
    }
  }

  if (DEV_ORIGINS.has(origin)) return origin;

  try {
    const reqOrigin = new URL(requestUrl).origin;
    if (origin === reqOrigin) return origin;
  } catch {
    // ignore
  }

  return null;
}

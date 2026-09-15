import { cors } from 'hono/cors';

const LOCALHOST_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function isAllowedOrigin(origin: string, isDev: boolean): boolean {
  if (LOCALHOST_ORIGIN_RE.test(origin)) return true;
  if (isDev) return false;
  // Production: same-origin only — reject cross-origin requests.
  return false;
}

/** Same-origin API in production; localhost allowlist in dev. No arbitrary origin reflection. */
export const apiCors = cors({
  origin: (origin, c) => {
    if (!origin) return null;
    const isDev = c.env.PERSONY_DEV_MODE === 'true';
    return isAllowedOrigin(origin, isDev) ? origin : null;
  },
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Persony-Dev-User-Id'],
  maxAge: 86400,
});

export { isAllowedOrigin, LOCALHOST_ORIGIN_RE };

import type { MiddlewareHandler } from 'hono';
import { resolveAllowedCorsOrigin } from '../lib/cors-policy';
import type { PersonyEnv } from '../types/env';

/** Strict CORS — never reflects arbitrary Origin. */
export const apiCors: MiddlewareHandler<{ Bindings: PersonyEnv }> = async (c, next) => {
  const origin = c.req.header('Origin');

  if (c.req.method === 'OPTIONS') {
    const allowed = resolveAllowedCorsOrigin(origin, c.env, c.req.url);
    if (origin && !allowed) {
      return c.body(null, 403);
    }
    if (allowed) {
      c.header('Access-Control-Allow-Origin', allowed);
      c.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      c.header('Access-Control-Max-Age', '86400');
    }
    return c.body(null, 204);
  }

  await next();

  const allowed = resolveAllowedCorsOrigin(origin, c.env, c.req.url);
  if (allowed) {
    c.header('Access-Control-Allow-Origin', allowed);
    c.header('Vary', 'Origin');
  }
};

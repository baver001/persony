import { cors } from 'hono/cors';

/** Same-origin API by default; no wildcard CORS in production. */
export const apiCors = cors({
  origin: (origin) => {
    if (!origin) return '*';
    return origin;
  },
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Persony-Dev-User-Id'],
  maxAge: 86400,
});

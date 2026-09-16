import type { MiddlewareHandler } from 'hono';

export function bodySizeLimit(maxBytes: number): MiddlewareHandler {
  return async (c, next) => {
    const contentLength = c.req.header('content-length');
    if (contentLength) {
      const size = Number(contentLength);
      if (!Number.isNaN(size) && size > maxBytes) {
        return c.json({ error: 'Payload too large' }, 413);
      }
    }
    await next();
  };
}

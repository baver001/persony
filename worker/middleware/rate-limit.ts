import type { Context, Next } from 'hono';
import { ERROR_CODES } from '../lib/error-codes';
import { incrementRateLimitBucket } from '../repositories/rate-limit-repository';
import type { PersonyEnv } from '../types/env';

export class RateLimitError extends Error {
  readonly status = 429;
  readonly code = ERROR_CODES.RATE_LIMITED;
  constructor(public readonly retryAfterSec: number) {
    super('Too many requests');
    this.name = 'RateLimitError';
  }
}

export type RateLimitOptions = {
  scope: string;
  limit: number;
  windowSec: number;
  key: (c: Context<{ Bindings: PersonyEnv }>) => string | Promise<string>;
};

function windowStartMs(nowMs: number, windowSec: number): number {
  const windowMs = windowSec * 1000;
  return Math.floor(nowMs / windowMs) * windowMs;
}

export async function assertRateLimit(
  db: D1Database,
  scope: string,
  subjectKey: string,
  limit: number,
  windowSec: number
): Promise<void> {
  const nowMs = Date.now();
  const windowStart = windowStartMs(nowMs, windowSec);
  const bucketKey = `${scope}:${subjectKey}:${windowStart}`;
  const count = await incrementRateLimitBucket(db, bucketKey, windowStart);
  if (count > limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((windowStart + windowSec * 1000 - nowMs) / 1000)
    );
    throw new RateLimitError(retryAfterSec);
  }
}

export function rateLimitMiddleware(options: RateLimitOptions) {
  return async (c: Context<{ Bindings: PersonyEnv }>, next: Next) => {
    if (!c.env.DB) {
      await next();
      return;
    }
    const subject = await options.key(c);
    await assertRateLimit(
      c.env.DB,
      options.scope,
      subject,
      options.limit,
      options.windowSec
    );
    await next();
  };
}

export function clientIp(c: Context<{ Bindings: PersonyEnv }>): string {
  return (
    c.req.header('CF-Connecting-IP') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

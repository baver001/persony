import type { Context } from 'hono';
import { verifyToken } from '@clerk/backend';
import type { PersonyEnv } from '../types/env';

export type AuthContext = {
  userId: string | null;
  clerkUserId: string | null;
  isAuthenticated: boolean;
};

export async function getAuthContext(c: Context<{ Bindings: PersonyEnv }>): Promise<AuthContext> {
  const env = c.env;
  const authHeader = c.req.header('Authorization');

  if (env.CLERK_SECRET_KEY && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
      const clerkUserId = payload.sub;
      if (clerkUserId) {
        return {
          userId: clerkUserId,
          clerkUserId,
          isAuthenticated: true,
        };
      }
    } catch {
      return { userId: null, clerkUserId: null, isAuthenticated: false };
    }
  }

  if (env.PERSONY_DEV_MODE === 'true') {
    const devUser =
      env.PERSONY_DEV_USER_ID || c.req.header('X-Persony-Dev-User-Id') || 'dev-local-user';
    return {
      userId: devUser,
      clerkUserId: null,
      isAuthenticated: true,
    };
  }

  return { userId: null, clerkUserId: null, isAuthenticated: false };
}

export async function requireUser(c: Context<{ Bindings: PersonyEnv }>): Promise<string> {
  const auth = await getAuthContext(c);
  if (!auth.isAuthenticated || !auth.userId) {
    throw new AuthRequiredError();
  }
  return auth.userId;
}

export class AuthRequiredError extends Error {
  readonly status = 401;
  constructor() {
    super('Authentication required');
    this.name = 'AuthRequiredError';
  }
}

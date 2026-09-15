import type { Context } from 'hono';
import { verifyToken } from '@clerk/backend';
import { resolveOrCreateUser } from '../repositories/user-repository';
import type { PersonyEnv } from '../types/env';

export type AuthProvider = 'clerk' | 'dev';

export type AuthContext = {
  userId: string | null;
  authProvider: AuthProvider | null;
  authProviderUserId: string | null;
  isAuthenticated: boolean;
};

type VerifiedIdentity = {
  authProvider: AuthProvider;
  authProviderUserId: string;
};

async function verifyClerkIdentity(
  env: PersonyEnv,
  authHeader: string | undefined
): Promise<VerifiedIdentity | null> {
  if (!env.CLERK_SECRET_KEY || !authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
    const clerkUserId = payload.sub;
    if (!clerkUserId) return null;
    return { authProvider: 'clerk', authProviderUserId: clerkUserId };
  } catch {
    return null;
  }
}

function verifyDevIdentity(
  env: PersonyEnv,
  devHeader: string | undefined
): VerifiedIdentity | null {
  if (env.PERSONY_DEV_MODE !== 'true') return null;
  const devUser = env.PERSONY_DEV_USER_ID || devHeader || 'dev-local-user';
  return { authProvider: 'dev', authProviderUserId: devUser };
}

async function mapToPersonyUser(
  env: PersonyEnv,
  identity: VerifiedIdentity
): Promise<AuthContext> {
  if (env.DB) {
    const user = await resolveOrCreateUser(
      env.DB,
      identity.authProvider,
      identity.authProviderUserId
    );
    return {
      userId: user.id,
      authProvider: identity.authProvider,
      authProviderUserId: identity.authProviderUserId,
      isAuthenticated: true,
    };
  }

  // Fallback when D1 is not bound (unit tests / minimal env).
  return {
    userId: identity.authProviderUserId,
    authProvider: identity.authProvider,
    authProviderUserId: identity.authProviderUserId,
    isAuthenticated: true,
  };
}

export async function getAuthContext(c: Context<{ Bindings: PersonyEnv }>): Promise<AuthContext> {
  const env = c.env;
  const authHeader = c.req.header('Authorization');
  const devHeader = c.req.header('X-Persony-Dev-User-Id');

  const clerkIdentity = await verifyClerkIdentity(env, authHeader);
  if (clerkIdentity) {
    return mapToPersonyUser(env, clerkIdentity);
  }

  const devIdentity = verifyDevIdentity(env, devHeader);
  if (devIdentity) {
    return mapToPersonyUser(env, devIdentity);
  }

  return {
    userId: null,
    authProvider: null,
    authProviderUserId: null,
    isAuthenticated: false,
  };
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

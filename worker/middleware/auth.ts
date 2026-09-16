import type { Context } from 'hono';
import { verifyToken } from '@clerk/backend';
import type { AuthProvider } from '../domain/user';
import { isDevModeAllowed, isDbConfigured } from '../lib/env';
import { getOrCreateUserByAuthIdentity } from '../services/user-service';
import type { PersonyEnv } from '../types/env';

export type AuthContext = {
  userId: string | null;
  authProvider: AuthProvider | null;
  authProviderUserId: string | null;
  isAuthenticated: boolean;
};

export type AuthCredentialInput = {
  authorizationHeader?: string | null;
  bearerToken?: string | null;
  devUserId?: string | null;
};

const UNAUTHENTICATED: AuthContext = {
  userId: null,
  authProvider: null,
  authProviderUserId: null,
  isAuthenticated: false,
};

function extractBearerToken(input: AuthCredentialInput): string | null {
  if (input.bearerToken?.trim()) return input.bearerToken.trim();
  const header = input.authorizationHeader;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export async function resolveAuthContext(
  env: PersonyEnv,
  input: AuthCredentialInput
): Promise<AuthContext> {
  const bearer = extractBearerToken(input);

  if (env.CLERK_SECRET_KEY && bearer) {
    try {
      const payload = await verifyToken(bearer, { secretKey: env.CLERK_SECRET_KEY });
      const clerkUserId = payload.sub;
      if (!clerkUserId) return UNAUTHENTICATED;

      if (isDbConfigured(env) && env.DB) {
        const user = await getOrCreateUserByAuthIdentity(env.DB, 'clerk', clerkUserId);
        return {
          userId: user.id,
          authProvider: 'clerk',
          authProviderUserId: clerkUserId,
          isAuthenticated: true,
        };
      }

      return {
        userId: null,
        authProvider: 'clerk',
        authProviderUserId: clerkUserId,
        isAuthenticated: true,
      };
    } catch {
      return UNAUTHENTICATED;
    }
  }

  if (isDevModeAllowed(env)) {
    const devUserId =
      env.PERSONY_DEV_USER_ID || input.devUserId || 'dev-local-user';
    const authProviderId = devUserId.startsWith('dev_') ? devUserId : `dev_${devUserId}`;

    if (isDbConfigured(env) && env.DB) {
      const user = await getOrCreateUserByAuthIdentity(env.DB, 'dev', authProviderId);
      return {
        userId: user.id,
        authProvider: 'dev',
        authProviderUserId: authProviderId,
        isAuthenticated: true,
      };
    }

    return {
      userId: authProviderId,
      authProvider: 'dev',
      authProviderUserId: authProviderId,
      isAuthenticated: true,
    };
  }

  return UNAUTHENTICATED;
}

export async function getAuthContext(c: Context<{ Bindings: PersonyEnv }>): Promise<AuthContext> {
  return resolveAuthContext(c.env, {
    authorizationHeader: c.req.header('Authorization'),
    devUserId: c.req.header('X-Persony-Dev-User-Id'),
  });
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

export class PersonaOwnershipError extends Error {
  readonly status = 403;
  constructor() {
    super('Persona ownership mismatch');
    this.name = 'PersonaOwnershipError';
  }
}

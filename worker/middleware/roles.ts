import type { Context } from 'hono';
import { grantRole, userHasRole, type UserRole } from '../repositories/role-repository';
import { AuthRequiredError, requireUser } from './auth';
import type { PersonyEnv } from '../types/env';

export class RoleRequiredError extends Error {
  readonly status = 403;
  constructor(role: UserRole) {
    super(`Role required: ${role}`);
    this.name = 'RoleRequiredError';
  }
}

function parseOwnerClerkIds(env: PersonyEnv): string[] {
  const raw = (env as PersonyEnv & { PERSONY_OWNER_CLERK_IDS?: string }).PERSONY_OWNER_CLERK_IDS;
  if (!raw?.trim()) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function ensureBootstrapOwnerRole(
  c: Context<{ Bindings: PersonyEnv }>,
  userId: string,
  clerkUserId?: string
): Promise<void> {
  if (!c.env.DB || !clerkUserId) return;
  const ownerClerkIds = parseOwnerClerkIds(c.env);
  if (!ownerClerkIds.includes(clerkUserId)) return;
  await grantRole(c.env.DB, userId, 'OWNER');
}

export async function requireRole(
  c: Context<{ Bindings: PersonyEnv }>,
  role: UserRole
): Promise<{ userId: string }> {
  const userId = await requireUser(c);
  if (!c.env.DB) throw new Error('Database not configured');
  const allowed = await userHasRole(c.env.DB, userId, role);
  if (!allowed) throw new RoleRequiredError(role);
  return { userId };
}

export async function requireOwner(c: Context<{ Bindings: PersonyEnv }>) {
  return requireRole(c, 'OWNER');
}

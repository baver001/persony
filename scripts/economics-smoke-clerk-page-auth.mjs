/**
 * Clerk ticket sign-in for Playwright owner layout smoke.
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createClerkClient } from '@clerk/backend';

export function loadDevVars() {
  if (!existsSync('.dev.vars')) return;
  for (const line of readFileSync('.dev.vars', 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

export function discoverOwnerClerkId() {
  if (process.env.SMOKE_OWNER_CLERK_USER_ID?.trim()) return;
  const discover = spawnSync(
    'node',
    ['scripts/economics-smoke-discover-owner-clerk-id.mjs', '--print-only'],
    { encoding: 'utf8' }
  );
  if (discover.status === 0 && discover.stdout.trim()) {
    process.env.SMOKE_OWNER_CLERK_USER_ID = discover.stdout.trim();
  }
}

export async function createOwnerSignInTicket() {
  loadDevVars();
  discoverOwnerClerkId();

  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  const userId = process.env.SMOKE_OWNER_CLERK_USER_ID?.trim()?.replace(/^clerk:/, '');
  if (!secretKey) throw new Error('CLERK_SECRET_KEY not set (.dev.vars or env)');
  if (!userId) throw new Error('SMOKE_OWNER_CLERK_USER_ID not set');

  const clerk = createClerkClient({ secretKey });
  const sit = await clerk.signInTokens.createSignInToken({ userId, expiresInSeconds: 300 });
  if (!sit?.token) throw new Error('Clerk signInToken empty');
  return sit.token;
}

export async function signInOwnerWithTicket(page, base, ticket) {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForFunction(() => window.Clerk?.loaded, { timeout: 45_000 });

  const result = await page.evaluate(async (token) => {
    try {
      const clerk = window.Clerk;
      let signIn = await clerk.client.signIn.create({ strategy: 'ticket', ticket: token });
      if (signIn.status !== 'complete') {
        signIn = await signIn.attemptFirstFactor({ strategy: 'ticket', ticket: token });
      }
      if (!signIn.createdSessionId) {
        return { ok: false, error: `sign-in status=${signIn.status}` };
      }
      await clerk.setActive({ session: signIn.createdSessionId });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  }, ticket);

  if (!result?.ok) {
    throw new Error(`Clerk ticket auth failed: ${result?.error || 'unknown'}`);
  }

  await page.goto(`${base.replace(/\/$/, '')}/owner`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
}

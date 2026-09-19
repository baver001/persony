#!/usr/bin/env node
/**
 * Mint a short-lived Clerk session JWT for owner smoke (no DevTools copy).
 *
 * Production: reuses an active owner session (createSession is dev-only in Clerk).
 * Development: falls back to createSession when no active session exists.
 *
 * Requires:
 *   CLERK_SECRET_KEY
 *   SMOKE_OWNER_CLERK_USER_ID  (Clerk user id with OWNER role on beta)
 *
 *   node scripts/economics-smoke-mint-owner-jwt.mjs --print-only
 *   npm run smoke:economics:mint-owner
 */
import { readFileSync, existsSync } from 'node:fs';
import { createClerkClient } from '@clerk/backend';

function loadDevVars() {
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

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exit(1);
}

async function tokenFromActiveSession(clerk, userId) {
  const sessions = await clerk.sessions.getSessionList({ userId, status: 'active', limit: 10 });
  const list = sessions.data ?? [];
  if (list.length === 0) return null;

  const session = [...list].sort((a, b) => {
    const aTs = Date.parse(a.lastActiveAt ?? a.updatedAt ?? a.createdAt ?? 0);
    const bTs = Date.parse(b.lastActiveAt ?? b.updatedAt ?? b.createdAt ?? 0);
    return bTs - aTs;
  })[0];

  const token = await clerk.sessions.getToken(session.id);
  const jwt = typeof token === 'string' ? token : token?.jwt;
  return jwt || null;
}

async function tokenFromNewDevSession(clerk, userId) {
  const session = await clerk.sessions.createSession({ userId });
  const token = await clerk.sessions.getToken(session.id);
  const jwt = typeof token === 'string' ? token : token?.jwt;
  if (!jwt) fail('Clerk getToken returned empty jwt');

  try {
    await clerk.sessions.revokeSession(session.id);
  } catch {
    // best-effort cleanup
  }

  return jwt;
}

async function mintJwt() {
  loadDevVars();

  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  const rawUserId = process.env.SMOKE_OWNER_CLERK_USER_ID?.trim();
  if (!secretKey) fail('CLERK_SECRET_KEY not set (.dev.vars or env)');
  if (!rawUserId) fail('SMOKE_OWNER_CLERK_USER_ID not set (npm run smoke:economics:discover-owner-id)');
  const userId = rawUserId.replace(/^clerk:/, '');

  const clerk = createClerkClient({ secretKey });

  const activeJwt = await tokenFromActiveSession(clerk, userId);
  if (activeJwt) return activeJwt;

  try {
    return await tokenFromNewDevSession(clerk, userId);
  } catch (err) {
    if (err?.errors?.[0]?.code === 'request_invalid_for_environment') {
      fail(
        'No active Clerk session for owner on production. Sign in on beta as owner (keeps a session), set SMOKE_OWNER_BEARER from DevTools, or run mint again after login.'
      );
    }
    throw err;
  }
}

async function main() {
  const printOnly = process.argv.includes('--print-only');
  const jwt = await mintJwt();

  if (printOnly) {
    process.stdout.write(jwt);
    return;
  }

  console.log('OK minted owner session JWT (not printing token).');
  console.log('Run:');
  console.log(`  SMOKE_OWNER_BEARER="<jwt>" npm run smoke:economics:milestone1`);
  console.log('Or: npm run smoke:economics:mint-owner  (mints + runs milestone1)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

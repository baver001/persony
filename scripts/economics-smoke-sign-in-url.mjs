#!/usr/bin/env node
/**
 * Print a one-time Clerk sign-in URL for owner layout smoke (browser automation).
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
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

async function main() {
  loadDevVars();
  if (!process.env.SMOKE_OWNER_CLERK_USER_ID?.trim()) {
    const discover = spawnSync(
      'node',
      ['scripts/economics-smoke-discover-owner-clerk-id.mjs', '--print-only'],
      { encoding: 'utf8' }
    );
    if (discover.status === 0 && discover.stdout.trim()) {
      process.env.SMOKE_OWNER_CLERK_USER_ID = discover.stdout.trim();
    }
  }

  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  const userId = process.env.SMOKE_OWNER_CLERK_USER_ID?.trim()?.replace(/^clerk:/, '');
  if (!secretKey || !userId) {
    console.error('FAIL need CLERK_SECRET_KEY and SMOKE_OWNER_CLERK_USER_ID');
    process.exit(1);
  }

  const clerk = createClerkClient({ secretKey });
  const sit = await clerk.signInTokens.createSignInToken({ userId, expiresInSeconds: 300 });
  const base = (process.env.SMOKE_BASE_URL || 'https://beta.persony.org').replace(/\/$/, '');
  const url = sit.url?.includes('redirect_url')
    ? sit.url
    : `${base}/sign-in?__clerk_ticket=${encodeURIComponent(sit.token)}`;
  process.stdout.write(url);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

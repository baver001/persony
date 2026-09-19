#!/usr/bin/env node
/**
 * Mint owner JWT via Clerk API and run Milestone 1 owner gates.
 */
import { execSync } from 'node:child_process';
import { spawnSync } from 'node:child_process';

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

const mint = spawnSync('node', ['scripts/economics-smoke-mint-owner-jwt.mjs', '--print-only'], {
  encoding: 'utf8',
});

if (mint.status !== 0) {
  process.stderr.write(mint.stderr || mint.stdout);
  process.exit(mint.status ?? 1);
}

const jwt = mint.stdout.trim();
if (!jwt) {
  console.error('FAIL mint returned empty jwt');
  process.exit(1);
}

process.env.SMOKE_OWNER_BEARER = jwt;
execSync('npm run smoke:economics:milestone1', {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

#!/usr/bin/env node
/**
 * Mint owner JWT via Clerk API and run Milestone 1 owner gates.
 */
import { execSync } from 'node:child_process';
import { spawnSync } from 'node:child_process';

const mint = spawnSync('node', ['scripts/economics-smoke-mint-owner-jwt.mjs', '--print-only'], {
  encoding: 'utf8',
  shell: true,
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

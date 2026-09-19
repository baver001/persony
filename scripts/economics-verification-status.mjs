#!/usr/bin/env node
/**
 * Milestone 1 verification dashboard (runs operator checks; reports owner blockers).
 *
 *   npm run smoke:economics:status
 */
import { execSync, spawnSync } from 'node:child_process';

const BASE = (process.env.SMOKE_BASE_URL || 'https://beta.persony.org').replace(/\/$/, '');

function tryMintJwt() {
  if (process.env.SMOKE_OWNER_BEARER?.trim()) return true;
  const mint = spawnSync('node', ['scripts/economics-smoke-mint-owner-jwt.mjs', '--print-only'], {
    encoding: 'utf8',
    shell: true,
  });
  if (mint.status !== 0) return false;
  const jwt = mint.stdout.trim();
  if (!jwt) return false;
  process.env.SMOKE_OWNER_BEARER = jwt;
  console.log('OK minted owner JWT via Clerk API (CLERK_SECRET_KEY + SMOKE_OWNER_CLERK_USER_ID)\n');
  return true;
}

const hasJwt = tryMintJwt();

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', env: process.env, shell: true });
}

async function main() {
  console.log('=== Persony economics verification status ===\n');

  try {
    const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
    console.log(`Production: ${BASE}`);
    console.log(`gitSha: ${health.gitSha ?? '—'}  database: ${health.database ?? '—'}\n`);
  } catch (err) {
    console.error(`FAIL health: ${err.message}`);
    process.exit(1);
  }

  console.log('--- Operator layer (automated) ---');
  run('npm run smoke:economics');

  console.log('\n--- Owner layer ---');
  if (!hasJwt) {
    console.log('BLOCKED: no owner JWT');
    console.log('  Option A: CLERK_SECRET_KEY + SMOKE_OWNER_CLERK_USER_ID → npm run smoke:economics:mint-owner');
    console.log('  Option B: DevTools Bearer from /api/owner/* → SMOKE_OWNER_BEARER="<jwt>" npm run smoke:economics:milestone1');
    console.log('\n--- Manual layout (authenticated) ---');
    console.log('BLOCKED: docs/PRODUCTION_ECONOMICS_SMOKE.md §15–23 (390px + 1440px)');
    console.log('\nGoal: ACTIVE — operator gates passed; owner JWT + layout sign-off required.');
    process.exit(0);
  }

  run('npm run smoke:economics:owner');
  run('npm run smoke:economics:parity');
  console.log('\nOwner API gates passed.');
  console.log('MANUAL: layout 390/1440 — docs/PRODUCTION_ECONOMICS_SMOKE.md §15–23');
  console.log('Record results in docs/GOAL_MODE_STATE.md manual verification table.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

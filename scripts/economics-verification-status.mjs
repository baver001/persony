#!/usr/bin/env node
/**
 * Milestone 1 verification dashboard (runs operator checks; reports owner blockers).
 *
 *   npm run smoke:economics:status
 */
import { execSync } from 'node:child_process';

const BASE = (process.env.SMOKE_BASE_URL || 'https://beta.persony.org').replace(/\/$/, '');
const hasJwt = Boolean(process.env.SMOKE_OWNER_BEARER?.trim());

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
    console.log('BLOCKED: SMOKE_OWNER_BEARER not set');
    console.log('  1. Sign in on beta → /owner');
    console.log('  2. DevTools → Network → /api/owner/* → Authorization Bearer …');
    console.log('  3. SMOKE_OWNER_BEARER="<jwt>" npm run smoke:economics:milestone1');
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

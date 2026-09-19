#!/usr/bin/env node
/**
 * Milestone 1 orchestrator: operator smoke (always) + owner smoke (when JWT set).
 *
 *   npm run smoke:economics:milestone1
 *   SMOKE_OWNER_BEARER="<jwt>" npm run smoke:economics:milestone1
 */
import { execSync } from 'node:child_process';

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', env: process.env, shell: true });
}

run('npm run smoke:economics');

if (process.env.SMOKE_OWNER_BEARER?.trim()) {
  run('npm run smoke:economics:owner');
  console.log('\nMilestone 1 automated gates passed.');
  console.log('Manual: Owner Console layout 390/1440 — docs/PRODUCTION_ECONOMICS_SMOKE.md §15–23');
} else {
  console.log('\nOperator layer passed. Owner API smoke skipped (no SMOKE_OWNER_BEARER).');
  console.log('Next: SMOKE_OWNER_BEARER="<jwt>" npm run smoke:economics:owner');
  console.log('Then: layout checklist docs/PRODUCTION_ECONOMICS_SMOKE.md §15–23');
}

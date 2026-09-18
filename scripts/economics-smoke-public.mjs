#!/usr/bin/env node
/**
 * Public economics smoke (no owner auth).
 * Verifies deploy identity + health. Owner E2E still requires manual checklist.
 */
const BASE = process.env.SMOKE_BASE_URL || 'https://beta.persony.org';

async function main() {
  const healthUrl = `${BASE.replace(/\/$/, '')}/api/health`;
  const res = await fetch(healthUrl);
  if (!res.ok) {
    console.error(`FAIL health HTTP ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  const checks = [
    ['status', body.status === 'ok'],
    ['database', body.database === 'ready'],
    ['gitSha', typeof body.gitSha === 'string' && body.gitSha.length >= 7 && body.gitSha !== 'dev'],
    ['builtAt', typeof body.builtAt === 'string' && body.builtAt.length > 10],
  ];
  let failed = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? 'OK' : 'FAIL'} ${name}: ${JSON.stringify(body[name] ?? null)}`);
    if (!ok) failed += 1;
  }
  if (failed > 0) {
    console.error(`\n${failed} public smoke check(s) failed.`);
    console.error('Owner economics E2E: docs/PRODUCTION_ECONOMICS_SMOKE.md');
    process.exit(1);
  }

  const ownerGateUrl = `${BASE.replace(/\/$/, '')}/api/owner/economics`;
  const gateRes = await fetch(ownerGateUrl);
  const gateOk = gateRes.status === 401;
  console.log(`${gateOk ? 'OK' : 'FAIL'} owner_auth_gate: HTTP ${gateRes.status} (expect 401)`);
  if (!gateOk) {
    console.error('Owner economics route must reject unauthenticated requests.');
    process.exit(1);
  }

  console.log('\nPublic economics smoke passed.');
  console.log('Next: owner login → PRODUCTION_ECONOMICS_SMOKE.md (Milestone 1).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

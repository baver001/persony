#!/usr/bin/env node
/**
 * Owner-authenticated economics smoke (Milestone 1 helper).
 *
 * Usage:
 *   SMOKE_OWNER_BEARER="<clerk_jwt>" npm run smoke:economics:owner
 *
 * Copy Bearer token from beta: DevTools → Network → any /api/owner/* request → Authorization header.
 */
const BASE = (process.env.SMOKE_BASE_URL || 'https://beta.persony.org').replace(/\/$/, '');
const TOKEN = process.env.SMOKE_OWNER_BEARER?.trim();

async function ownerFetch(path) {
  if (!TOKEN) {
    console.error('Missing SMOKE_OWNER_BEARER (Clerk session JWT).');
    console.error('See docs/PRODUCTION_ECONOMICS_SMOKE.md');
    process.exit(1);
  }
  const res = await fetch(`${BASE}/api${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exit(1);
}

async function main() {
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  console.log(`OK health gitSha: ${health.gitSha}`);

  const economicsRes = await ownerFetch('/owner/economics');
  if (economicsRes.status === 401 || economicsRes.status === 403) {
    fail(`owner economics HTTP ${economicsRes.status} — not owner or token expired`);
  }
  if (economicsRes.status !== 200) {
    fail(`owner economics HTTP ${economicsRes.status}`);
  }
  const economics = economicsRes.body?.economics;
  if (!economics || typeof economics.costCoverageTodayPercent !== 'number') {
    fail('economics snapshot missing costCoverageTodayPercent');
  }
  console.log(
    `OK economics coverage=${economics.costCoverageTodayPercent}% unpricedToday=${economics.unpricedCallsToday}`
  );

  const pricingRes = await ownerFetch('/owner/pricing');
  if (pricingRes.status !== 200) fail(`owner pricing HTTP ${pricingRes.status}`);
  if (!pricingRes.body?.catalogVersion || !Array.isArray(pricingRes.body?.entries)) {
    fail('pricing response shape invalid');
  }
  console.log(
    `OK pricing catalog=${pricingRes.body.catalogVersion} entries=${pricingRes.body.entries.length}`
  );

  const inferenceRes = await ownerFetch('/owner/inference?limit=10');
  if (inferenceRes.status !== 200) fail(`owner inference HTTP ${inferenceRes.status}`);
  const items = inferenceRes.body?.items ?? [];
  console.log(`OK inference list total=${inferenceRes.body?.total ?? 0} sample=${items.length}`);

  if (items.length === 0) {
    console.log('\nWARN no inference runs yet — send a chat message on beta, then re-run.');
    console.log('Manual checklist: docs/PRODUCTION_ECONOMICS_SMOKE.md');
    process.exit(0);
  }

  const latest = items[0];
  const required = ['id', 'operationType', 'costConfidence', 'status'];
  for (const key of required) {
    if (latest[key] == null) fail(`latest inference missing ${key}`);
  }
  console.log(
    `OK latest inference id=${latest.id} op=${latest.operationType} confidence=${latest.costConfidence} cogs=${latest.providerCostMicrousd}`
  );

  const detailRes = await ownerFetch(`/owner/inference/${latest.id}`);
  if (detailRes.status !== 200) fail(`inference detail HTTP ${detailRes.status}`);
  const detail = detailRes.body?.inference;
  if (!detail?.costExplanation) fail('inference detail missing costExplanation');

  if (detail.costConfidence === 'unpriced' && detail.providerCostMicrousd != null) {
    fail('unpriced run has non-null providerCostMicrousd — economics truth violated');
  }
  if (detail.costExplanation.explainable && !detail.costExplanation.lines?.length) {
    fail('explainable cost without breakdown lines');
  }
  console.log(
    `OK detail explainable=${detail.costExplanation.explainable} lines=${detail.costExplanation.lines?.length ?? 0}`
  );

  console.log('\nOwner economics smoke passed (API layer).');
  console.log(`Record inference id in docs/GOAL_MODE_STATE.md: ${latest.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

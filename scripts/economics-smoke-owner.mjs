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

  const inferenceRes = await ownerFetch('/owner/inference?limit=25&operation=chat_text&status=completed');
  if (inferenceRes.status !== 200) fail(`owner inference HTTP ${inferenceRes.status}`);
  const items = inferenceRes.body?.items ?? [];
  console.log(
    `OK inference chat_text completed total=${inferenceRes.body?.total ?? 0} sample=${items.length}`
  );

  if (items.length === 0) {
    console.log('\nWARN no completed chat_text runs — send a chat message on beta, then re-run.');
    console.log('Manual checklist: docs/PRODUCTION_ECONOMICS_SMOKE.md');
    process.exit(0);
  }

  const target =
    items.find((row) => row.costCalculatedAt) ??
    items.find((row) => row.costConfidence === 'actual' || row.costConfidence === 'estimated') ??
    items[0];

  const required = ['id', 'operationType', 'costConfidence', 'status'];
  for (const key of required) {
    if (target[key] == null) fail(`target inference missing ${key}`);
  }
  console.log(
    `OK target id=${target.id} op=${target.operationType} confidence=${target.costConfidence} breakdown=${target.costCalculatedAt ? 'yes' : 'no'}`
  );

  const detailRes = await ownerFetch(`/owner/inference/${target.id}`);
  if (detailRes.status !== 200) fail(`inference detail HTTP ${detailRes.status}`);
  const detail = detailRes.body?.inference;
  if (!detail?.costExplanation) fail('inference detail missing costExplanation');

  if (detail.costConfidence === 'unpriced' && detail.providerCostMicrousd != null) {
    fail('unpriced run has non-null providerCostMicrousd — economics truth violated');
  }

  const knownCost =
    detail.costConfidence === 'actual' || detail.costConfidence === 'estimated';

  if (knownCost && !detail.costCalculatedAt) {
    console.log(
      `\nWARN ${target.id} is ${detail.costConfidence} but missing costCalculatedAt (pre–CostEngine 2.0).`
    );
    console.log('Send a fresh chat on beta after economics deploy, then re-run.');
    process.exit(0);
  }

  if (knownCost) {
    if (!detail.costExplanation.explainable) {
      fail(`known-cost chat_text ${target.id} is not explainable`);
    }
    if (!detail.costExplanation.lines?.length) {
      fail(`known-cost chat_text ${target.id} missing cost breakdown lines`);
    }
    const hasPositiveLine = detail.costExplanation.lines.some(
      (line) => typeof line.costMicrousd === 'number' && line.costMicrousd > 0
    );
    if (!hasPositiveLine) {
      fail(`known-cost chat_text ${target.id} has no positive COGS line items`);
    }
  }

  console.log(
    `OK detail explainable=${detail.costExplanation.explainable} lines=${detail.costExplanation.lines?.length ?? 0} calculatedAt=${detail.costCalculatedAt ?? '—'}`
  );

  console.log('\nOwner economics smoke passed (Milestone 1 API layer).');
  console.log(`Record inference id in docs/GOAL_MODE_STATE.md: ${target.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

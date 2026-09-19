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
    `OK economics coverage=${economics.costCoverageTodayPercent}% unpricedToday=${economics.unpricedCallsToday} knownCogsToday=${economics.aiCostTodayMicrousd}`
  );

  if (typeof economics.costCoverageTodayPercent !== 'number' || economics.costCoverageTodayPercent < 0) {
    fail('economics costCoverageTodayPercent invalid');
  }
  if (economics.unpricedCallsToday > 0 && economics.costCoverageTodayPercent === 100) {
    fail('economics reports 100% coverage but unpricedCallsToday > 0');
  }

  // Energy / retail separation — COGS is known cost; retail is simulated only
  if (typeof economics.energyConsumedToday !== 'number') {
    fail('economics missing energyConsumedToday');
  }
  if (typeof economics.simulatedRetailValueTodayMicrousd !== 'number') {
    fail('economics missing simulatedRetailValueTodayMicrousd');
  }
  if (economics.aiCostTodayMicrousd > 0 && economics.simulatedRetailValueTodayMicrousd <= economics.aiCostTodayMicrousd) {
    fail('simulated retail must exceed known COGS when COGS > 0');
  }
  console.log(
    `OK energy_retail energyToday=${economics.energyConsumedToday} simulatedRetail=${economics.simulatedRetailValueTodayMicrousd}`
  );

  const aiRes = await ownerFetch('/owner/ai/overview');
  if (aiRes.status !== 200) fail(`owner ai/overview HTTP ${aiRes.status}`);
  if (!Array.isArray(aiRes.body?.routingMatrix) || aiRes.body.routingMatrix.length === 0) {
    fail('ai/overview routingMatrix empty');
  }
  if (aiRes.body.billingEnabled === true) {
    fail('billingEnabled must be false on beta economics milestone');
  }
  console.log(`OK ai routingMatrix=${aiRes.body.routingMatrix.length} billingEnabled=false`);

  const batteryRes = await ownerFetch('/owner/battery/overview');
  if (batteryRes.status !== 200) fail(`owner battery/overview HTTP ${batteryRes.status}`);
  if (batteryRes.body?.metrics?.revenue != null || batteryRes.body?.metrics?.payments != null) {
    fail('battery overview must not expose revenue/payments before Paddle');
  }
  console.log('OK battery revenue=null payments=null');

  const usersRes = await ownerFetch('/owner/users');
  if (usersRes.status !== 200) fail(`owner users HTTP ${usersRes.status}`);
  if (!Array.isArray(usersRes.body?.users)) fail('users response shape invalid');
  console.log(`OK users count=${usersRes.body.users.length}`);

  const personasRes = await ownerFetch('/owner/personas/overview');
  if (personasRes.status !== 200) fail(`owner personas/overview HTTP ${personasRes.status}`);
  if (!Array.isArray(personasRes.body?.personas)) fail('personas response shape invalid');
  console.log(`OK personas count=${personasRes.body.personas.length}`);

  const errorsRes = await ownerFetch('/owner/errors/summary');
  if (errorsRes.status !== 200) fail(`owner errors/summary HTTP ${errorsRes.status}`);
  if (typeof errorsRes.body?.totalFailed !== 'number' || !Array.isArray(errorsRes.body?.recent)) {
    fail('errors summary shape invalid');
  }
  console.log(`OK errors totalFailed=${errorsRes.body.totalFailed} recent=${errorsRes.body.recent.length}`);

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

  const unpricedRes = await ownerFetch('/owner/inference?limit=5&costConfidence=unpriced');
  if (unpricedRes.status !== 200) fail(`owner unpriced inference HTTP ${unpricedRes.status}`);
  const unpricedItems = unpricedRes.body?.items ?? [];
  if (unpricedItems.length > 0) {
    const unpriced = unpricedItems[0];
    const unpricedDetailRes = await ownerFetch(`/owner/inference/${unpriced.id}`);
    if (unpricedDetailRes.status !== 200) fail(`unpriced detail HTTP ${unpricedDetailRes.status}`);
    const unpricedDetail = unpricedDetailRes.body?.inference;
    if (unpricedDetail?.providerCostMicrousd != null) {
      fail(`unpriced run ${unpriced.id} has providerCostMicrousd — economics truth violated`);
    }
    console.log(`OK unpriced_truth id=${unpriced.id} providerCost=null`);
  } else {
    console.log('OK unpriced_truth no unpriced rows in sample');
  }

  const voiceRes = await ownerFetch(
    '/owner/inference?limit=5&operation=voice_transcription&status=completed'
  );
  if (voiceRes.status !== 200) fail(`owner voice_transcription HTTP ${voiceRes.status}`);
  const voiceItems = voiceRes.body?.items ?? [];
  if (voiceItems.length > 0) {
    const voice = voiceItems.find((row) => row.costCalculatedAt) ?? voiceItems[0];
    console.log(
      `OK voice_transcription id=${voice.id} confidence=${voice.costConfidence} breakdown=${voice.costCalculatedAt ? 'yes' : 'no'}`
    );
  } else {
    console.log('WARN voice_transcription no completed runs — optional Milestone 1 gate');
  }

  console.log('\nOwner economics smoke passed (Milestone 1 API layer).');
  console.log(`Record inference id in docs/GOAL_MODE_STATE.md: ${target.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

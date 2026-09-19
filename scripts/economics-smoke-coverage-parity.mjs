#!/usr/bin/env node
/**
 * Cross-check D1 coverage % vs Owner economics API (requires JWT + wrangler).
 *
 *   SMOKE_OWNER_BEARER="<jwt>" npm run smoke:economics:parity
 */
import { execSync } from 'node:child_process';

const BASE = (process.env.SMOKE_BASE_URL || 'https://beta.persony.org').replace(/\/$/, '');
const TOKEN = process.env.SMOKE_OWNER_BEARER?.trim();

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exit(1);
}

function d1TodayCoverage() {
  const sql = `SELECT COUNT(*) AS total, SUM(CASE WHEN cost_confidence = 'unpriced' THEN 1 ELSE 0 END) AS unpriced FROM inference_runs WHERE started_at >= datetime('now', '-1 day')`;
  const oneLine = sql.replace(/\s+/g, ' ').trim();
  const cmd = `npx wrangler d1 execute persony-db --remote --command "${oneLine.replace(/"/g, '\\"')}" --json`;
  const out = execSync(cmd, { encoding: 'utf8', cwd: process.cwd(), shell: true });
  const parsed = JSON.parse(out);
  const block = Array.isArray(parsed) ? parsed[0] : parsed;
  const row = block?.results?.[0];
  const total = Number(row?.total ?? 0);
  const unpriced = Number(row?.unpriced ?? 0);
  if (total <= 0) return 100;
  return Math.round(((total - unpriced) / total) * 1000) / 10;
}

async function ownerTodayCoverage() {
  const res = await fetch(`${BASE}/api/owner/economics`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
  });
  if (res.status !== 200) fail(`owner economics HTTP ${res.status}`);
  const body = await res.json();
  const pct = body?.economics?.costCoverageTodayPercent;
  if (typeof pct !== 'number') fail('owner economics missing costCoverageTodayPercent');
  return pct;
}

async function main() {
  if (!TOKEN) {
    console.error('Missing SMOKE_OWNER_BEARER');
    process.exit(1);
  }

  const [d1Pct, ownerPct] = await Promise.all([d1TodayCoverage(), ownerTodayCoverage()]);
  console.log(`OK coverage_parity d1=${d1Pct}% owner=${ownerPct}%`);

  if (Math.abs(d1Pct - ownerPct) > 0.05) {
    fail(`D1 coverage ${d1Pct}% != owner API ${ownerPct}%`);
  }

  console.log('Coverage parity smoke passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

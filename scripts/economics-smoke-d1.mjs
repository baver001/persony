#!/usr/bin/env node
/**
 * Operator D1 economics smoke (no owner JWT).
 * Requires wrangler auth + remote D1 access.
 *
 *   npm run smoke:economics:d1
 */
import { execSync } from 'node:child_process';

function d1Query(sql) {
  const oneLine = sql.replace(/\s+/g, ' ').trim();
  const cmd = `npx wrangler d1 execute persony-db --remote --command "${oneLine.replace(/"/g, '\\"')}" --json`;
  const out = execSync(cmd, { encoding: 'utf8', cwd: process.cwd(), shell: true });
  const parsed = JSON.parse(out);
  const block = Array.isArray(parsed) ? parsed[0] : parsed;
  return block?.results ?? [];
}

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exit(1);
}

async function main() {
  const coverage = d1Query(
    `SELECT COUNT(*) AS total,
     SUM(CASE WHEN cost_confidence IN ('actual','estimated') THEN 1 ELSE 0 END) AS known,
     SUM(CASE WHEN cost_confidence = 'unpriced' THEN 1 ELSE 0 END) AS unpriced,
     SUM(CASE WHEN cost_calculated_at IS NOT NULL THEN 1 ELSE 0 END) AS with_breakdown
     FROM inference_runs WHERE started_at >= datetime('now', '-7 days')`
  )[0];

  console.log(
    `OK d1_7d total=${coverage.total} known=${coverage.known} unpriced=${coverage.unpriced} with_breakdown=${coverage.with_breakdown}`
  );

  const latest = d1Query(
    `SELECT id, operation_type, status, cost_confidence, provider_cost_microusd,
     pricing_entry_id, cost_calculated_at, usage_estimated
     FROM inference_runs ORDER BY started_at DESC LIMIT 1`
  )[0];

  if (!latest) {
    console.log('\nWARN no inference runs in production D1 — send a chat on beta first.');
    process.exit(0);
  }

  console.log(
    `OK latest id=${latest.id} op=${latest.operation_type} confidence=${latest.cost_confidence} breakdown=${latest.cost_calculated_at ? 'yes' : 'no'}`
  );

  if (latest.cost_calculated_at && latest.cost_confidence === 'unpriced') {
    fail('latest run has cost_calculated_at but cost_confidence=unpriced');
  }

  if (Number(coverage.with_breakdown) === 0) {
    if (
      (latest.cost_confidence === 'actual' || latest.cost_confidence === 'estimated') &&
      !latest.cost_calculated_at
    ) {
      console.log(
        `WARN latest ${latest.id} is ${latest.cost_confidence} but pre–CostEngine 2.0 (no cost_calculated_at)`
      );
    }
    console.log(
      '\nWARN no CostEngine 2.0 runs in last 7d — Milestone 1 needs a fresh chat after economics deploy.'
    );
    console.log(`Legacy latest run id: ${latest.id}`);
    process.exit(0);
  }

  if (
    (latest.cost_confidence === 'actual' || latest.cost_confidence === 'estimated') &&
    !latest.cost_calculated_at
  ) {
    fail(`known-cost run ${latest.id} missing cost_calculated_at`);
  }

  console.log('\nD1 economics smoke passed (operator layer).');
  console.log(`Record inference id in docs/GOAL_MODE_STATE.md: ${latest.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

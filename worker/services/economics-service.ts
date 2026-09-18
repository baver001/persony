import { toSqlCount } from '../lib/sql-count';

type PeriodRow = {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  known_cost_microusd: number;
  unpriced_calls: number;
  estimated_cost_calls: number;
  energy_charged: number;
  avg_latency_ms: number | null;
  fallback_runs: number;
};

const KNOWN_COST_SQL = `CASE WHEN cost_confidence IN ('actual', 'estimated') THEN provider_cost_microusd ELSE 0 END`;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

async function aggregatePeriod(
  db: D1Database,
  sinceIso: string
): Promise<PeriodRow> {
  const row = await db
    .prepare(
      `SELECT
         COUNT(*) AS total_calls,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS successful_calls,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_calls,
         COALESCE(SUM(${KNOWN_COST_SQL}), 0) AS known_cost_microusd,
         SUM(CASE WHEN cost_confidence = 'unpriced' THEN 1 ELSE 0 END) AS unpriced_calls,
         SUM(CASE WHEN cost_confidence = 'estimated' THEN 1 ELSE 0 END) AS estimated_cost_calls,
         COALESCE(SUM(energy_charged), 0) AS energy_charged,
         AVG(latency_ms) AS avg_latency_ms,
         SUM(CASE WHEN fallback_count > 0 THEN 1 ELSE 0 END) AS fallback_runs
       FROM inference_runs
       WHERE started_at >= ?`
    )
    .bind(sinceIso)
    .first<PeriodRow>();

  return (
    row ?? {
      total_calls: 0,
      successful_calls: 0,
      failed_calls: 0,
      known_cost_microusd: 0,
      unpriced_calls: 0,
      estimated_cost_calls: 0,
      energy_charged: 0,
      avg_latency_ms: null,
      fallback_runs: 0,
    }
  );
}

function coverageFromRow(row: PeriodRow): number {
  const pricedCalls = row.total_calls - row.unpriced_calls;
  if (row.total_calls <= 0) return 100;
  return Math.round((pricedCalls / row.total_calls) * 1000) / 10;
}

export type OwnerEconomicsSnapshot = {
  /** Known AI COGS only — excludes unpriced inferences. */
  aiCostTodayMicrousd: number;
  aiCost7dMicrousd: number;
  aiCost30dMicrousd: number;
  costCoverageTodayPercent: number;
  costCoverage7dPercent: number;
  unpricedCallsToday: number;
  estimatedCostCallsToday: number;
  energyConsumedToday: number;
  callsToday: number;
  successfulCallsToday: number;
  failedCallsToday: number;
  avgLatencyMsToday: number | null;
  fallbackRateToday: number;
  costByProvider: Array<{ provider: string; costMicrousd: number; calls: number }>;
  costByModel: Array<{ provider: string; model: string; costMicrousd: number; calls: number }>;
  activeUsersWithInference7d: number;
};

export async function getOwnerEconomicsSnapshot(
  db: D1Database
): Promise<OwnerEconomicsSnapshot> {
  const today = aggregatePeriod(db, isoDaysAgo(1));
  const last7 = aggregatePeriod(db, isoDaysAgo(7));
  const last30 = aggregatePeriod(db, isoDaysAgo(30));

  const [todayRow, row7, row30, byProvider, byModel, activeUsers] = await Promise.all([
    today,
    last7,
    last30,
    db
      .prepare(
        `SELECT COALESCE(actual_provider, provider, 'unknown') AS provider,
                COALESCE(SUM(${KNOWN_COST_SQL}), 0) AS cost_microusd,
                COUNT(*) AS calls
         FROM inference_runs
         WHERE started_at >= ?
         GROUP BY COALESCE(actual_provider, provider, 'unknown')
         ORDER BY cost_microusd DESC`
      )
      .bind(isoDaysAgo(7))
      .all<{ provider: string; cost_microusd: number; calls: number }>(),
    db
      .prepare(
        `SELECT COALESCE(actual_provider, provider, 'unknown') AS provider,
                COALESCE(actual_model, model, 'unknown') AS model,
                COALESCE(SUM(${KNOWN_COST_SQL}), 0) AS cost_microusd,
                COUNT(*) AS calls
         FROM inference_runs
         WHERE started_at >= ?
         GROUP BY COALESCE(actual_provider, provider, 'unknown'),
                  COALESCE(actual_model, model, 'unknown')
         ORDER BY cost_microusd DESC
         LIMIT 20`
      )
      .bind(isoDaysAgo(7))
      .all<{ provider: string; model: string; cost_microusd: number; calls: number }>(),
    db
      .prepare(
        `SELECT COUNT(DISTINCT user_id) AS count
         FROM inference_runs
         WHERE started_at >= ?`
      )
      .bind(isoDaysAgo(7))
      .first<{ count: number }>(),
  ]);

  const totalToday = todayRow.total_calls || 0;
  const fallbackRateToday =
    totalToday > 0 ? todayRow.fallback_runs / totalToday : 0;

  return {
    aiCostTodayMicrousd: todayRow.known_cost_microusd,
    aiCost7dMicrousd: row7.known_cost_microusd,
    aiCost30dMicrousd: row30.known_cost_microusd,
    costCoverageTodayPercent: coverageFromRow(todayRow),
    costCoverage7dPercent: coverageFromRow(row7),
    unpricedCallsToday: todayRow.unpriced_calls,
    estimatedCostCallsToday: todayRow.estimated_cost_calls,
    energyConsumedToday: todayRow.energy_charged,
    callsToday: todayRow.total_calls,
    successfulCallsToday: todayRow.successful_calls,
    failedCallsToday: todayRow.failed_calls,
    avgLatencyMsToday: todayRow.avg_latency_ms,
    fallbackRateToday,
    costByProvider: (byProvider.results ?? []).map((r) => ({
      provider: r.provider,
      costMicrousd: r.cost_microusd,
      calls: r.calls,
    })),
    costByModel: (byModel.results ?? []).map((r) => ({
      provider: r.provider,
      model: r.model,
      costMicrousd: r.cost_microusd,
      calls: r.calls,
    })),
    activeUsersWithInference7d: toSqlCount(activeUsers),
  };
}

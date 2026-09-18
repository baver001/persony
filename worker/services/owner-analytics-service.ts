import { toSqlCount } from '../lib/sql-count';

const KNOWN_COST_SQL = `CASE WHEN cost_confidence IN ('actual', 'estimated') THEN provider_cost_microusd ELSE 0 END`;

export type OwnerPersonaAnalyticsRow = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  inferenceCount30d: number;
  knownCostMicrousd30d: number;
  unpricedCount30d: number;
};

export type OwnerUserAnalyticsRow = {
  id: string;
  authProviderId: string | null;
  preferredLocale: string | null;
  createdAt: string;
  inferenceCount7d: number;
  knownCostMicrousd7d: number;
};

export async function getOwnerPersonasAnalytics(
  db: D1Database
): Promise<OwnerPersonaAnalyticsRow[]> {
  const { results } = await db
    .prepare(
      `SELECT
         p.id,
         p.name,
         p.slug,
         p.status,
         COUNT(ir.id) AS inference_count_30d,
         COALESCE(SUM(${KNOWN_COST_SQL}), 0) AS known_cost_microusd_30d,
         SUM(CASE WHEN ir.cost_confidence = 'unpriced' THEN 1 ELSE 0 END) AS unpriced_count_30d
       FROM personas p
       LEFT JOIN inference_runs ir
         ON ir.persona_id = p.id
        AND ir.started_at >= datetime('now', '-30 days')
       GROUP BY p.id
       ORDER BY inference_count_30d DESC, p.name ASC
       LIMIT 50`
    )
    .all<{
      id: string;
      name: string;
      slug: string | null;
      status: string;
      inference_count_30d: number;
      known_cost_microusd_30d: number;
      unpriced_count_30d: number;
    }>();

  return (results ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    inferenceCount30d: toSqlCount({ count: row.inference_count_30d }),
    knownCostMicrousd30d: row.known_cost_microusd_30d ?? 0,
    unpricedCount30d: toSqlCount({ count: row.unpriced_count_30d }),
  }));
}

export async function getOwnerUsersAnalytics(db: D1Database): Promise<OwnerUserAnalyticsRow[]> {
  const { results } = await db
    .prepare(
      `SELECT
         u.id,
         u.auth_provider_id,
         u.preferred_locale,
         u.created_at,
         COUNT(ir.id) AS inference_count_7d,
         COALESCE(SUM(${KNOWN_COST_SQL}), 0) AS known_cost_microusd_7d
       FROM users u
       LEFT JOIN inference_runs ir
         ON ir.user_id = u.id
        AND ir.started_at >= datetime('now', '-7 days')
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT 25`
    )
    .all<{
      id: string;
      auth_provider_id: string | null;
      preferred_locale: string | null;
      created_at: string;
      inference_count_7d: number;
      known_cost_microusd_7d: number;
    }>();

  return (results ?? []).map((row) => ({
    id: row.id,
    authProviderId: row.auth_provider_id,
    preferredLocale: row.preferred_locale,
    createdAt: row.created_at,
    inferenceCount7d: toSqlCount({ count: row.inference_count_7d }),
    knownCostMicrousd7d: row.known_cost_microusd_7d ?? 0,
  }));
}

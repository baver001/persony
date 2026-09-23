import { Hono } from 'hono';
import { z } from 'zod';
import { toSqlCount } from '../lib/sql-count';
import { AuthRequiredError } from '../middleware/auth';
import { RoleRequiredError, requireOwnerAccess } from '../middleware/roles';
import { DEFAULT_BATTERY_CONFIG } from '../billing/battery-config';
import { listCatalogEntries, pricingFreshness } from '../billing/pricing-catalog';
import type { PricingDimension, PricingTier, PricingUnit, TimeRule } from '../billing/pricing-types';
import {
  createDbPricingEntry,
  loadMergedPricingCatalog,
} from '../repositories/pricing-catalog-repository';
import { getSystemSetting, setSystemSetting } from '../repositories/settings-repository';
import { writeAuditLog } from '../services/audit-service';
import type { CostConfidence } from '../billing/cost-confidence';
import { listOwnerRoutingMatrix } from '../ai/model-registry';
import { getOwnerEconomicsSnapshot } from '../services/economics-service';
import {
  getOwnerInferenceDetail,
  getOwnerInferenceList,
} from '../services/inference-explorer-service';
import {
  getOwnerErrorsSummary,
  getOwnerPersonasAnalytics,
  getOwnerUsersAnalytics,
} from '../services/owner-analytics-service';
import { getBatteryTopupClickStats } from '../repositories/product-analytics-repository';
import { ownerAdjustBattery } from '../services/energy-service';
import type { PersonyEnv } from '../types/env';

export const ownerRoutes = new Hono<{ Bindings: PersonyEnv }>();

ownerRoutes.use('*', async (c, next) => {
  c.header('X-Robots-Tag', 'noindex, nofollow, noarchive');
  c.header('Cache-Control', 'no-store, private');
  c.header('X-Content-Type-Options', 'nosniff');
  await next();
});

function ownerErrorResponse(c: { json: (body: unknown, status: number) => Response }, err: unknown) {
  if (err instanceof AuthRequiredError) {
    return c.json({ error_code: 'AUTH_REQUIRED' }, 401);
  }
  if (err instanceof RoleRequiredError) {
    return c.json({ error_code: 'FORBIDDEN' }, 403);
  }
  console.error('[owner]', err);
  return c.json({ error_code: 'INTERNAL_ERROR' }, 500);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function trendDelta(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

async function countSince(
  db: D1Database,
  sql: string,
  sinceIso: string,
  untilIso?: string
): Promise<number> {
  const query = untilIso ? `${sql} AND started_at < ?` : sql;
  const stmt = db.prepare(query);
  const row = untilIso
    ? await stmt.bind(sinceIso, untilIso).first<{ count: number }>()
    : await stmt.bind(sinceIso).first<{ count: number }>();
  return toSqlCount(row);
}

ownerRoutes.get('/owner/overview', async (c) => {
  try {
    const { userId } = await requireOwnerAccess(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);

    const since24h = isoDaysAgo(1);
    const since48h = isoDaysAgo(2);
    const since7d = isoDaysAgo(7);
    const since14d = isoDaysAgo(14);
    const since30d = isoDaysAgo(30);
    const since60d = isoDaysAgo(60);
    const since90d = isoDaysAgo(90);
    const since180d = isoDaysAgo(180);

    const [users, messages, personas, inferenceErrors, newUsers24h, dau, aiCalls24h, aiCalls7d, voiceCalls24h] =
      await Promise.all([
        c.env.DB.prepare(`SELECT COUNT(*) as count FROM users`).first<{ count: number }>(),
        c.env.DB.prepare(`SELECT COUNT(*) as count FROM messages`).first<{ count: number }>(),
        c.env.DB
          .prepare(`SELECT COUNT(*) as count FROM personas WHERE status = 'active'`)
          .first<{ count: number }>(),
        c.env.DB
          .prepare(`SELECT COUNT(*) as count FROM inference_runs WHERE status = 'failed'`)
          .first<{ count: number }>(),
        c.env.DB
          .prepare(`SELECT COUNT(*) as count FROM users WHERE created_at >= ?`)
          .bind(since24h)
          .first<{ count: number }>(),
        c.env.DB
          .prepare(
            `SELECT COUNT(DISTINCT user_id) as count FROM inference_runs WHERE started_at >= ?`
          )
          .bind(since24h)
          .first<{ count: number }>(),
        c.env.DB
          .prepare(`SELECT COUNT(*) as count FROM inference_runs WHERE started_at >= ?`)
          .bind(since24h)
          .first<{ count: number }>(),
        c.env.DB
          .prepare(`SELECT COUNT(*) as count FROM inference_runs WHERE started_at >= ?`)
          .bind(since7d)
          .first<{ count: number }>(),
        c.env.DB
          .prepare(
            `SELECT COUNT(*) as count FROM inference_runs WHERE started_at >= ? AND operation_type = 'voice_call'`
          )
          .bind(since24h)
          .first<{ count: number }>(),
      ]);

    const kpis = {
      totalUsers: toSqlCount(users),
      newUsers24h: toSqlCount(newUsers24h),
      dau: toSqlCount(dau),
      aiCalls24h: toSqlCount(aiCalls24h),
      aiCalls7d: toSqlCount(aiCalls7d),
      voiceCalls24h: toSqlCount(voiceCalls24h),
      activePersonas: toSqlCount(personas),
      failedInferenceRuns: toSqlCount(inferenceErrors),
      totalMessages: toSqlCount(messages),
    };

    const [
      aiCallsPrev24h,
      aiCalls7dWindow,
      aiCallsPrev7d,
      aiCalls30d,
      aiCallsPrev30d,
      aiCalls90d,
      aiCallsPrev90d,
      dau7d,
      dauPrev7d,
      voice7d,
      voicePrev7d,
      dauPrev24h,
    ] = await Promise.all([
      countSince(
        c.env.DB,
        `SELECT COUNT(*) as count FROM inference_runs WHERE started_at >= ?`,
        since48h,
        since24h
      ),
      countSince(
        c.env.DB,
        `SELECT COUNT(*) as count FROM inference_runs WHERE started_at >= ?`,
        since7d
      ),
      countSince(
        c.env.DB,
        `SELECT COUNT(*) as count FROM inference_runs WHERE started_at >= ?`,
        since14d,
        since7d
      ),
      countSince(
        c.env.DB,
        `SELECT COUNT(*) as count FROM inference_runs WHERE started_at >= ?`,
        since30d
      ),
      countSince(
        c.env.DB,
        `SELECT COUNT(*) as count FROM inference_runs WHERE started_at >= ?`,
        since60d,
        since30d
      ),
      countSince(
        c.env.DB,
        `SELECT COUNT(*) as count FROM inference_runs WHERE started_at >= ?`,
        since90d
      ),
      countSince(
        c.env.DB,
        `SELECT COUNT(*) as count FROM inference_runs WHERE started_at >= ?`,
        since180d,
        since90d
      ),
      countSince(
        c.env.DB,
        `SELECT COUNT(DISTINCT user_id) as count FROM inference_runs WHERE started_at >= ?`,
        since7d
      ),
      countSince(
        c.env.DB,
        `SELECT COUNT(DISTINCT user_id) as count FROM inference_runs WHERE started_at >= ?`,
        since14d,
        since7d
      ),
      countSince(
        c.env.DB,
        `SELECT COUNT(*) as count FROM inference_runs WHERE started_at >= ? AND operation_type = 'voice_call'`,
        since7d
      ),
      countSince(
        c.env.DB,
        `SELECT COUNT(*) as count FROM inference_runs WHERE started_at >= ? AND operation_type = 'voice_call'`,
        since14d,
        since7d
      ),
      countSince(
        c.env.DB,
        `SELECT COUNT(DISTINCT user_id) as count FROM inference_runs WHERE started_at >= ?`,
        since48h,
        since24h
      ),
    ]);

    const periods = {
      '24h': {
        aiCalls: kpis.aiCalls24h,
        dau: kpis.dau,
        newUsers: kpis.newUsers24h,
        voiceCalls: kpis.voiceCalls24h,
      },
      '7d': { aiCalls: aiCalls7dWindow, dau: dau7d, voiceCalls: voice7d },
      '30d': { aiCalls: aiCalls30d },
      '90d': { aiCalls: aiCalls90d },
    };

    const trends = {
      '24h': {
        aiCalls: { current: kpis.aiCalls24h, previous: aiCallsPrev24h, deltaPercent: trendDelta(kpis.aiCalls24h, aiCallsPrev24h) },
        dau: {
          current: kpis.dau,
          previous: dauPrev24h,
          deltaPercent: trendDelta(kpis.dau, dauPrev24h),
        },
      },
      '7d': {
        aiCalls: { current: aiCalls7dWindow, previous: aiCallsPrev7d, deltaPercent: trendDelta(aiCalls7dWindow, aiCallsPrev7d) },
        dau: { current: dau7d, previous: dauPrev7d, deltaPercent: trendDelta(dau7d, dauPrev7d) },
        voiceCalls: { current: voice7d, previous: voicePrev7d, deltaPercent: trendDelta(voice7d, voicePrev7d) },
      },
      '30d': {
        aiCalls: { current: aiCalls30d, previous: aiCallsPrev30d, deltaPercent: trendDelta(aiCalls30d, aiCallsPrev30d) },
      },
      '90d': {
        aiCalls: { current: aiCalls90d, previous: aiCallsPrev90d, deltaPercent: trendDelta(aiCalls90d, aiCallsPrev90d) },
      },
    };

    return c.json({
      kpis,
      periods,
      trends,
      metrics: {
        totalUsers: kpis.totalUsers,
        totalMessages: kpis.totalMessages,
        activePersonas: kpis.activePersonas,
        failedInferenceRuns: kpis.failedInferenceRuns,
        revenue: null,
        aiCogs: null,
        grossMargin: null,
      },
      whatChanged: [
        'Beta RC: billing hidden; Rooms hidden',
        'Owner overview KPIs + period trends (24h/7d/30d/90d)',
        'Avatar generation on gemini-3.1-flash-image',
        'Persona lifecycle E2E green on beta.persony.org',
      ],
      actorUserId: userId,
    });
  } catch (err) {
    return ownerErrorResponse(c, err);
  }
});

ownerRoutes.get('/owner/system/settings', async (c) => {
  try {
    await requireOwnerAccess(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);
    const [maintenance, featured, batteryEnabled, batteryMode, targetMargin] = await Promise.all([
      getSystemSetting(c.env.DB, 'maintenance_mode'),
      getSystemSetting(c.env.DB, 'featured_personas'),
      getSystemSetting(c.env.DB, 'battery_enabled'),
      getSystemSetting(c.env.DB, 'battery_mode'),
      getSystemSetting(c.env.DB, 'target_ai_gross_margin'),
    ]);
    return c.json({
      settings: {
        maintenance_mode: maintenance ?? false,
        featured_personas: featured ?? [],
        battery_enabled:
          typeof batteryEnabled === 'boolean' ? batteryEnabled : DEFAULT_BATTERY_CONFIG.battery_enabled,
        battery_mode:
          typeof batteryMode === 'string' ? batteryMode : DEFAULT_BATTERY_CONFIG.battery_mode,
        target_ai_gross_margin: typeof targetMargin === 'number' ? targetMargin : null,
      },
    });
  } catch (err) {
    return ownerErrorResponse(c, err);
  }
});

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  reason: z.string().optional(),
});

ownerRoutes.put('/owner/system/settings', async (c) => {
  try {
    const { userId } = await requireOwnerAccess(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);
    const body = await c.req.json();
    const parsed = settingSchema.safeParse(body);
    if (!parsed.success) return c.json({ error_code: 'INVALID_PAYLOAD' }, 400);

    const oldValue = await getSystemSetting(c.env.DB, parsed.data.key);
    await setSystemSetting(c.env.DB, parsed.data.key, parsed.data.value, userId, parsed.data.reason);
    await writeAuditLog(c.env.DB, {
      actorUserId: userId,
      action: 'system_setting_updated',
      targetType: 'system_setting',
      targetId: parsed.data.key,
      oldState: oldValue,
      newState: parsed.data.value,
      reason: parsed.data.reason,
    });

    return c.json({ ok: true });
  } catch (err) {
    return ownerErrorResponse(c, err);
  }
});

ownerRoutes.get('/owner/economics', async (c) => {
  try {
    await requireOwnerAccess(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);
    const economics = await getOwnerEconomicsSnapshot(c.env.DB);
    return c.json({ economics });
  } catch (err) {
    return ownerErrorResponse(c, err);
  }
});

ownerRoutes.get('/owner/inference', async (c) => {
  try {
    await requireOwnerAccess(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);

    const limit = Number(c.req.query('limit') || '50');
    const offset = Number(c.req.query('offset') || '0');
    const fallback = c.req.query('fallback');
    const costConfidence = c.req.query('costConfidence') as CostConfidence | undefined;

    const result = await getOwnerInferenceList(c.env.DB, {
      since: c.req.query('since') || undefined,
      until: c.req.query('until') || undefined,
      operation: c.req.query('operation') || undefined,
      provider: c.req.query('provider') || undefined,
      model: c.req.query('model') || undefined,
      status: c.req.query('status') || undefined,
      costConfidence,
      userId: c.req.query('userId') || undefined,
      personaId: c.req.query('personaId') || undefined,
      fallback:
        fallback === 'yes' || fallback === 'no' ? fallback : undefined,
      limit,
      offset,
    });

    return c.json(result);
  } catch (err) {
    return ownerErrorResponse(c, err);
  }
});

ownerRoutes.get('/owner/inference/:id', async (c) => {
  try {
    await requireOwnerAccess(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);

    const detail = await getOwnerInferenceDetail(c.env.DB, c.req.param('id'));
    if (!detail) return c.json({ error_code: 'NOT_FOUND' }, 404);
    return c.json({ inference: detail });
  } catch (err) {
    return ownerErrorResponse(c, err);
  }
});

const pricingDimensionSchema = z.enum([
  'text_input',
  'text_output',
  'cached_input',
  'audio_input',
  'audio_output',
  'image_input',
  'image_output',
  'video_input',
  'per_image',
  'per_minute',
  'context_cache_storage',
  'provider_surcharge',
]);

const createPricingEntrySchema = z.object({
  id: z.string().min(1).max(128).optional(),
  provider: z.enum(['google', 'deepseek']),
  model: z.string().min(1).max(128),
  dimension: pricingDimensionSchema,
  priceMicrousdPerUnit: z.number().int().positive(),
  unit: z.enum(['per_million_tokens', 'per_image', 'per_minute', 'per_gib_hour']),
  effectiveFrom: z.string().min(10).max(40),
  effectiveTo: z.string().min(10).max(40).nullable().optional(),
  pricingTier: z.enum(['default', 'cache_hit', 'cache_miss']).optional(),
  timeRule: z.enum(['any', 'peak', 'off_peak']).optional(),
  sourceReference: z.string().min(1).max(512),
  verifiedAt: z.string().min(10).max(40),
  reason: z.string().min(1).max(500),
});

ownerRoutes.get('/owner/pricing', async (c) => {
  try {
    await requireOwnerAccess(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);

    const provider = c.req.query('provider');
    const model = c.req.query('model');
    const { entries: catalog, catalogVersion, dbEntryIds } = await loadMergedPricingCatalog(
      c.env.DB
    );
    const entries = listCatalogEntries({ provider, model }, catalog).map((e) => ({
      id: e.id,
      provider: e.provider,
      model: e.model,
      dimension: e.dimension,
      priceMicrousdPerUnit: e.priceMicrousdPerUnit,
      unit: e.unit,
      currency: e.currency,
      pricingTier: e.pricingTier,
      timeRule: e.timeRule,
      effectiveFrom: e.effectiveFrom,
      effectiveTo: e.effectiveTo,
      sourceReference: e.sourceReference,
      verifiedAt: e.verifiedAt,
      freshness: pricingFreshness(e.verifiedAt),
      source: dbEntryIds.has(e.id) ? 'db' : 'code',
    }));
    return c.json({
      catalogVersion,
      entries,
    });
  } catch (err) {
    return ownerErrorResponse(c, err);
  }
});

ownerRoutes.post('/owner/pricing/entries', async (c) => {
  try {
    const { userId } = await requireOwnerAccess(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);

    const body = await c.req.json();
    const parsed = createPricingEntrySchema.safeParse(body);
    if (!parsed.success) return c.json({ error_code: 'INVALID_PAYLOAD' }, 400);

    try {
      const created = await createDbPricingEntry(c.env.DB, userId, {
        id: parsed.data.id,
        provider: parsed.data.provider,
        model: parsed.data.model,
        dimension: parsed.data.dimension as PricingDimension,
        priceMicrousdPerUnit: parsed.data.priceMicrousdPerUnit,
        unit: parsed.data.unit as PricingUnit,
        effectiveFrom: parsed.data.effectiveFrom,
        effectiveTo: parsed.data.effectiveTo ?? null,
        pricingTier: parsed.data.pricingTier as PricingTier | undefined,
        timeRule: parsed.data.timeRule as TimeRule | undefined,
        sourceReference: parsed.data.sourceReference,
        verifiedAt: parsed.data.verifiedAt,
        reason: parsed.data.reason,
      });
      return c.json({ entry: created }, 201);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'PRICING_ENTRY_EXISTS') {
          return c.json({ error_code: 'PRICING_ENTRY_EXISTS' }, 409);
        }
        if (err.message === 'PRICING_ENTRY_ID_RESERVED') {
          return c.json({ error_code: 'PRICING_ENTRY_ID_RESERVED' }, 409);
        }
      }
      throw err;
    }
  } catch (err) {
    return ownerErrorResponse(c, err);
  }
});

ownerRoutes.get('/owner/ai/overview', async (c) => {
  try {
    await requireOwnerAccess(c);
    const provider =
      c.env.DB
        ? ((await getSystemSetting(c.env.DB, 'chat_text_provider')) as string | null)
        : null;

    return c.json({
      chatTextProvider: provider ?? 'google',
      providers: {
        google: { configured: Boolean(c.env.GEMINI_API_KEY?.trim()) },
        deepseek: { configured: Boolean(c.env.DEEPSEEK_API_KEY?.trim()) },
      },
      billingEnabled: c.env.BILLING_ENABLED === 'true',
      routingMatrix: listOwnerRoutingMatrix(),
    });
  } catch (err) {
    return ownerErrorResponse(c, err);
  }
});

ownerRoutes.get('/owner/battery/overview', async (c) => {
  try {
    await requireOwnerAccess(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);

    const [wallets, usageToday, regenToday, topupClicks] = await Promise.all([
      c.env.DB.prepare(`SELECT COUNT(*) as count FROM energy_wallets`).first<{ count: number }>(),
      c.env.DB
        .prepare(
          `SELECT COUNT(*) as count FROM energy_ledger
           WHERE type = 'usage' AND date(created_at) = date('now')`
        )
        .first<{ count: number }>(),
      c.env.DB
        .prepare(
          `SELECT COUNT(*) as count FROM energy_ledger
           WHERE type = 'beta_regeneration' AND date(created_at) = date('now')`
        )
        .first<{ count: number }>(),
      getBatteryTopupClickStats(c.env.DB),
    ]);

    const config = DEFAULT_BATTERY_CONFIG;
    for (const key of Object.keys(DEFAULT_BATTERY_CONFIG)) {
      const value = await getSystemSetting(c.env.DB, key);
      if (typeof value === 'number' || typeof value === 'boolean' || value === 'beta_regen' || value === 'paid') {
        (config as Record<string, unknown>)[key] = value;
      }
    }

    return c.json({
      metrics: {
        walletCount: toSqlCount(wallets),
        usageEventsToday: toSqlCount(usageToday),
        regenerationEventsToday: toSqlCount(regenToday),
        topupClicksTotal: topupClicks.totalClicks,
        topupClicksUniqueUsers: topupClicks.uniqueUsers,
        revenue: null,
        payments: null,
      },
      config,
      topupClicksByUser: topupClicks.byUser,
    });
  } catch (err) {
    return ownerErrorResponse(c, err);
  }
});

const ownerBatteryAdjustSchema = z.object({
  targetPercentage: z.number().min(0).max(100),
  reason: z.string().max(500).optional(),
});

ownerRoutes.get('/owner/users', async (c) => {
  try {
    await requireOwnerAccess(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);

    const users = await getOwnerUsersAnalytics(c.env.DB);
    return c.json({ users });
  } catch (err) {
    return ownerErrorResponse(c, err);
  }
});

ownerRoutes.get('/owner/errors/summary', async (c) => {
  try {
    await requireOwnerAccess(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);

    const summary = await getOwnerErrorsSummary(c.env.DB);
    return c.json(summary);
  } catch (err) {
    return ownerErrorResponse(c, err);
  }
});

ownerRoutes.get('/owner/personas/overview', async (c) => {
  try {
    await requireOwnerAccess(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);

    const personas = await getOwnerPersonasAnalytics(c.env.DB);
    return c.json({ personas });
  } catch (err) {
    return ownerErrorResponse(c, err);
  }
});

ownerRoutes.get('/owner/memory/stats', async (c) => {
  try {
    await requireOwnerAccess(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);

    const [memories, pending, relationship] = await Promise.all([
      c.env.DB.prepare(`SELECT COUNT(*) as count FROM memories WHERE status = 'active'`).first<{ count: number }>(),
      c.env.DB.prepare(`SELECT COUNT(*) as count FROM memory_candidates WHERE status = 'pending'`).first<{ count: number }>(),
      c.env.DB.prepare(`SELECT COUNT(*) as count FROM memories WHERE scope = 'relationship' AND status = 'active'`).first<{ count: number }>(),
    ]);

    return c.json({
      stats: {
        activeMemories: toSqlCount(memories),
        pendingCandidates: toSqlCount(pending),
        relationshipMemories: toSqlCount(relationship),
      },
    });
  } catch (err) {
    return ownerErrorResponse(c, err);
  }
});

ownerRoutes.get('/owner/audit', async (c) => {
  try {
    await requireOwnerAccess(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);

    const { results } = await c.env.DB.prepare(
      `SELECT id, actor_user_id, action, target_type, target_id, created_at
       FROM audit_log ORDER BY created_at DESC LIMIT 30`
    ).all<{
      id: string;
      actor_user_id: string;
      action: string;
      target_type: string;
      target_id: string;
      created_at: string;
    }>();

    return c.json({
      entries: (results ?? []).map((row) => ({
        id: row.id,
        actorUserId: row.actor_user_id,
        action: row.action,
        targetType: row.target_type,
        targetId: row.target_id,
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    return ownerErrorResponse(c, err);
  }
});

ownerRoutes.post('/owner/users/:userId/battery/reset', async (c) => {
  try {
    const { userId: actorId } = await requireOwnerAccess(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);
    const targetUserId = c.req.param('userId');
    const body = await c.req.json().catch(() => ({}));
    const parsed = ownerBatteryAdjustSchema.safeParse(body);
    const targetPct = parsed.success ? parsed.data.targetPercentage : 100;

    const snapshot = await ownerAdjustBattery(
      c.env.DB,
      targetUserId,
      targetPct,
      actorId,
      parsed.success ? parsed.data.reason : 'owner_reset'
    );

    await writeAuditLog(c.env.DB, {
      actorUserId: actorId,
      action: 'owner_battery_adjustment',
      targetType: 'user',
      targetId: targetUserId,
      newState: snapshot,
      reason: parsed.success ? parsed.data.reason : 'owner_reset',
    });

    return c.json({ battery: snapshot });
  } catch (err) {
    return ownerErrorResponse(c, err);
  }
});

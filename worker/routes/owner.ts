import { Hono } from 'hono';
import { z } from 'zod';
import { toSqlCount } from '../lib/sql-count';
import { AuthRequiredError } from '../middleware/auth';
import { RoleRequiredError, requireOwnerAccess } from '../middleware/roles';
import { DEFAULT_BATTERY_CONFIG } from '../billing/battery-config';
import { getSystemSetting, setSystemSetting } from '../repositories/settings-repository';
import { writeAuditLog } from '../services/audit-service';
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

ownerRoutes.get('/owner/overview', async (c) => {
  try {
    const { userId } = await requireOwnerAccess(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);

    const [users, messages, personas, inferenceErrors] = await Promise.all([
      c.env.DB.prepare(`SELECT COUNT(*) as count FROM users`).first<{ count: number }>(),
      c.env.DB.prepare(`SELECT COUNT(*) as count FROM messages`).first<{ count: number }>(),
      c.env.DB
        .prepare(`SELECT COUNT(*) as count FROM personas WHERE status = 'active'`)
        .first<{ count: number }>(),
      c.env.DB
        .prepare(`SELECT COUNT(*) as count FROM inference_runs WHERE status = 'failed'`)
        .first<{ count: number }>(),
    ]);

    return c.json({
      metrics: {
        totalUsers: toSqlCount(users),
        totalMessages: toSqlCount(messages),
        activePersonas: toSqlCount(personas),
        failedInferenceRuns: toSqlCount(inferenceErrors),
        revenue: null,
        aiCogs: null,
        grossMargin: null,
      },
      whatChanged: [
        'Phase 1.2 owner console online',
        'Athena-only default install enabled',
        'Memory and PersonaSpec foundation active',
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
    const maintenance = await getSystemSetting(c.env.DB, 'maintenance_mode');
    const featured = await getSystemSetting(c.env.DB, 'featured_personas');
    return c.json({ settings: { maintenance_mode: maintenance, featured_personas: featured } });
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

ownerRoutes.get('/owner/battery/overview', async (c) => {
  try {
    await requireOwnerAccess(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);

    const [wallets, usageToday, regenToday] = await Promise.all([
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
        revenue: null,
        payments: null,
      },
      config,
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

    const { results } = await c.env.DB.prepare(
      `SELECT id, auth_provider_id, preferred_locale, created_at
       FROM users ORDER BY created_at DESC LIMIT 25`
    ).all<{
      id: string;
      auth_provider_id: string | null;
      preferred_locale: string | null;
      created_at: string;
    }>();

    return c.json({
      users: (results ?? []).map((row) => ({
        id: row.id,
        authProviderId: row.auth_provider_id,
        preferredLocale: row.preferred_locale,
        createdAt: row.created_at,
      })),
    });
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

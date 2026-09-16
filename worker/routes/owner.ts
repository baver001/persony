import { Hono } from 'hono';
import { z } from 'zod';
import { writeAuditLog } from '../services/audit-service';
import { RoleRequiredError, requireOwner } from '../middleware/roles';
import { getSystemSetting, setSystemSetting } from '../repositories/settings-repository';
import type { PersonyEnv } from '../types/env';

export const ownerRoutes = new Hono<{ Bindings: PersonyEnv }>();

ownerRoutes.get('/owner/overview', async (c) => {
  try {
    const { userId } = await requireOwner(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);

    const [users, messages, personas, inferenceErrors] = await Promise.all([
      c.env.DB.prepare(`SELECT COUNT(*) as count FROM users`).first<{ count: number }>(),
      c.env.DB.prepare(`SELECT COUNT(*) as count FROM messages`).first<{ count: number }>(),
      c.env.DB.prepare(`SELECT COUNT(*) as count FROM personas WHERE status = 'active'`).first<{ count: number }>(),
      c.env.DB
        .prepare(`SELECT COUNT(*) as count FROM inference_runs WHERE status = 'failed'`)
        .first<{ count: number }>(),
    ]);

    return c.json({
      metrics: {
        totalUsers: users?.count ?? 0,
        totalMessages: messages?.count ?? 0,
        activePersonas: personas?.count ?? 0,
        failedInferenceRuns: inferenceErrors?.count ?? 0,
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
    if (err instanceof RoleRequiredError) return c.json({ error_code: 'FORBIDDEN' }, 403);
    return c.json({ error_code: 'INTERNAL_ERROR' }, 500);
  }
});

ownerRoutes.get('/owner/system/settings', async (c) => {
  try {
    await requireOwner(c);
    if (!c.env.DB) return c.json({ error_code: 'DB_NOT_CONFIGURED' }, 503);
    const maintenance = await getSystemSetting(c.env.DB, 'maintenance_mode');
    const featured = await getSystemSetting(c.env.DB, 'featured_personas');
    return c.json({ settings: { maintenance_mode: maintenance, featured_personas: featured } });
  } catch (err) {
    if (err instanceof RoleRequiredError) return c.json({ error_code: 'FORBIDDEN' }, 403);
    return c.json({ error_code: 'INTERNAL_ERROR' }, 500);
  }
});

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  reason: z.string().optional(),
});

ownerRoutes.put('/owner/system/settings', async (c) => {
  try {
    const { userId } = await requireOwner(c);
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
    if (err instanceof RoleRequiredError) return c.json({ error_code: 'FORBIDDEN' }, 403);
    return c.json({ error_code: 'INTERNAL_ERROR' }, 500);
  }
});

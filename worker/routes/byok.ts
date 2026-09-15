import { Hono } from 'hono';
import { z } from 'zod';
import { AuthRequiredError, requireUser } from '../middleware/auth';
import type { PersonyEnv } from '../types/env';

const byokSchema = z.object({
  provider: z.enum(['deepseek', 'gemini', 'openai', 'anthropic']),
  apiKey: z.string().min(8).max(256),
});

export const byokRoutes = new Hono<{ Bindings: PersonyEnv }>();

byokRoutes.get('/byok', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ keys: [] });

    const { results } = await c.env.DB
      .prepare('SELECT provider, key_hint, created_at FROM user_provider_keys WHERE user_id = ?')
      .bind(userId)
      .all<{ provider: string; key_hint: string; created_at: string }>();

    return c.json({ keys: results ?? [] });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

byokRoutes.post('/byok', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    const body = await c.req.json();
    const parsed = byokSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

    const hint = `${parsed.data.apiKey.slice(0, 4)}...${parsed.data.apiKey.slice(-4)}`;
    const now = new Date().toISOString();

    await c.env.DB
      .prepare(
        `INSERT INTO user_provider_keys (user_id, provider, key_hint, encrypted_key, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, provider) DO UPDATE SET key_hint = excluded.key_hint, encrypted_key = excluded.encrypted_key, created_at = excluded.created_at`
      )
      .bind(userId, parsed.data.provider, hint, parsed.data.apiKey, now)
      .run();

    return c.json({ ok: true, hint });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

byokRoutes.delete('/byok/:provider', async (c) => {
  try {
    const userId = await requireUser(c);
    if (!c.env.DB) return c.json({ error: 'Database not configured' }, 503);

    await c.env.DB
      .prepare('DELETE FROM user_provider_keys WHERE user_id = ? AND provider = ?')
      .bind(userId, c.req.param('provider'))
      .run();

    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthRequiredError) return c.json({ error: 'Authentication required' }, 401);
    throw err;
  }
});

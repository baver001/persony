# Задачи для владельца проекта (Persony platform)

Обновлено: 2026-09-15

## 1. Clerk — authentication (блокер для production custom personas)

**Зачем:** без Clerk custom personas синхронизируются только в dev (`PERSONY_DEV_MODE`). В production нужен реальный аккаунт.

1. Создать приложение на [Clerk Dashboard](https://dashboard.clerk.com) (Development + Production instances).
2. Включить Email code / magic link (или нужные методы).
3. Добавить secrets в Cloudflare Workers:
   ```bash
   wrangler secret put CLERK_SECRET_KEY
   ```
4. Добавить publishable key (один из вариантов):
   - **Runtime (рекомендуется):** `wrangler secret put CLERK_PUBLISHABLE_KEY` — SPA подхватит через `GET /api/config`
   - **Build-time:** GitHub secret `VITE_CLERK_PUBLISHABLE_KEY` или локально `VITE_CLERK_PUBLISHABLE_KEY=pk_...`
5. Убедиться, что Worker имеет `ENVIRONMENT=production` (уже в `wrangler.jsonc` vars).
6. Проверка после deploy: sign-in → chat → reload → история из D1; `GET /api/me` → `isAuthenticated: true`.

## 2. Paddle — billing (Phase 4)

1. Создать Live catalog Persony в Paddle.
2. Настроить webhook destination → `/api/billing/webhook`.
3. Secrets: `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, client token в frontend.

## 3. DeepSeek API (Phase 2)

1. Получить API key DeepSeek.
2. Secret: `DEEPSEEK_API_KEY` (после реализации provider adapter).

## 4. Домен beta.persony.org

1. Зона `persony.org` в Cloudflare (DNS на Cloudflare nameservers).
2. В `wrangler.jsonc` уже настроен custom domain `beta.persony.org` — после `npm run deploy` Worker привяжется к поддомену.
3. В Clerk Production instance указать **Application domain:** `beta.persony.org`.
4. В Clerk → **Domains** добавить:
   - Allowed origins: `https://beta.persony.org`, `http://localhost:5173`
   - Redirect URLs: `https://beta.persony.org`, `http://localhost:5173`

## 5. Безопасность

1. **Ротация `GEMINI_API_KEY`** если ключ когда-либо попадал в логи/чат.
2. Не коммитить `.dev.vars` (уже в `.gitignore`).

## 6. Локальная разработка (сейчас)

Скопировать `.dev.vars.example` → `.dev.vars` и задать:

```env
GEMINI_API_KEY=...
ENVIRONMENT=development
PERSONY_DEV_MODE=true
PERSONY_DEV_USER_ID=dev-local-user
```

Затем:

```bash
npm run db:migrate:local
npm run dev
```

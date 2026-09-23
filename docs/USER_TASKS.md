# Задачи для владельца проекта (Persony platform)

Обновлено: 2026-09-22

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
5. **Обязательно для Production:** настроить DNS для `clerk.persony.org` (Frontend API):
   - Clerk Dashboard → **Configure → Domains**: https://dashboard.clerk.com/last-active?path=domains
   - Скопировать CNAME для `clerk` → в Cloudflare DNS для `persony.org`
   - Режим записи: **DNS only** (серое облако), не Proxied — иначе Clerk не пройдёт проверку
   - Дождаться Verify в Clerk (до 48 ч, обычно минуты)
   - Без этой записи SDK падает: `failed_to_load_clerk_js` / `clerk.persony.org net::ERR_FAILED`

## 5. Milestone 1 — Owner economics verification (блокер goal)

Проверка статуса: `npm run smoke:economics:status` (operator + список блокеров).

Operator smoke уже зелёный на beta (`e2ac39dc`, D1 breakdown). Осталось **~5 мин** с owner-аккаунтом:

1. Войти на https://beta.persony.org → `/owner`.
2. DevTools → Network → любой `/api/owner/*` → скопировать `Authorization: Bearer …`.
3. Локально:
   ```bash
   SMOKE_OWNER_BEARER="<jwt>" npm run smoke:economics:milestone1
   ```
4. Layout: `docs/PRODUCTION_ECONOMICS_SMOKE.md` §15–23 (390px + 1440px).
5. Сообщить агенту: JWT output или «layout OK» — закроем `GOAL_MODE_STATE.md`.

**Автоматически (без DevTools):** production `CLERK_SECRET_KEY` + **активная сессия owner на beta** (Clerk `createSession` только для dev):

```bash
npm run smoke:economics:discover-owner-id   # из D1
# export SMOKE_OWNER_CLERK_USER_ID=user_...
npm run smoke:economics:mint-owner          # mint JWT + milestone1
```

`sk_test_*` не подойдёт для beta production users — нужен production secret из wrangler.

**CI (один раз):** скопировать production `CLERK_SECRET_KEY` в GitHub (сейчас только в Cloudflare):

```powershell
gh secret set CLERK_SECRET_KEY
```

После следующего deploy CI сам discover owner id из D1 и прогонит owner smoke.

## 6. Безопасность

1. **Ротация `GEMINI_API_KEY`** если ключ когда-либо попадал в логи/чат.
2. Не коммитить `.dev.vars` (уже в `.gitignore`).

## 7. Локальная разработка (сейчас)

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

## 8. Beta RC — 4 gate до GO (~76% automated done)

Трекер: `docs/BETA_RC_PROGRESS.md` · git/prod `af3a78d` · E2E 12/12 · CI 165 tests.

**Git:** локальный `main` может быть впереди `origin/main` (E2E/docs после deploy `af3a78d`). Синхронизация: `git push origin main` когда готовы.

### 8.1 Official avatars (BLOCKER-1)

1. Включить **paid quota** на `gemini-3.1-flash-image` в Google AI (тот же проект, что Worker `GEMINI_API_KEY`).
2. `npm run generate:official-avatars:api` (или `--slug=athena` по одному).
3. Визуально approve 6 портретов.
4. `node scripts/generate-official-avatars.mjs --apply-roster --confirm` → `npm run deploy`.

### 8.2 Beta persona reset (BLOCKER-2)

1. **D1 backup** remote `persony-db`.
2. Dry-run:
   ```bash
   node scripts/reset-beta-user-personas.mjs --clerk-user-id=user_3JPI4vKD0eD3KVY32ye3beNFpcA --remote
   ```
3. Execute:
   ```bash
   node scripts/reset-beta-user-personas.mjs --clerk-user-id=user_3JPI4vKD0eD3KVY32ye3beNFpcA --remote --execute --confirm
   ```

### 8.3 Voice Call device QA (BLOCKER-3)

15–30 min soak: iPhone Safari + Android Chrome.

### 8.4 Manual acceptance §86

Чеклист: `docs/BETA_ACCEPTANCE.md` → sign-off → обновить `BETA_READINESS.md` на **GO**.

### 8.5 Commit WIP (рекомендуется)

Весь RC-код задеплоен, но **не закоммичен**. Скажите агенту **«commit»** для одного RC-коммита.

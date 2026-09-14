# Persony — Spec 01: Infrastructure

## Архитектура деплоя

```
GitHub (main) → GitHub Actions → wrangler deploy → Cloudflare Worker
                                                      ├── /api/*  → Worker (Hono)
                                                      └── /*      → SPA assets (Vite build)
```

## wrangler.jsonc

- `name`: `persony`
- `main`: `worker/index.ts`
- `compatibility_date`: текущая дата
- `compatibility_flags`: `["nodejs_compat"]` — для @google/genai Live API
- `assets.not_found_handling`: `single-page-application`
- `assets.run_worker_first`: `["/api/*"]`

## Worker routes

| Route | Метод | Описание |
|-------|-------|----------|
| `/api/health` | GET | Health + hasApiKey |
| `/api/chat` | POST | SSE stream, Gemini fallback cascade |
| `/api/transcribe` | POST | Voice → text |
| `/api/generate-character` | POST | AI persona JSON |
| `/api/live` | WS | Gemini Live voice proxy |

## Локальная разработка

```bash
npm install
# Создать .dev.vars: GEMINI_API_KEY=...
npm run dev        # wrangler dev через Vite plugin
```

## CI (`.github/workflows/deploy.yml`)

- Trigger: push to `main`
- Steps: checkout → npm ci → npm run build → wrangler deploy
- Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Worker secret `GEMINI_API_KEY` — задаётся вручную в Cloudflare dashboard (не в git)

## Кастомный домен (следующий шаг)

1. Добавить `persony.org` в Cloudflare DNS
2. `wrangler deploy` → Workers & Pages → Custom domains → `persony.org`
3. Обновить `APP_URL` при появлении OAuth/ссылок

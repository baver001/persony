# 06 — Cloud data layer & authentication

**Статус:** Phase 1 — hardening (local verified)  
**Зависимости:** `specs/05-platform-roadmap.md`

## Цель

Server-authoritative cloud foundation: identity, personas, conversations, secure API, import из localStorage.

## Реализовано

### D1 database

- Binding: `DB` → `persony-db` (`wrangler.jsonc`)
- Migrations: `worker/db/migrations/` через `wrangler d1 migrations apply`
  - `0001_initial.sql` — базовая схема
  - `0002_phase1_hardening.sql` — индексы, `messages.idempotency_key`
- CI порядок: `lint → test → build → migrate → deploy`

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

### Identity (lazy provisioning)

- Clerk JWT → `getOrCreateUserByAuthIdentity('clerk', sub)` → internal `users.id` (UUID)
- Dev bypass: `PERSONY_DEV_MODE=true` только если `ENVIRONMENT !== production`
- `AuthContext`: `{ userId, authProvider, authProviderUserId, isAuthenticated }`
- Webhook Clerk **не обязателен** для login

### Security

- CORS: same-origin в production; dev — только whitelist localhost. **Нет reflection arbitrary Origin.**
- Billable endpoints требуют auth: conversations/messages, transcribe, generate-character, Live WS init
- `requireAIEntitlement()` — сейчас = authenticated user (boundary для Energy в Phase 3)
- Body size limit → `413` при превышении Content-Length
- Live WS: init один раз, auth в init payload, frame size limits, session timeout

### Persona API

| Endpoint | Описание |
|----------|----------|
| `GET /api/personas` | Публичные built-in metadata (без `systemPrompt`) |
| `GET /api/personas/mine` | Custom personas владельца (owner DTO) |
| `GET /api/personas/:id` | Public или owner DTO |
| `POST /api/personas` | Create — server-generated ID |
| `PATCH /api/personas/:id` | Update — owner check, 403 иначе |
| `DELETE /api/personas/:id` | Soft delete (`status=deleted`) |
| `GET /api/me` | Auth status |

`PersonaPublicDTO` никогда не содержит `systemPrompt` (включая system personas).

### Conversations API

| Endpoint | Описание |
|----------|----------|
| `GET /api/conversations` | Список direct conversations |
| `POST /api/conversations` | Create/get direct by `personaId` + фиксация `persona_version` |
| `GET /api/conversations/:id` | Metadata (owner only) |
| `GET /api/conversations/:id/messages` | Pagination `?before=&limit=` |
| `POST /api/conversations/:id/messages` | SSE stream; server loads history from D1 |
| `DELETE /api/conversations/:id` | Delete conversation |

### Import

- `POST /api/import/local-v1` — legacy import с idempotency (`legacy_v1_{localId}` slug, message keys)
- UI modal после первого login при наличии localStorage данных

### Client

- `@clerk/clerk-react` — Sign in/up, UserButton (если `VITE_CLERK_PUBLISHABLE_KEY` задан)
- Dev без Clerk: `X-Persony-Dev-User-Id` header
- Cloud conversations как source of truth после auth
- `localStorage` — cache/preferences + legacy import source

## Переменные окружения

| Переменная | Где | Назначение |
|------------|-----|------------|
| `ENVIRONMENT` | wrangler vars / `.dev.vars` | `production` \| `development` |
| `GEMINI_API_KEY` | secrets | AI inference |
| `CLERK_SECRET_KEY` | secrets | JWT verify |
| `VITE_CLERK_PUBLISHABLE_KEY` | frontend build | Clerk UI |
| `PERSONY_DEV_MODE` | `.dev.vars` only | Dev auth bypass (не production) |
| `PERSONY_DEV_USER_ID` | `.dev.vars` | Стабильный dev user |

## Тесты (local verified)

- CORS evil origin rejected
- Anonymous billable endpoints → 401
- Dev header ignored in production
- Persona DTO prompt leak prevention
- Memory seed policy (no resurrect when D1 ready)
- 32 tests (`npm test`)

## Не в Phase 1

- Energy / trial battery (Phase 3)
- Paddle (Phase 4)
- DeepSeek / ModelRouter (Phase 2)
- Clerk webhook profile sync (optional later)
- Discover / public catalog UI

## Проверить после deploy

- GitHub Actions CI green (`CI verified`)
- Clerk production keys + live sign-in (`production verified`)
- Live voice regression iOS/Android

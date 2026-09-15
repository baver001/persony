# 06 — Cloud data layer & authentication

**Статус:** Phase 1 — locally verified (2026-09-15)  
**Зависимости:** `specs/05-platform-roadmap.md`

## Цель

Перевести Persony с localStorage-only MVP на server-authoritative personas и подготовить cloud foundation.

## Реализовано

### D1 database

- Binding: `DB` → `persony-db` (`wrangler.jsonc`)
- Migrations: `worker/db/migrations/0001_initial.sql`, `0002_phase1_hardening.sql`
- Таблицы: users, personas, persona_versions, conversations, messages, memories, energy_*, payments, webhook_events

```bash
npm run db:migrate:local    # локальная разработка
npm run db:migrate:remote   # production D1
```

### Server-authoritative inference

- `POST /api/chat` — server-authoritative `{ conversationId, text }` или legacy `{ personaId, messages }`
- `POST /api/conversations/:id/messages` — cloud chat + SSE + D1 persistence
- `systemPrompt` загружается на Worker из seed/D1
- Live WS `init` принимает `personaId` (не `systemPrompt`)

### Persona API

| Endpoint | Описание |
|----------|----------|
| `GET /api/personas` | Публичные метаданные (без prompt) |
| `GET /api/personas/:id` | Метаданные; полный prompt — только owner |
| `POST /api/personas` | Create custom persona (server-generated id) |
| `PATCH /api/personas/:id` | Update owner persona |
| `DELETE /api/personas/:id` | Soft delete owner persona |
| `POST /api/import/legacy` | Idempotent localStorage import |
| `GET /api/me` | Статус auth |

### Auth boundary

- `worker/middleware/auth.ts` — internal `userId`, `authProvider`, lazy provisioning
- `worker/middleware/ai-entitlement.ts` — billable AI gate (auth today; Energy in Phase 3)
- Clerk: `CLERK_SECRET_KEY` + `Authorization: Bearer` → Persony `users` row
- Dev: `PERSONY_DEV_MODE=true` + `X-Persony-Dev-User-Id` (только local)

### Shared seed

- `shared/default-personas.ts` — единый источник built-in персон
- Worker seed в D1 при первом запросе (`ensureDefaultPersonasSeeded`)

### Client

- `src/lib/api/headers.ts`, `personas.ts`
- Sync custom personas перед chat/call
- `src/lib/cloudMigration.ts` + `CloudImportModal` — import после login
- `src/components/AuthBar.tsx` — Clerk sign-in / user menu
- `src/lib/api/conversations.ts` — cloud chat client

## Не реализовано (следующие шаги)

- Trial battery grant on signup (Phase 3)
- Production Clerk secrets + smoke test
- Webhook user sync (optional; lazy provisioning on login достаточно)

## Переменные окружения

| Переменная | Где | Назначение |
|------------|-----|------------|
| `GEMINI_API_KEY` | secrets | AI inference |
| `CLERK_SECRET_KEY` | secrets | JWT verify |
| `CLERK_PUBLISHABLE_KEY` | frontend env | Clerk UI (Phase 1b) |
| `PERSONY_DEV_MODE` | `.dev.vars` only | Dev persona sync без Clerk |

## Security

- Health endpoint не раскрывает API keys
- CORS: без wildcard для произвольных origin
- Zod validation на API payloads

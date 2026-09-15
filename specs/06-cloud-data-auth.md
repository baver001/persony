# 06 — Cloud data layer & authentication

**Статус:** Phase 1 в работе  
**Зависимости:** `specs/05-platform-roadmap.md`

## Цель

Перевести Persony с localStorage-only MVP на server-authoritative personas и подготовить cloud foundation.

## Реализовано

### D1 database

- Binding: `DB` → `persony-db` (`wrangler.jsonc`)
- Migration: `worker/db/migrations/0001_initial.sql`
- Таблицы: users, personas, persona_versions, conversations, messages, memories, energy_*, payments, webhook_events

```bash
npm run db:migrate:local    # локальная разработка
npm run db:migrate:remote   # production D1
```

### Server-authoritative inference

- `POST /api/chat` принимает `{ personaId, messages, conversationId? }`
- `systemPrompt` загружается на Worker из seed/D1
- Live WS `init` принимает `personaId` (не `systemPrompt`)

### Persona API

| Endpoint | Описание |
|----------|----------|
| `GET /api/personas` | Публичные метаданные (без prompt) |
| `GET /api/personas/:id` | Метаданные; полный prompt — только owner |
| `POST /api/personas` | Upsert custom persona (auth required) |
| `GET /api/me` | Статус auth |

### Auth boundary

- `worker/middleware/auth.ts` — `AuthContext`, `getAuthContext()`, `requireUser()`
- Clerk: `CLERK_SECRET_KEY` + `Authorization: Bearer`
- Dev: `PERSONY_DEV_MODE=true` + `X-Persony-Dev-User-Id` (только local)

### Shared seed

- `shared/default-personas.ts` — единый источник built-in персон
- Worker seed в D1 при первом запросе (`ensureDefaultPersonasSeeded`)

### Client

- `src/lib/api/headers.ts`, `personas.ts`
- Sync custom personas перед chat/call
- `src/lib/cloudMigration.ts` — заготовка import после login

## Не реализовано (следующие шаги)

- Clerk UI (sign-in / sign-up)
- Webhook user sync → `users` table
- Cloud conversations/messages (пока localStorage)
- localStorage import modal после login
- Trial battery grant on signup (Phase 3)

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

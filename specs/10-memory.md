# 10 — Persistent memory

**Статус:** implemented (locally verified)

## Scopes

- `user` — global user memory
- `persona_relationship` — User × Persona
- `room` — workspace memory

## API

- `GET /api/memory`
- `POST /api/memory`
- `DELETE /api/memory/:id`

Post-chat extraction pipeline in `memory-service.ts`. Memory UI: `MemoryPanel`.

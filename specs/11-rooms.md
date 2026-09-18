# 11 — Rooms (MVP)

**Status:** MVP scaffold shipped  
**Scope:** Create/list rooms with 2–4 personas; open direct chat per participant.

## API

- `GET /api/rooms` — list rooms + participants
- `POST /api/rooms` — `{ title, personaIds: string[2..4] }`
- `GET /api/rooms/:id` — room detail

## UI

- `/rooms` — list + create modal
- Profile menu → Rooms

## Not yet

- @mentions and multi-persona reply routing in one thread
- Room-level cost budgets
- Shared room transcript distinct from direct chats

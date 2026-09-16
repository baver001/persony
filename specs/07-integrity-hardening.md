# Phase 1.1 — Integrity Hardening

## Scope

Server-authoritative data integrity for chat, import, conversations, and Live Voice.

## inference_runs

- Unique `(conversation_id, client_request_id)`
- Status: `pending` | `streaming` | `completed` | `failed`
- Links `user_message_id` and `persona_message_id`
- Compatible with future `usage_events` and Energy settlement

## Idempotency

- `POST /conversations/:id/messages` requires `clientRequestId`
- Completed runs replay via SSE without second model call
- Failed runs reset and retry with same `clientRequestId`
- Persona messages keyed `persona:{clientRequestId}`

## Import

- Stable keys: `import:local_v1:{localMessageId}` for all senders

## Conversations

- Soft delete: `status` (`active` | `deleted`), `deleted_at`
- Messages retained until retention purge

## Persona version pinning

- Inference and Live load `PersonaVersion(persona_id, conversation.persona_version)`

## Frontend

- Retry reuses `clientRequestId` (no duplicate user bubble)
- Clear chat → `DELETE` conversation + new conversation on next message
- Scroll-up pagination with scroll position retention
- Live init: `conversationId` only (no client `recentChatContext`)

## Tests

`worker/integration/phase11-integrity.test.ts` — D1 SQLite harness.

## Status

- implemented: yes
- locally verified: lint, test (40), build
- production: migration `0003` applied, deploy verified via health endpoint
- CI: pending push

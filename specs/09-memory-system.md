# Phase 1.2 — Memory System

## Scopes

`user`, `relationship`, `room` (schema ready).

## Pipeline

Message → candidate extraction (explicit patterns) → dedupe → sensitivity gate → store.

Sensitive/special-category content is not auto-stored.

## Retrieval

Keyword + importance ranking for inference context injection via PersonaCompiler.

## API

`GET/PATCH /api/memories` — user-owned memories only.

## UI

`/memory` — view, edit, disable memories.

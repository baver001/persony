# 14 — Product events (S1 analytics)

**Status:** Spec only — not implemented  
**Last updated:** 2026-09-19  
**Stage:** S0 → S1 (first 10 invited users)  
**Related:** [`docs/METRICS.md`](../docs/METRICS.md), [`specs/owner-console.md`](owner-console.md), [`specs/battery-beta.md`](battery-beta.md), [Product Monitoring Framework](/cursor/stores/bc-f0795a01-bd63-480b-9507-2fd2147a24ad/docs/product-monitoring-framework.md)

## Goals

- Server-authoritative product funnel and feature-usage events for pre-GTM observation (ICP not fixed yet).
- Minimal D1 storage — sufficient for ~100 users without PostHog/Mixpanel.
- Owner Console **Product** section (M1): share → signup → activation funnel + weekly depletion/feature counts.
- Privacy-safe `props_json` — no email, name, message text, or prompts.

## Non-goals

- Client-side analytics SDKs (PostHog, Mixpanel, GA).
- Real-time streaming dashboards or sub-second latency.
- Per-slug SEO conversion (M3 / S3 — see Phases).
- `signup_started` (Clerk UI click) — out of scope until a server hook exists; use `signup_completed` as conversion proxy.
- Replacing economics metrics in [`docs/METRICS.md`](../docs/METRICS.md) — product events complement COGS/inference ops data.

## Event taxonomy

Canonical `event` string values (snake_case, stable forever once shipped).

### Core funnel (S1)

| Event | Definition | `user_id` | Idempotency |
|-------|------------|-----------|-------------|
| `share_link_opened` | Anonymous view of a public persona share page | `NULL` | Once per `(anon_session_id, persona_slug)` per 24h |
| `signup_completed` | First authenticated `GET /api/me` after lazy user provisioning | required | Once per user |
| `first_inference` | User's first `inference_runs.status = completed` | required | Once per user |
| `persona_installed` | User installs a catalog persona | required | Once per `(user_id, persona_id)` |
| `persona_created` | User creates a custom persona | required | Once per `persona_id` |
| `persona_published` | Persona `visibility` becomes `public` or `unlisted` (first time) | required | Once per `persona_id` |
| `session_return_d1` | Completed inference on calendar day +1 after signup day (UTC) | required | Once per user |
| `session_return_d7` | Completed inference on calendar day +7 after signup day (UTC) | required | Once per user |

### Feature usage (S1 log; S2 dashboard emphasis)

| Event | Definition | `user_id` | Idempotency |
|-------|------------|-----------|-------------|
| `voice_note_sent` | Voice note transcribed successfully | required | Per `inference_run_id` |
| `live_call_started` | Live WS `init` succeeds and inference run begins | required | Per `call_session_id` / run id |
| `memory_viewed` | Authenticated memory list loaded | required | Once per user per UTC day |
| `room_created` | Room created with 2–4 personas | required | Once per `room_id` |
| `battery_depleted` | AI request blocked because battery empty (`BATTERY_EMPTY`) | required | Once per depletion episode* |
| `discover_browse` | Discover catalog loaded (`GET /api/personas`) | optional | Once per `(user_id or anon_session_id)` per UTC day |

\* Depletion episode: from `battery_depleted` until wallet `available_units > 0` again (regen or owner reset).

### Allowed `props_json` keys (no PII)

| Key | Events | Type | Notes |
|-----|--------|------|-------|
| `persona_id` | share, install, create, publish, inference-related | string | UUID or slug reference |
| `persona_slug` | `share_link_opened` | string | Public slug only |
| `room_id` | `room_created` | string | |
| `inference_run_id` | `first_inference`, `voice_note_sent`, `live_call_started` | string | Correlates with ops data |
| `operation_type` | inference-related | string | e.g. `chat_text`, `voice_transcription` |
| `visibility` | `persona_published` | string | `public` \| `unlisted` |
| `source` | `share_link_opened`, `discover_browse` | string | `web` (default) |
| `locale` | browse/share | string | `en` \| `ru` |
| `anon_session_id` | anonymous events | string | HMAC of IP+UA bucket, not raw IP |

**Forbidden in `props_json`:** email, display name, Clerk id, message text, system prompts, audio URLs, raw IP.

`user_id` lives in the table column only — never duplicated inside `props_json`.

## Data model

Migration: `worker/db/migrations/00XX_product_events.sql` (number TBD at implementation).

### Table `product_events`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `event` | TEXT NOT NULL | Taxonomy value |
| `user_id` | TEXT NULL | FK → `users.id`; NULL for anonymous share/browse |
| `props_json` | TEXT NOT NULL DEFAULT `'{}'` | JSON object; keys from allowlist only |
| `idempotency_key` | TEXT NULL | Unique when set — dedupe writes |
| `created_at` | TEXT NOT NULL | ISO 8601 UTC |

Indexes:

- `idx_product_events_event_created` on `(event, created_at)`
- `idx_product_events_user_event` on `(user_id, event)` where `user_id IS NOT NULL`
- `UNIQUE(idempotency_key)` where `idempotency_key IS NOT NULL`

### Derived retention (no extra events table)

`session_return_d1` / `session_return_d7` are **emitted server-side** when a completed inference occurs and the user's `users.created_at` falls on the correct signup-relative UTC day. Implementation may use a nightly job as fallback for users who infer near midnight UTC.

### Service boundary

```
worker/services/product-events-service.ts   — trackEvent(), allowlist validation
worker/repositories/product-events-repository.ts — insert + idempotency
```

Feature flag: `system_settings.product_events_mode` = `off` | `log` | `persist` (see Phases).

## Ingestion (server-side)

All events are recorded in the Worker — **never** trusted from the client body.

| Event | Trigger location | When |
|-------|------------------|------|
| `share_link_opened` | `GET /api/personas/by-slug/:slug` | 200 response; anonymous allowed |
| `signup_completed` | `GET /api/me` | After `getOrCreateUserByAuthIdentity`; only if user row age &lt; 60s |
| `first_inference` | `chat-service` / inference completion path | On transition to `completed` when count for user = 1 |
| `persona_installed` | `POST /api/me/personas/:personaId/install` | 200 after install |
| `persona_created` | `POST /api/personas` | 201 after create |
| `persona_published` | `PATCH /api/personas/:id` | When `visibility` ∈ `{public, unlisted}` and previous was `private` |
| `session_return_d1` | Inference completion hook | Signup day + 1 UTC |
| `session_return_d7` | Inference completion hook | Signup day + 7 UTC |
| `voice_note_sent` | `POST /api/transcribe` | Successful transcribe inference completed |
| `live_call_started` | `GET /api/live` WS `init` | After `beginVoiceCallInference` succeeds |
| `memory_viewed` | `GET /api/memories` | 200; once per user per UTC day |
| `room_created` | `POST /api/rooms` | 201 after create |
| `battery_depleted` | `energy-service` (`assertBatteryAllowsAI`, `BatteryEmptyError`) | First block per depletion episode |
| `discover_browse` | `GET /api/personas` | 200; Discover/catalog fetch; daily dedupe |

Ingestion must not block the user request: `executionCtx.waitUntil(trackEvent(...))` or equivalent fire-and-forget with error logging.

## Owner API

Routes under existing owner RBAC (`requireOwner`). Prefix: `/api/owner/product/`.

### `GET /api/owner/product/funnel`

Aggregated funnel counts for a rolling window.

Query: `?days=7` (default 7, max 90).

Response:

```json
{
  "windowDays": 7,
  "generatedAt": "2026-09-19T12:00:00.000Z",
  "funnel": {
    "share_link_opened": 120,
    "signup_completed": 8,
    "first_inference": 6,
    "persona_installed": 4,
    "persona_created": 2,
    "persona_published": 1,
    "session_return_d1": 3,
    "session_return_d7": 1
  },
  "rates": {
    "signupPerShare": 0.067,
    "activationPerSignup": 0.75,
    "d1RetentionPerActivation": 0.5
  },
  "batteryDepletedCount": 5,
  "discoverBrowseCount": 40
}
```

Rates use safe division (0 denominator → `null`). Labels in UI must say **counts, not revenue**.

### `GET /api/owner/product/events`

Paginated raw event stream for debugging.

Query: `?event=first_inference&userId=&before=&limit=50` (max 100).

Response:

```json
{
  "events": [
    {
      "id": "...",
      "event": "first_inference",
      "userId": "...",
      "props": { "inference_run_id": "...", "operation_type": "chat_text" },
      "createdAt": "..."
    }
  ],
  "nextBefore": "..."
}
```

`props` is parsed JSON — still no PII fields per allowlist.

### Combined overview (optional convenience)

`GET /api/owner/product/overview` may alias funnel + last-24h feature counts in one payload. Not required for M1 if funnel endpoint covers the dashboard card.

## Owner Console UI

Spec reference: Monitoring Framework §8 Phase M1. Implementation: `src/pages/owner/` new section **Product** (desktop: under **Usage** group; mobile: **More** drawer).

### M1 dashboard (S1 — first 10 users)

| Block | Data source | UX |
|-------|-------------|-----|
| Funnel card | `GET /api/owner/product/funnel?days=7` | Horizontal steps: Share → Signup → First chat → D1 |
| Weekly active inferrers | Existing `activeUsersWithInference7d` from economics | Reuse Economy/Overview widget |
| Top personas by installs | `persona_installed` grouped by `persona_id` | Table top 5 |
| Battery pressure | `battery_depleted` count 7d | Single stat + link to Battery section |
| Feature usage (compact) | events API aggregates | voice / live / memory / rooms / discover counts |

States: `OwnerSectionState` loading / error / retry. i18n: `src/i18n/locales/{en,ru}/owner.json` keys `product.*`.

### Not in M1

- Cohort retention grid (M2)
- ICP auto-clustering (M2)
- Per-slug share conversion (M3)

## Privacy & compliance

- No third-party analytics pixels.
- Anonymous events use `anon_session_id` (hashed bucket), not raw IP in D1.
- Owner event list shows internal `user_id` only — link to Users section, never Clerk email in this API.
- GDPR export/delete: product events for a user are deleted when user deletion is implemented (out of scope here; note in migration).

## Phases

| Phase | `product_events_mode` | Behavior |
|-------|----------------------|----------|
| **M0** (S0, now) | `off` or `log` | `trackEvent` logs structured `logEvent('product_event', …)` only; no D1 writes |
| **M1** (S1 trigger) | `persist` | Migration applied; ingestion wired; Owner funnel API + Product section |
| **M2** (S2) | `persist` | Cohort D1/D7 table, feature breakdown charts, optional `GET /api/owner/product/cohorts` |

**S0 → S1 trigger:** founder dogfooded 2+ weeks, invite 5–10 users (see monitoring framework §9).

## Acceptance criteria

### M0 (spec + noop)

- [ ] This spec reviewed and linked from `map.md` and monitoring framework
- [ ] `product-events-service` stub exists with allowlist validation and log-only mode
- [ ] No D1 migration until S1 trigger

### M1 (persist + funnel)

- [ ] `product_events` migration applied locally and in CI migrate step
- [ ] All S1 funnel events in taxonomy fire from documented routes without blocking responses
- [ ] Idempotency: duplicate `signup_completed` / `first_inference` not inserted twice
- [ ] `GET /api/owner/product/funnel` returns counts matching manual spot-check
- [ ] `GET /api/owner/product/events` paginates and filters by `event`
- [ ] Owner Product section renders funnel card at 390px and 1440px
- [ ] `props_json` audit: no forbidden keys in integration test fixtures
- [ ] Anonymous `share_link_opened` works with `user_id IS NULL`

### M2 (dashboard depth)

- [ ] Cohort retention table (signup week × D1/D7)
- [ ] Feature usage breakdown (voice vs live vs text proxy) visible in Owner Console
- [ ] Weekly review ritual checklist in monitoring framework satisfied from dashboard alone

## File references (implementation)

| Area | Path |
|------|------|
| Migration | `worker/db/migrations/00XX_product_events.sql` |
| Service | `worker/services/product-events-service.ts` |
| Repository | `worker/repositories/product-events-repository.ts` |
| Owner routes | `worker/routes/owner.ts` (or `worker/routes/owner-product.ts`) |
| Owner client | `src/lib/api/owner.ts`, `src/pages/owner/ProductSection.tsx` |
| Tests | `worker/integration/product-events.test.ts` |

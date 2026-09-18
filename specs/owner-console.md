# Owner Control Center specification

**Status:** Partial — Milestone 2 in progress  
**Last updated:** 2026-09-18  
**Route:** `/owner` (Clerk owner role required)

## Purpose

Give the product owner verifiable visibility into AI economics, inference behavior, pricing, and platform health — desktop and mobile — without treating unknown costs as zero.

## Information architecture

Implementation: `src/pages/owner/`, orchestrator `src/pages/OwnerConsole.tsx`.

### Desktop sidebar groups

| Group | Sections | Status |
|-------|----------|--------|
| Root | Overview | Implemented |
| AI | AI routing overview, Pricing catalog, Inference Explorer | Partial — `chat_text_provider` + read-only routing matrix from Model Registry |
| Economy | Economics dashboard, Battery | Economics implemented; battery overview API exists |
| People | Users, Personas | Users + Personas analytics (inference + known COGS) |
| Usage | Memory stats | Basic stats API |
| System | Settings, Audit, Errors | Feature flags (maintenance, battery) + audit + failed inference |

### Mobile layout

- Bottom nav: Overview, AI, Economy, Inference (`MOBILE_PRIMARY_SECTIONS`)
- “More” drawer: Pricing, Users, Personas, Memory, Battery, Audit, Settings

## Typed API contracts

Client: `src/lib/api/owner.ts` — typed fetch helpers (no `Record<string, unknown>` on economics/inference/pricing).

| Endpoint | Purpose |
|----------|---------|
| `GET /api/owner/overview` | Platform counts |
| `GET /api/owner/economics` | COGS, coverage, simulated retail |
| `GET /api/owner/pricing` | Versioned pricing catalog + freshness |
| `POST /api/owner/pricing/entries` | Append-only pricing row + audit log |
| `GET /api/owner/inference` | Paginated inference list + filters |
| `GET /api/owner/inference/:id` | Detail + cost breakdown + timeline |
| `GET /api/owner/ai/overview` | Provider configuration |
| `GET /api/owner/users` | User list + 7d inference / known COGS |
| `GET /api/owner/personas/overview` | Persona analytics (30d) |
| `GET /api/owner/memory/stats` | Memory counters |
| `GET /api/owner/battery/overview` | Battery aggregates |
| `PUT /api/owner/system/settings` | System settings (audited) |

## Section requirements

### Overview

- Platform counts, recent changes feed
- Error state with retry (`OwnerSectionState`)

### Economy

- Known COGS today / 7d / 30d (micro-USD display)
- Cost coverage % and unpriced call count — **must be visible**
- Simulated retail / margin — labeled simulated
- Breakdown by provider and model

### Inference Explorer

- Filterable list (status, provider, confidence, date)
- Detail drawer: tokens, latency, fallback, immutable cost breakdown
- `unpriced` shows explicit “unknown cost”, not $0.00

### Pricing

- Catalog table from `GET /owner/pricing` (code bootstrap + DB merge)
- Append-only add form → `POST /owner/pricing/entries` (reason required, audited)
- Stale entry indicator from freshness metadata

## UX standards

- Responsive: usable at 390px and 1440px
- Section-level loading / error / retry
- `noindex` on owner routes (server header)
- i18n: `src/i18n/locales/{en,ru}/owner.json`

## Open gaps (goal brief)

- [x] Routing matrix (read-only from Model Registry) + `chat_text_provider` toggle
- [x] Voice/transcribe/avatar economics in Inference Explorer (filter by operation)
- [x] Personas analytics (usage, cost per persona)
- [x] Users detail (inference history per user)
- [x] Feature flags section (maintenance_mode, battery_enabled, battery_mode)
- [x] Errors / failed inference dedicated view
- [x] DB-backed pricing admin (append-only add + audit log)
- [ ] Production E2E verification checklist

## Verification gates

1. Owner login on beta → Economics shows coverage after real chat
2. Inference detail explains line items for completed text chat
3. Mobile: primary nav + More drawer navigable without horizontal scroll
4. Unpriced inference renders warning state in UI

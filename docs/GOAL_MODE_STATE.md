# Goal mode state

**Objective:** Verified Economics & Owner Control Center — проверяемая экономика AI, versioned pricing, достоверный Owner Control Center (desktop + mobile).

**Last updated:** 2026-09-19 UTC  
**Current phase:** Milestone 1 — Economics Truth E2E verification  
**Previous phase:** Production Economy & Reliability — **shipped**

## Production snapshot

| Field | Value |
|-------|--------|
| **Current production SHA** | `0b0e7527256c` (CI workflow fix + optional owner smoke) |
| **Production health** | `GET https://beta.persony.org/api/health` → ok, database ready |
| **Last migration (remote D1)** | `0014_pricing_catalog_db.sql` |
| **CI** | Green (see latest `main` deploy) |
| **Public smoke** | `npm run smoke:economics` (public + D1 + layout contract) |
| **Owner API smoke** | `SMOKE_OWNER_BEARER=<jwt> npm run smoke:economics:owner` |
| **D1 operator smoke** | `npm run smoke:economics:d1` (wrangler remote) |
| **Production smoke (economics)** | **PARTIAL** — public+D1 ✅ 2026-09-19; `with_breakdown=11/19` (7d); latest `e2ac39dc` |
| **Tests (local)** | 127/127 (incl. economics snapshot + energy/retail separation) |

Full audit: [`docs/ECONOMICS_RECONCILIATION.md`](./ECONOMICS_RECONCILIATION.md)

## Gate table

| Gate | Status | Evidence |
|------|--------|----------|
| Model Registry | deployed | `worker/ai/model-registry.ts`, routing matrix in Owner AI |
| Pricing Catalog 2.0 | deployed | tokens + per_minute + per_image dimensions |
| Cost confidence | deployed | actual/estimated/unpriced, `formatMicrousd(null)` → `—` |
| Provider usage | **partial** | chat/transcribe/text-gen actual; voice_call Live `usageMetadata` + duration fallback |
| Voice / transcribe / avatar inference rows | deployed | voice-call, transcribe, avatar services |
| Call summary / persona gen inference rows | deployed | `text-generation-inference-service.ts` |
| Owner Console | **partial** | economy, inference, pricing, users/personas detail, settings, errors |
| Economics E2E (Milestone 1) | **partial** | D1 chat_text + voice_transcription verified; owner API smoke + layout open |
| DB-backed pricing admin | deployed | migration `0014`, POST `/owner/pricing/entries`, audit log |
| Immutable inference costs | deployed | `updateInferenceRunEconomics` blocks rewrite after `cost_calculated_at` |
| CI post-deploy economics smoke | deployed | `smoke:economics` public+D1+layout; optional owner via secret |
| Mobile/desktop layout gates | **partial** | static layout contract in CI; manual 390/1440 sign-off open |

## Manual verification gates

| Check | Status | Inference run id | Date |
|-------|--------|------------------|------|
| Text chat → Inference detail with line-item COGS | **pass (D1)** | `e2ac39dc` actual, `cost_calculated_at`, 2-line breakdown | 2026-09-19 |
| Economy coverage % after real inference | **pass (D1)** | today 92.3% (12/13 priced), 7d 63.2%; owner UI unverified | 2026-09-19 |
| Voice note → `voice_transcription` inference row | **pass (D1)** | `e643885a` actual + breakdown | 2026-09-19 |
| Avatar Studio → `avatar_generation` inference row | **open** | no runs in 7d | — |
| Owner Console 390px / 1440px | **open** | — | — |
| Owner auth gate (unauthenticated) | **pass** | `/owner` → «Sign in required» at 390/1440; API → 401 | 2026-09-19 |
| Owner API smoke (`smoke:economics:owner`) | **open** | needs `SMOKE_OWNER_BEARER` | — |

## Completion audit (2026-09-19)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Model Registry + Pricing 2.0 | ✅ | deployed, specs + owner API |
| CostEngine 2.0 + immutable costs | ✅ | D1 `e2ac39dc`, integration tests |
| Economics truth (unknown ≠ $0) | ✅ | `formatMicrousd(null)`, economics-service test |
| Owner Console shipped | ✅ partial | code deployed; layout sign-off open |
| Production E2E Milestone 1 | **partial** | D1 operator ✅; owner API + layout open |
| Tests + CI smoke | ✅ | 127/127; `smoke:economics` + optional `SMOKE_OWNER_BEARER` in deploy |

## Next actions

1. `npm run smoke:economics:status` — operator dashboard + blocker summary.
2. `SMOKE_OWNER_BEARER=<jwt> npm run smoke:economics:milestone1` — operator + owner API gates.
3. Owner Console 390px / 1440px per `PRODUCTION_ECONOMICS_SMOKE.md` §15–23; optional avatar_generation.

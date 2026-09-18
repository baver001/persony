# Goal mode state

**Objective:** Verified Economics & Owner Control Center — проверяемая экономика AI, versioned pricing, достоверный Owner Control Center (desktop + mobile).

**Last updated:** 2026-09-18 UTC  
**Current phase:** Milestone 1 — Economics Truth E2E verification  
**Previous phase:** Production Economy & Reliability — **shipped**

## Production snapshot

| Field | Value |
|-------|--------|
| **Current production SHA** | `8761878` — transcribe + avatar inference economics, per_image pricing |
| **Production health** | `GET https://beta.persony.org/api/health` → ok, `gitSha: 8761878e8b1a`, database ready |
| **Last migration (remote D1)** | `0013_operation_type_normalize.sql` |
| **CI** | Green on `8761878` deploy |
| **Production smoke (economics)** | **NOT RUN** — owner login required |
| **Tests (local)** | 117/117 |

Full audit: [`docs/ECONOMICS_RECONCILIATION.md`](./ECONOMICS_RECONCILIATION.md)

## Gate table

| Gate | Status | Evidence |
|------|--------|----------|
| Model Registry | deployed | `worker/ai/model-registry.ts`, routing matrix in Owner AI |
| Pricing Catalog 2.0 | deployed | tokens + per_minute + per_image dimensions |
| Cost confidence | deployed | actual/estimated/unpriced, `formatMicrousd(null)` → `—` |
| Provider usage | **partial** | chat stream + transcribe `usageMetadata`; voice duration estimate |
| Voice / transcribe / avatar inference rows | deployed | voice-call, transcribe, avatar services |
| Call summary / persona gen inference rows | deployed | `text-generation-inference-service.ts` |
| Owner Console | **partial** | economy, inference, pricing, users/personas detail, settings, errors |
| Economics E2E (Milestone 1) | **open** | [`docs/PRODUCTION_ECONOMICS_SMOKE.md`](./PRODUCTION_ECONOMICS_SMOKE.md) |
| DB-backed pricing admin | open | read-only catalog today |
| Mobile/desktop layout gates | open | manual 390px / 1440px |

## Manual verification gates

| Check | Status |
|-------|--------|
| Text chat → Inference detail with line-item COGS | **open** |
| Economy coverage % after real inference | **open** |
| Voice note → `voice_transcription` inference row | **open** |
| Avatar Studio → `avatar_generation` inference row | **open** |
| Owner Console 390px / 1440px | **open** |

## Next actions

1. Owner runs Milestone 1 smoke on beta; record inference run ids in this file.
2. DB-backed pricing admin (edit + audit).
3. Provider-reported usage for Gemini Live voice calls.

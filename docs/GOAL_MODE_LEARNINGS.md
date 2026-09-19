# Goal mode learnings

_Журнал пополняется через `record-learning.mjs` и вручную при необходимости._
## 2026-09-15 — reliability

- **Change:** SSE chat stream now uses a buffered parser; model fallback only on unavailable/transient errors.
- **Evidence:** npm test (12 passed), npm run lint, npm run build exit 0
- **Reusable practice:** Never split SSE on raw network chunks; classify provider errors before model cascade fallback.
- **Scope:** project goal mode

## 2026-09-15 — architecture

- **Change:** Phase 1: D1 personas + server-side prompt resolution with in-memory seed fallback.
- **Evidence:** db:migrate:remote OK; 14 tests; build OK; chat API uses personaId
- **Reusable practice:** Keep built-in persona seed on worker; sync custom personas via POST /api/personas before inference.
- **Scope:** project goal mode

## 2026-09-18 — reliability

- **Change:** Production economy P0: reserve/settle energy with atomic D1 wallet updates and inference telemetry
- **Evidence:** migration 0008, phase15-energy-concurrency.test.ts, commit 8052ab0
- **Reusable practice:** Before AI inference: reserve max units atomically; after success settle actual cost; on failure release reservation; log provider/model/usage on inference_runs
- **Scope:** project goal mode

## 2026-09-18 — reliability

- **Change:** P1: D1 rate limits, owner economics API, community discover, Voice Call energy reserve
- **Evidence:** commits 1b8be26, 08e1049, 6b937fc; CI deploy green
- **Reusable practice:** Public catalog: official + community public personas; rate-limit via D1 UPSERT buckets; bill AI utilities with withEnergyReservation helper
- **Scope:** project goal mode

## 2026-09-18 — economics

- **Change:** Verified Economics stack: Pricing Catalog 2.0 (DB merge `0014`), CostEngine 2.0, Owner Console mobile cards, immutable inference costs after `cost_calculated_at`, CI post-deploy `smoke:economics:public`, owner API smoke script
- **Evidence:** production `dcad14f`; 124/124 tests; `docs/ECONOMICS_RECONCILIATION.md`; `/owner` unauthenticated → Sign in required (beta)
- **Reusable practice:** Unknown COGS → `formatMicrousd(null)` = `—`; block cost field rewrites in repository once settled; public smoke includes owner 401 gate; Milestone 1 E2E still needs owner JWT + recorded inference run id
- **Scope:** project goal mode

## 2026-09-19 — economics verification

- **Change:** Layout contract smoke, D1↔Owner coverage parity, expanded owner API smoke, CI optional owner step (`SMOKE_OWNER_BEARER`; shell skip when unset)
- **Evidence:** production `0b0e752`; 127/127 tests; deploy `35432809430`; D1 `e2ac39dc` actual + immutable breakdown
- **Reusable practice:** `smoke:economics` = public + D1 + layout; never use GitHub `secrets` in workflow `if` — gate in shell
- **Scope:** project goal mode


# Economics & Owner — reconciliation baseline

**Stage:** Verified Economics & Owner Control Center (Milestone 1 in progress)  
**Audited:** 2026-09-18  
**Production URL:** https://beta.persony.org  
**Production SHA (deployed):** `0b0e752` (see `/api/health` `gitSha`)  
**D1 migrations (remote):** `0001`–`0014` applied  
**Production health:** `GET /api/health` → `status: ok`, `database: ready`, `gitSha` present  
**Automated tests:** 126/126 (`npm test`, incl. chat_text CostEngine 2.0 integration)  
**Operator smoke (no auth):** `npm run smoke:economics` → public + D1 + layout contract  
**Owner API smoke:** `SMOKE_OWNER_BEARER=<jwt> npm run smoke:economics:owner` (Milestone 1 chat_text + breakdown)  
**D1 snapshot (2026-09-19):** 11/19 runs with `cost_calculated_at` in 7d; latest chat `e2ac39dc` (actual, immutable breakdown) |

Status labels:

- **IMPLEMENTED** — on `main` / deployed
- **TESTED** — automated tests
- **CI VERIFIED** — green deploy pipeline
- **PRODUCTION VERIFIED** — confirmed on beta without owner JWT
- **MANUAL VERIFIED** — owner login checklist with recorded run ids

---

## Platform & deploy

| Item | IMPLEMENTED | TESTED | CI | PRODUCTION |
|------|:-----------:|:------:|:--:|:----------:|
| CI verify (i18n, lint, test, build) | ✓ | ✓ | ✓ | — |
| Deploy + gitSha in health | ✓ | — | ✓ | ✓ `gitSha` on `/api/health` |
| D1 migrations 0008–0014 (economy, confidence, pricing_entry, breakdown, operation normalize, pricing_entries DB) | ✓ | partial | ✓ migrate job | ✓ |
| Clerk auth | ✓ | partial | ✓ | ✓ |
| Owner routes require auth (401 without JWT) | ✓ | — | ✓ post-deploy smoke | ✓ |
| D1 CostEngine 2.0 rows on production | ✓ code | — | ✓ `smoke:economics:d1` in CI | ✓ 11/19 (7d); latest `e2ac39dc` |
| Paddle live | ✗ `BILLING_ENABLED=false` | — | — | N/A |

---

## Model registry & operations

| Area | IMPLEMENTED | TESTED | PRODUCTION E2E |
|------|:-----------:|:------:|:--------------:|
| Central `model-registry.ts` + `listOwnerRoutingMatrix` | ✓ | ✓ | NOT VERIFIED |
| Chat text (Gemini + DeepSeek stream usage) | ✓ | ✓ phase11 CostEngine 2.0 fields | **D1 verified** `e2ac39dc` |
| Voice call (`voice_call`, Live usageMetadata + duration fallback) | ✓ | ✓ | **D1 verified** (4 runs w/ breakdown) |
| Transcribe (`voice_transcription`, usageMetadata) | ✓ | ✓ | **D1 verified** `e643885a` |
| Avatar (`avatar_generation`, per_image COGS) | ✓ | ✓ | **MANUAL open** |
| Call summary / persona gen inference rows | ✓ | ✓ | **MANUAL open** |

---

## Provider usage & cost

| Item | IMPLEMENTED | TESTED | PRODUCTION E2E |
|------|:-----------:|:------:|:--------------:|
| Cost confidence actual/estimated/unpriced | ✓ m0010 | ✓ | MANUAL open |
| `pricing_entry_id` + `cost_breakdown_json` immutable | ✓ m0011–0012 + `updateInferenceRunEconomics` guard | ✓ | MANUAL open |
| Token pricing (text, cache, peak/off-peak) | ✓ catalog | ✓ | — |
| `per_minute` (Gemini Live) | ✓ | ✓ | MANUAL open |
| `per_image` (avatar models) | ✓ | ✓ | MANUAL open |
| Stream usage Gemini/DeepSeek chat | ✓ | ✓ | MANUAL open |
| Unknown cost ≠ $0 in Owner UI | ✓ `formatMicrousd(null)` → `—` | ✓ unit test | MANUAL open |
| Retail margin formula (not 2.5× hardcode) | ✓ `retail-pricing.ts` | ✓ | NOT VERIFIED |
| DB-backed pricing admin (append-only + audit) | ✓ m0014 + POST `/owner/pricing/entries` | ✓ | NOT VERIFIED |

---

## Owner Control Center

| Item | IMPLEMENTED | TESTED | MANUAL layout |
|------|:-----------:|:------:|:-------------:|
| OwnerShell desktop + mobile nav | ✓ | card lists `<md` on analytics sections | **open** 390/1440 sign-off |
| Economy dashboard (coverage, unpriced) | ✓ | — | MANUAL open |
| Inference Explorer + filters + detail | ✓ | ✓ | MANUAL open |
| Pricing catalog + add-entry form | ✓ | partial | — |
| Users + Personas detail → inference list | ✓ | partial | MANUAL open |
| AI routing matrix + `chat_text_provider` | ✓ | — | — |
| Settings / feature flags | ✓ | — | — |
| Errors summary | ✓ | — | — |

---

## Milestone readiness

| Milestone | Ready? | Blocker |
|-----------|--------|---------|
| **M1 — Economics Truth** | **PARTIAL** | D1 chat + transcribe verified; owner API smoke + Economy UI open |
| **M2 — Owner Console Desktop** | **PARTIAL** | Implemented; layout + E2E not verified |
| **M3 — Mobile** | **PARTIAL** | Card layouts shipped; manual 390/1440 sign-off open |
| **M4 — Production Verified** | **NO** | M1 + layout gates |

---

## Documentation

| Doc | Accurate? |
|-----|-----------|
| `docs/GOAL_MODE_STATE.md` | ✓ updated 2026-09-19 |
| `docs/PRODUCTION_ECONOMICS_SMOKE.md` | ✓ incl. owner API smoke helper |
| `docs/METRICS.md` | ✓ |
| `specs/owner-console.md` | ✓ synced |
| `specs/economics.md` | ✓ synced |
| This file | ✓ refresh on each deploy milestone |

---

## Next work

1. **Owner:** run Milestone 1 smoke; record inference ids in `GOAL_MODE_STATE.md`.
2. **Owner:** `SMOKE_OWNER_BEARER=<jwt> npm run smoke:economics:owner` after a real chat inference.
3. **Manual:** Owner Console 390px / 1440px verification on beta.

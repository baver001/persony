# Economics & Owner — reconciliation baseline

**Stage:** Verified Economics & Owner Control Center (Milestone 1 in progress)  
**Audited:** 2026-09-18  
**Production URL:** https://beta.persony.org  
**Production SHA (deployed):** `dcad14f` — immutable costs + CI post-deploy smoke (see `/api/health` `gitSha`)  
**D1 migrations (remote):** `0001`–`0014` applied  
**Production health:** `GET /api/health` → `status: ok`, `database: ready`, `gitSha` present  
**Automated tests:** 124/124 (`npm test`, incl. settled cost immutability)  
**Public smoke:** `npm run smoke:economics:public` (health + owner auth gate)  
**Owner API smoke:** `SMOKE_OWNER_BEARER=<jwt> npm run smoke:economics:owner`

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
| Paddle live | ✗ `BILLING_ENABLED=false` | — | — | N/A |

---

## Model registry & operations

| Area | IMPLEMENTED | TESTED | PRODUCTION E2E |
|------|:-----------:|:------:|:--------------:|
| Central `model-registry.ts` + `listOwnerRoutingMatrix` | ✓ | ✓ | NOT VERIFIED |
| Chat text (Gemini + DeepSeek stream usage) | ✓ | ✓ | **MANUAL open** |
| Voice call (`voice_call`, Live usageMetadata + duration fallback) | ✓ | ✓ | **MANUAL open** |
| Transcribe (`voice_transcription`, usageMetadata) | ✓ | ✓ | **MANUAL open** |
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
| **M1 — Economics Truth** | **NO** | Owner manual smoke not recorded (`PRODUCTION_ECONOMICS_SMOKE.md`) |
| **M2 — Owner Console Desktop** | **PARTIAL** | Implemented; layout + E2E not verified |
| **M3 — Mobile** | **PARTIAL** | Card layouts shipped; manual 390/1440 sign-off open |
| **M4 — Production Verified** | **NO** | M1 + layout gates |

---

## Documentation

| Doc | Accurate? |
|-----|-----------|
| `docs/GOAL_MODE_STATE.md` | ✓ updated 2026-09-18 |
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

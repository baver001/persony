# Economics & Owner — reconciliation baseline

**Stage:** Verified Economics & Owner Control Center  
**Audited:** 2026-09-18  
**Production URL:** https://beta.persony.org  
**Production SHA (deployed):** `840608fed00c39ce731a00a95f6d8e2bbee03a2a`  
**Repo `main` (remote):** `840608f` — matches production deploy  
**Last successful deploy:** GitHub Actions run `35327168946` (2026-09-18)  
**D1 migrations (remote):** `0001`–`0009` applied — no pending migrations  
**Production health:** `GET /api/health` → `status: ok`, `database: ready`

Status labels (do not mix):

- **DOCUMENTED** — written in README / map / specs / goal docs
- **IMPLEMENTED** — code exists on `main` or production branch
- **TESTED** — automated tests cover behavior
- **CI VERIFIED** — green on last `main` push pipeline
- **PRODUCTION VERIFIED** — confirmed on beta.persony.org with evidence
- **MANUAL VERIFIED** — human-run checklist with recorded outcome

---

## Platform & deploy

| Item | DOCUMENTED | IMPLEMENTED | TESTED | CI VERIFIED | PRODUCTION VERIFIED | MANUAL VERIFIED |
|------|:----------:|:-----------:|:------:|:-----------:|:-------------------:|:---------------:|
| CI verify (i18n, lint, test, build) | ✓ `docs/CI_CD.md` | ✓ `.github/workflows/ci.yml` | — | ✓ run `35327168946` | — | — |
| Deploy pipeline (verify→build→migrate→deploy→health) | ✓ | ✓ `.github/workflows/deploy.yml` | — | ✓ | ✓ health 200 | — |
| D1 migrations 0008 economy + 0009 rate limits | ✓ migration files | ✓ | partial integration tests | ✓ deploy job | ✓ `wrangler d1 migrations list --remote` | — |
| Clerk auth on production | ✓ `docs/USER_TASKS.md` | ✓ | partial | ✓ | ✓ `/api/config` authRequired | — |
| Paddle live billing | ✓ specs | ✗ disabled | — | — | ✗ `BILLING_ENABLED=false` | N/A |

---

## AI models (current code — not yet unified registry)

| Operation | Model IDs in code | DOCUMENTED | IMPLEMENTED | TESTED | PRODUCTION VERIFIED |
|-----------|-------------------|:----------:|:-----------:|:------:|:-------------------:|
| Chat text | `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `deepseek-chat`, `deepseek-reasoner` | partial `specs/07` | ✓ `models.ts`, providers | ✓ router tests | **NOT VERIFIED** against live provider API |
| Memory extract | same as chat stack | — | ✓ `structured-memory-extractor.ts` | partial | NOT VERIFIED |
| Persona generation | `GEMINI_GENERATOR_MODELS` | — | ✓ | — | NOT VERIFIED |
| Avatar image | `gemini-2.0-flash-preview-image-generation`, `gemini-2.0-flash-exp-image-generation` | — | ✓ `models.ts` | — | NOT VERIFIED — **preview models** |
| Transcription | `gemini-3.5-transcribe`, lite fallback | — | ✓ | — | NOT VERIFIED |
| Voice Call Live | `gemini-3.8-live` | partial | ✓ `worker/index.ts` WS | — | NOT VERIFIED |
| Call summary | generator models | — | ✓ | — | NOT VERIFIED |

**Gap:** Model IDs scattered (`worker/lib/models.ts`, `deepseek-chat-provider.ts`, legacy `server.ts`). No central `AIModelDefinition` registry. No `lastVerifiedAt` / official source audit on record.

---

## Provider usage & cost

| Item | DOCUMENTED | IMPLEMENTED | TESTED | PRODUCTION VERIFIED |
|------|:----------:|:-----------:|:------:|:-------------------:|
| `ProviderResult` + route metadata | partial goal docs | ✓ | ✓ | NOT VERIFIED |
| Provider-reported usage from stream API | goal brief | **partial** — chat uses `mergeProviderUsage`; often estimated | partial | NOT VERIFIED |
| `usage_estimated` on `inference_runs` | — | ✓ migration 0008 | partial | NOT VERIFIED |
| `provider_cost_microusd` persisted | — | ✓ | ✓ cost-engine tests | NOT VERIFIED end-to-end |
| `cost_confidence` (actual/estimated/unpriced) | goal brief | **✓ local** — `cost-confidence.ts`, migration `0010`, CostEngine returns `null` when unpriced | tests pass | deploy + prod E2E pending |
| `pricing_entry_id` / version on inference | goal brief | **✗** | — | — |
| Immutable historical cost (no repricing on catalog change) | goal brief | **partial** — cost written at settle time but no pricing entry link | — | — |
| Versioned multidimensional pricing | goal brief | **✗** — flat `PROVIDER_PRICING_CATALOG` per million tokens | ✓ basic tests | — |
| DeepSeek peak/off-peak / cache tiers | goal brief | **✗** | — | — |
| Audio/image/live pricing dimensions | goal brief | **✗** | — | — |
| Hardcoded markup `2.5` | — | ✓ `energyUnitsFromProviderCost` | — | — |
| Cost coverage % / unpriced count in owner UI | goal brief | **partial local** — `costCoverageTodayPercent`, `unpricedCallsToday` | — | deploy pending |
| Voice Call cost breakdown (live/transcribe/summary) | goal brief | **✗** | — | — |

---

## Energy

| Item | DOCUMENTED | IMPLEMENTED | TESTED | PRODUCTION VERIFIED |
|------|:----------:|:-----------:|:------:|:-------------------:|
| Reserve → settle → release | ✓ specs/battery-beta | ✓ | ✓ concurrency test | NOT VERIFIED |
| Chat + avatar + utility APIs on reservation | — | ✓ | partial | NOT VERIFIED |
| Voice Call WS reservation | — | ✓ `worker/index.ts` | — | NOT VERIFIED |
| Battery UI (signed-in) | map.md | ✓ | — | MANUAL local only |
| Retail pricing config (margin target) | goal brief | **✗** | — | — |

---

## Owner Console & API

| Item | DOCUMENTED | IMPLEMENTED | TESTED | PRODUCTION VERIFIED |
|------|:----------:|:-----------:|:------:|:-------------------:|
| `/owner/overview` | — | ✓ | — | NOT VERIFIED |
| `/owner/economics` | — | ✓ `economics-service.ts` | — | NOT VERIFIED |
| `/owner/ai/overview` | — | ✓ | — | NOT VERIFIED |
| `/owner/users` (basic list) | — | ✓ | — | NOT VERIFIED |
| `/owner/audit` | — | ✓ | — | NOT VERIFIED |
| Inference explorer API | goal brief | **✗** | — | — |
| Routing CRUD without deploy | goal brief | **partial** — `chat_text_provider` setting only | — | — |
| Pricing catalog UI | goal brief | **✗** | — | — |
| Typed API contracts (no `Record<string, unknown>`) | goal brief | **✗** — `OwnerConsole.tsx` | — | — |
| Responsive Owner Shell (desktop + mobile) | goal brief | **✗** — single page, limited sections | — | — |
| Section error + retry UX | goal brief | **partial** — top-level error only | — | — |

---

## Documentation accuracy

| Doc | Accurate for production? | Notes |
|-----|--------------------------|-------|
| `docs/GOAL_MODE_STATE.md` | **NO** — outdated phase, SHA, migration/CI gates | **Replace in Phase A** |
| `map.md` | **PARTIAL** — economy phase incomplete | Update in Phase L |
| `README.md` | **PARTIAL** | Audit in Phase L |
| `docs/CI_CD.md` | **YES** | Matches workflows |
| `specs/economics.md` | **MISSING** | Create Phase L |
| `specs/owner-console.md` | **MISSING** | Create Phase L |
| `specs/ai-model-registry.md` | **DOCUMENTED** (partial) | Phase B initial registry in code |
| `docs/METRICS.md` | **MISSING** | Create Phase L |

---

## Milestone readiness

| Milestone | Ready? | Blocker |
|-----------|--------|---------|
| **M1 — Economics Truth** (one inference fully explainable) | **NO** | cost_confidence, pricing entry link, provider usage, inference detail API/UI |
| **M2 — Owner Control Center Desktop** | **NO** | architecture + APIs + typed contracts |
| **M3 — Owner Control Center Mobile** | **NO** | depends M2 |
| **M4 — Production Verified** | **NO** | controlled inference + voice E2E not run |

---

## Phase A complete when

- [x] This reconciliation file exists with production SHA / deploy / migrations
- [x] `GOAL_MODE_STATE.md` updated to new stage and accurate gates
- [ ] `map.md` header/status points to this stage (minimal pointer — full update Phase L)

## Next work (Phase B — start immediately after A)

1. Full model ID grep audit + official provider doc verification
2. ~~Introduce `worker/ai/model-registry.ts` as single source of truth~~ — **done local**
3. ~~Fix CostEngine unpriced → **never return 0 as cost**; add `cost_confidence` column migration~~ — **done local** (migration 0010 pending deploy)

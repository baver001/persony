# Goal mode state

**Objective:** Closed beta — Persona platform with simulation battery, multi-provider AI, Paddle prepared (not live).

**Last updated:** 2026-09-18 UTC  
**Current phase:** Phase 2–4 prep **complete (code)** — verify deploy + D1 `0007`

## Roadmap

| Phase | Status |
|-------|--------|
| 1.1 Integrity Hardening | **Complete** |
| 1.2 Persona + Memory + Trust + i18n | **Complete** |
| 1.3 Closed beta (Battery, Discover, Owner) | **Complete** |
| 2 Multi-provider AI | **Complete** (code) |
| 3 Energy simulation | **Complete** — `battery_mode=simulation`, drain + lazy regen |
| 4 Paddle payments | **Prepared** — schema + stubs, `BILLING_ENABLED` off |
| 5 Public persona `/p/:slug` | **Complete** (code) |
| 6–10 Rooms, tools, OSS | **Planned** |

## Phase 2–4 component status

| Component | Implemented | CI | Production |
|-----------|---------------|-----|------------|
| ModelRouter + Gemini + DeepSeek adapters | ✅ | Pending | Pending |
| `chat_text_provider` system setting | ✅ | Pending | Pending |
| Owner AI overview | ✅ | Pending | Pending |
| `battery_mode=simulation` (+ beta_regen alias) | ✅ | Pending | Pending |
| Migration `0007` billing tables | ✅ | Pending | Pending |
| Billing API stubs (501/503) | ✅ | Pending | Pending |
| Settings billing “coming soon” | ✅ | Pending | Pending |
| Public persona `/p/:slug` + API | ✅ | Pending | Pending |

## Operator next steps

1. Apply D1 migration `0007` on production
2. Optional: set `DEEPSEEK_API_KEY` secret for Phase 2 fallback
3. Smoke: chat drain/regen, `/p/athena`, `/api/me/billing` returns disabled
4. Do **not** set `BILLING_ENABLED` until Paddle catalog + legal ready

## Constraints (unchanged)

- No live Paddle checkout
- No real payments
- Battery = simulation only (auto regen, no paid recharge)

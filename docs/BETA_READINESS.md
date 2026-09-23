# Beta Readiness

**Updated:** 2026-09-22  
**Target:** Closed beta without commercial billing  
**Production:** https://beta.persony.org (git `af3a78d`, CF `952375cd`)

Legend: `impl` = implemented in code · `test` = automated · `manual` = human verified · `prod` = on beta

| Feature | impl | test | manual | prod | Known issues |
|---------|:----:|:----:|:------:|:----:|--------------|
| Auth (Clerk) | ✓ | ✓ | partial | ✓ | persona-lifecycle E2E 3/3 (opt-in) |
| Persona create/edit | ✓ | ✓ | — | ✓ | editor reset + async save deployed |
| Persona canonical IDs | ✓ | ✓ | — | ✓ | `selectedPersonaId`, profile/editing IDs |
| Persona DTO round-trip | ✓ | ✓ | — | ✓ | worker + client map tests |
| Persona AI generation | ✓ | — | — | ✓ | auto portrait after character gen |
| Avatar Studio | ✓ | partial | — | ✓ | `gemini-3.1-flash-image` |
| Official avatars | ✗ | — | — | ✗ | Unsplash URLs — **user blocker** |
| Discover / Gallery | ✓ | ✓ | — | partial | install states + installed badge |
| Chat + persist | ✓ | ✓ | partial | ✓ | voice note mic UX fixed (WIP) |
| Voice message | partial | ✓ | — | ? | `chatMessageDisplay` + waveform tests |
| Voice Call | ✓ | — | — | ? | device soak open — **user blocker** |
| Memory | ✓ | partial | — | ? | — |
| My Personas | ✓ | partial | — | ✓ | auth-gated fetch + management center |
| Owner Console | ✓ | ✓ | partial | ✓ | KPI + period bars §54–55 |
| Beta Battery | ✓ | — | — | ✓ | — |
| Commercial billing | hidden | ✓ | — | ✓ | `BILLING_ENABLED=false` |
| Rooms | hidden | ✓ | — | partial | `ROOMS_ENABLED=false` |
| Playwright beta-critical | ✓ | ✓ | — | ✓ | 11/11 (8 smoke + 3 lifecycle opt-in) |

## Release gate (§85)

| Gate | Ready |
|------|-------|
| Auth signup/reload | **yes** (E2E 3/3 lifecycle on prod) |
| Persona CRUD no data loss | **yes** (unit + integration + E2E opt-in) |
| Avatar generate/save/reload | **partial** (studio + fallback; official roster still Unsplash) |
| Official 6 avatars | **no** (Gemini image quota + visual approve) |
| Gallery install flow | **partial** (manual install verify) |
| Voice message E2E | **partial** (unit tests; no Playwright mic test) |
| Voice Call devices | **no** (user soak) |
| Owner operational | **yes** |
| Billing hidden | **yes** |
| Mobile/desktop layout | **partial** (manual) |

**Recommendation:** **NO-GO** until official avatars + device Voice Call QA + beta reset execute + manual §86 sign-off.

## Automated gates

```powershell
npm run ci
npm run test:e2e:beta

# Authenticated persona lifecycle (optional):
$env:PERSONY_E2E_CLERK_AUTH = "1"
$env:PERSONY_E2E_CLERK_USER_ID = "user_..."
npm run test:e2e:beta
```

Prefer system browser when Chromium CDN fails:

```powershell
$env:PERSONY_E2E_CHANNEL = "msedge"
```

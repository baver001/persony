# Beta RC — live progress

**Stage:** Beta Release Candidate  
**Plan:** Beta RC spec §1–90 (execution order §87)  
**Production:** Version `952375cd` · gitSha `af3a78d` · https://beta.persony.org  
**Git:** `af3a78d` (Beta RC commit on `main`)  
**Tests:** 165/165 vitest · `npm run ci` green · Playwright **11/11** on beta

## §87 execution tracker

| Step | § | Status | Evidence |
|------|---|--------|----------|
| 1 | Documentation reconciliation | **done** | `BETA_READINESS.md`, `BETA_ACCEPTANCE.md`, `BETA_RC_PROGRESS.md` synced |
| 2 | Beta user Persona reset | **script ready** | dry-run verified remote (clerk: prefix fix); `--execute` awaits user |
| 3 | Canonical Persona state | **done** | `selectedPersonaId`, `profilePersonaId`, `editingPersonaId` + seed in `App.tsx` |
| 4 | Persona Editor fix | **done** | `resetPersonaForm`, modal sync, regression tests |
| 5 | Async save / no fake-success | **done** | `PersonaSaveHandler`, modal stays open on error |
| 6 | Persona DTO round-trip | **done** | integration `persona-configuration-roundtrip.test.ts` + `persona-spec-builder.test.ts` |
| 7 | My Personas management | **done** | auth-gated fetch fix; avatar studio shortcut; visibility toggle; share/duplicate/delete |
| 8 | AI model cleanup | **done** | `gemini-3.1-flash-image` primary; legacy image models disabled |
| 9 | Official avatar regeneration | **blocked (user)** | script `--execute` ready; Gemini image quota required |
| 10 | Avatar Studio E2E | **done** | persona prompts + errors + SVG fallback on AI failure |
| 11 | AI Persona generation polish | **done** | auto portrait + SVG fallback; structured avatar errors |
| 12 | Discover/Gallery | **done** | install states, installed badge, sign-in hint on 401 |
| 13 | Auth E2E | **done** | `auth-smoke.spec.ts` + `persona-lifecycle.spec.ts` **3/3** (`PERSONY_E2E_CLERK_AUTH=1`) |
| 14–16 | Chat / Voice / Call | **partial** | voice notes done (mic UX, i18n speech rec, waveform tests); Call QA **user** |
| 17 | Owner Console | **done** | KPI + period bars + trends; beta whatChanged; billing disabled label |
| 18 | UI normalization | **done** | nested modal Esc (Editor/Profile Drawer → Avatar Studio) §69 |
| 19 | Playwright beta-critical | **done** | **11/11** on beta.persony.org (8 smoke + 3 persona-lifecycle opt-in) |
| 20 | Manual QA | pending | |
| 21 | Docs sync | **done** | readiness, acceptance, goal-mode, map synced |
| 22–23 | Deploy + acceptance | **partial** | prod `af3a78d`; manual §86 pending |

## Session changelog (latest)

- Beta reset: fixed `clerk:user_…` lookup; remote dry-run OK (18 personas for owner)
- Official avatars: `generate-official-avatars.mjs --execute` + `--apply-roster` (Gemini quota blocked 429)
- UI §69: Profile Drawer Esc не закрывает drawer при открытом Avatar Studio
- Avatar Studio: SVG fallback on AI failure; `avatar-generation` structured errors
- Voice notes: speech recognition locale follows i18n (`speechRecognition.test.ts`)
- Import prompt: `shouldOfferLocalImport()` + dismiss persists (`cloudMigration.test.ts` +3)
- **Deploy:** `89568f94` → beta.persony.org
- Official avatar prompts dry-run → `public/personas/official/*.prompt.txt` (awaiting BLOCKER-1)
- **Deploy:** `3253dbfe` → beta.persony.org; health ok; persona-lifecycle create→delete green on prod
- E2E: persona-lifecycle **3/3** green (create→save→delete; import-modal dismiss timing fixed)
- App: import-local modal auto-closes on persona save / create-editor open (no chat overlay)
- CI: **159 vitest** + build green
- Chat: `chatMessageDisplay.test.ts` — legacy voice prompts не попадают в UI
- UI §69: Esc в Avatar Studio не закрывает родительский Persona Editor
- E2E: persona-lifecycle **2/2** green (create→save→delete via profile drawer; Clerk ticket exchange)
- My Personas: fetch gated on `apiAuthReady` (fix empty list on 401 race)
- Playwright: auto-load `.dev.vars`; persona-lifecycle skip по умолчанию

- Chat: voice note mic denial shows hint (не запускает Voice Call)
- E2E: `persona-lifecycle.spec.ts` + Clerk ticket fixture (skip без `PERSONY_E2E_CLERK_USER_ID`)

- Discover: sign-in hint when install returns 401
- Avatar Studio: `avatar-errors.ts` + unit tests
- Tests: 151 vitest green

- Playwright: **8/8 green** on beta.persony.org via Edge; health/app-shell fixes
- Auth E2E: `auth-smoke.spec.ts` (sign-in entry)
- Acceptance: `docs/BETA_ACCEPTANCE.md` §86 checklist
- BLOCKER-4 resolved (`PERSONY_E2E_CHANNEL`)

- Playwright: discover + billing-hidden specs; `PERSONY_E2E_CHANNEL` for system browser
- Discover: «Installed» badge on gallery cards
- Tests: `personas-map.test.ts`, `audioWaveform.test.ts`
- Docs: `BETA_READINESS.md` gate table refreshed

- Persona DTO: DB round-trip tests for `configurationJson` create/edit
- My Personas: Avatar Studio from ⋯ menu; visibility toggle without full editor
- Owner overview: period bar charts (AI calls, DAU, voice)
- Tests: 145 vitest green

- Canonical IDs: `profilePersonaId`, `editingPersonaId` + `editingPersonaSeed` in `App.tsx`
- AI Persona: `generatePersonaAvatar()` after character gen (`src/lib/api/avatar-generation.ts`)
- Tests: `persona-selection.test.ts` (+5), total 141 vitest green
- Playwright: use `PERSONY_E2E_CHANNEL=msedge` if Chromium CDN install fails (see BLOCKER-4)

- Avatar Studio: `avatar-prompt.ts`, persona context, structured API errors
- Owner overview: periods 24h/7d/30d/90d + trend deltas
- Docs: `GOAL_MODE_STATE.md`, `map.md`, `OFFICIAL_AVATAR_STYLE.md`
- Script: `scripts/generate-official-avatars.mjs` (prompt dry-run)

- Discover: install throws on failure; Installed/Open/Installing UI
- My Personas: ⋯ menu (share, duplicate/remix, avatar, visibility, delete)
- Owner overview: KPI cards (users, DAU, AI/voice calls)
- `installPersona()` throws `PersonasApiError` instead of silent false

- `ROOMS_ENABLED=false` — hidden in sidebar + route redirect
- Settings: billing section hidden when `!billing.enabled`
- Owner AI: `Billing: Disabled — Beta`
- Avatar routing → `gemini-3.1-flash-image`
- `src/lib/persona-selection.ts` — selected ID + beta cache epoch
- `scripts/reset-beta-user-personas.mjs`
- Playwright: `playwright.config.ts`, `npm run test:e2e:beta`
- Lint fixes: `persona-form.ts`, `CreatePersonaModal`, `me.ts` analytics schema

## Blockers — только вы

### BLOCKER-1: Official avatar generation (§19–24)

6 уникальных портретов для official roster.

**Шаги:**

1. Подтвердить стиль (avatar style bible §21) или прислать референс.
2. Убедиться, что `GEMINI_API_KEY` имеет **платный quota** на `gemini-3.1-flash-image` (free tier limit=0 для image model).
3. `node scripts/generate-official-avatars.mjs --execute --via-api` (Worker key + Clerk JWT) или `--execute` (локальный `GEMINI_API_KEY`).
4. По одному: `--slug=athena`.
5. Визуально approve 6 candidates → `node scripts/generate-official-avatars.mjs --apply-roster --confirm`.

### BLOCKER-2: Beta reset execute (§16–17)

**Шаги (когда будете готовы):**

```powershell
cd D:\02_Projects\Utilites\Persony
# Dry-run (accepts user_… or clerk:user_…)
node scripts/reset-beta-user-personas.mjs --clerk-user-id=user_3JPI4vKD0eD3KVY32ye3beNFpcA --remote
# После D1 backup:
node scripts/reset-beta-user-personas.mjs --clerk-user-id=user_3JPI4vKD0eD3KVY32ye3beNFpcA --remote --execute --confirm
```

Перед `--execute`: сделать D1 backup/snapshot.

### BLOCKER-3: Voice Call device QA (§50–51)

15–30 min soak на iPhone Safari / Android Chrome — только вы.

### BLOCKER-4: Playwright Chromium CDN — **resolved**

Используйте системный браузер:

```powershell
$env:PERSONY_E2E_CHANNEL = "msedge"   # или "chrome"
npm run test:e2e:beta
```

## Completion audit (2026-09-23)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Persona P0 (editor, save, IDs, My Personas) | **done** | prod `af3a78d`; lifecycle E2E 3/3 |
| Billing hidden | **done** | `BILLING_ENABLED=false`; E2E billing-hidden |
| `gemini-3.1-flash-image` | **done** | model-registry + avatar routes |
| Official 6 avatars (not Unsplash) | **blocked** | quota 429; `--apply-roster` pending |
| Discover/Gallery | **done** | E2E discover-smoke |
| Playwright beta-critical | **done** | **11/11** re-verified on prod |
| Owner Console beta standard | **done** | KPI + trends + beta labels |
| Beta reset execute | **blocked** | script ready; user D1 backup + confirm |
| Voice Call device QA | **blocked** | user soak |
| Manual §86 acceptance | **pending** | `BETA_ACCEPTANCE.md` |

**Verdict:** **NO-GO** (~76%). Automated scope complete; release blocked on 4 user gates above.

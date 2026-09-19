# Production economics smoke — Milestone 1

**Goal:** One controlled text-chat inference on https://beta.persony.org is fully explainable end-to-end.

**Prerequisites:** Owner Clerk account, deploy includes migrations `0010`–`0014`, economics commits deployed.

### Automated helper (API checks)

After signing in on beta as owner:

1. Open `/owner` (must not show «Sign in required» or «Forbidden»).
2. DevTools → Network → filter `owner`.
3. Reload Economy or Inference section.
4. Click any `/api/owner/*` request → Headers → copy `Authorization: Bearer …` (JWT only, without the `Bearer ` prefix is also fine if you include it in the env var as shown below).

```bash
SMOKE_OWNER_BEARER="<jwt>" npm run smoke:economics:owner
```

Token extraction (summary):

```bash
SMOKE_OWNER_BEARER="<jwt>" npm run smoke:economics:owner
```

Public + D1 (no auth): `npm run smoke:economics` — includes economy coverage % (today + 7d)  
Public only: `npm run smoke:economics:public`  
Operator D1 only (wrangler): `npm run smoke:economics:d1`

## Steps

1. **Health**
   - `GET https://beta.persony.org/api/health` → `status: ok`, `database: ready`

2. **Controlled chat**
   - Sign in as owner
   - Open any persona conversation
   - Send one short text message (e.g. «Привет, это smoke test economics»)
   - Wait for streamed reply to complete

3. **Owner Console → Inference**
   - Open `/owner` → Inference
   - Find the latest run (`operationType: chat_text`, `status: completed`)
   - Open detail:
     - `costConfidence` ∈ `actual` | `estimated` (not `unpriced` for known-priced model)
     - `usageEstimated: false` when provider returned token counts
     - `costBreakdown.lines` has at least one line with `microusd > 0`
     - `providerCostMicrousd` is **not** treated as $0 when confidence is `unpriced`

4. **Owner Console → Economy**
   - `costCoverageTodayPercent` increased vs pre-smoke (or 100% if first run of day)
   - `unpricedCallsToday` does not include the smoke run (unless model unpriced)
   - `aiCostTodayMicrousd` reflects known COGS from the run

5. **Optional D1 check** (owner with wrangler access)
   ```sql
   SELECT id, operation_type, usage_estimated, cost_confidence,
          provider_cost_microusd, pricing_entry_id
   FROM inference_runs
   ORDER BY started_at DESC LIMIT 1;
   ```
   - `operation_type = chat_text`
   - `pricing_entry_id` not null for priced chat model

## Optional: voice note (transcribe)

6. Send a short voice note in chat (with `personaId` context).
7. Owner Console → Inference → filter `voice_transcription`.
8. Expect `usageEstimated: false` when Gemini returns `usageMetadata`; COGS > 0.

## Optional: avatar generation

9. Persona profile → Avatar Studio → generate with prompt.
10. Inference filter `avatar_generation` → `costConfidence: actual`, per-image COGS (~$4 catalog row).

## Optional: persona generation (Create Persona AI)

11. Create Persona → «Generate with AI» with a short prompt.
12. Inference filter `persona_generation` → token COGS, `usageEstimated: false` when provider reports usage.

## Optional: call summary insights

13. After a voice call, open call insights recap on the summary message.
14. Inference filter `call_summary` → token COGS linked to `personaId`.

## Owner Console layout (390px / 1440px)

DevTools → toggle device toolbar. Sign in as owner → `/owner`.

### 390px (mobile)

15. Bottom nav shows **Overview · AI · Economy · Inference · More** — all tappable (≥44px).
16. **More** drawer opens secondary sections (Pricing, Users, Personas, Settings, Errors).
17. **Inference** — card list (not table); open `e2ac39dc` → **immutable** badge + line-item COGS; legacy rows show **legacy** badge.
18. **Economy** — metric cards stack; coverage % matches D1 smoke (~92% today).
19. No required horizontal scroll on any section.

### 1440px (desktop)

20. Left sidebar visible with grouped nav (Overview / AI / Economy / People / Usage / System).
21. **Inference** — table with columns Time, Operation, Model, COGS, Confidence, Status.
22. **Users / Personas** — tables on list; detail panel shows inference history.
23. Unpriced COGS renders as **—** (not $0.00).

## Record outcome

Update `docs/GOAL_MODE_STATE.md` manual verification table with date, inference run id, and pass/fail per row.

## Fail signals

| Observation | Likely cause |
|-------------|--------------|
| `usage_estimated = 1` always | Provider usage not captured from stream |
| `cost_confidence = unpriced` for DeepSeek/Gemini chat | Missing pricing catalog entry for model |
| `provider_cost_microusd` NULL in UI shown as $0.00 | Client rendering bug — must show “unknown” |
| `operation_type = text_chat` on new rows | Deploy missing migration 0013 / code not deployed |

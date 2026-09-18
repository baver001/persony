# Production economics smoke — Milestone 1

**Goal:** One controlled text-chat inference on https://beta.persony.org is fully explainable end-to-end.

**Prerequisites:** Owner Clerk account, deploy includes migrations `0010`–`0013`, economics commits deployed.

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

## Record outcome

Update `docs/GOAL_MODE_STATE.md` manual verification table with date, inference run id, and pass/fail per row.

## Fail signals

| Observation | Likely cause |
|-------------|--------------|
| `usage_estimated = 1` always | Provider usage not captured from stream |
| `cost_confidence = unpriced` for DeepSeek/Gemini chat | Missing pricing catalog entry for model |
| `provider_cost_microusd` NULL in UI shown as $0.00 | Client rendering bug — must show “unknown” |
| `operation_type = text_chat` on new rows | Deploy missing migration 0013 / code not deployed |

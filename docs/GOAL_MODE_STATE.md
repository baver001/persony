# Goal mode state

**Objective:** Развить Persony из локального MVP-мессенджера в платформу persistent AI personas (create · share · work) без переписывания рабочего приложения с нуля.

**Last updated:** 2026-09-15 UTC  
**Current phase:** Phase 0 — Baseline hardening

## Gate table

| Gate | Status | Evidence | Limitation / next proof |
|---|---|---|---|
| Baseline `npm install` / lint / build | verified | 2026-09-15: все три команды exit 0 | — |
| Production Worker доступен | verified | `GET /` → 200, `/api/health` → `status:ok` | Health раскрывает `hasApiKey` — убрать в Phase 0+ security |
| SSE parser с buffer + unit test | verified | `src/lib/sseParser.ts`, 4 tests, `npm test` | — |
| Model fallback по классу ошибки | verified | `worker/lib/provider-errors.ts`, 8 tests | Integration test с mock provider — Phase 2 |
| Vitest + CI `npm test` | open | Local 12/12 pass; workflow updated | Подтвердить зелёный CI после push |
| Текстовый streaming (manual) | open | — | Smoke после deploy |
| Voice note / Live call / transcript | open | Baseline из MVP, regression не автоматизирован | Phase 0 manual checklist |
| `specs/05-platform-roadmap.md` | verified | `specs/05-platform-roadmap.md` | Фазы 06–13 — по мере старта |
| `map.md` обновлён под платформу | verified | `map.md` | — |
| D1 / Auth / Energy / Catalog | open | — | Phase 1–5 |

## External tasks

_Нет блокирующих внешних задач на Phase 0._

## Next independent task

После merge Phase 0: начать Phase 1 vertical slice — D1 schema migrations + `AuthContext` interface + server-side persona load для `/api/chat` (без отправки `systemPrompt` с клиента).

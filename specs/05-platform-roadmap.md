# 05 — Platform roadmap (MVP → Persony Cloud)

**Статус:** Phases 1–10 foundation implemented (locally verified)  
**Цель:** Open platform for persistent AI personas — create, share, work with them.

## Продуктовая модель

- **Нет постоянного free AI tier** — одна trial-батарея на аккаунт, далее Energy.
- **Backend authoritative** — клиент шлёт `conversationId + personaId + message`, не `systemPrompt`.
- **Cost-aware** — любой inference через Usage + Energy ledger.

## Сохраняем из MVP (не ломать)

| Область | Spec / код |
|---------|------------|
| Messenger UX | `src/components/ChatArea.tsx`, `DESIGN.md` |
| Mobile + PWA | `index.css`, `PwaInstallBanner`, `public/sw.js` |
| Text streaming | `/api/chat` SSE |
| Voice notes | `/api/transcribe` |
| Gemini Live | `LiveVoiceCallModal`, `specs/04-mobile-voice-stability.md` |
| Call transcripts | `specs/03-call-transcript-persistence.md` |
| CF Workers deploy | `wrangler.jsonc`, `.github/workflows/deploy.yml` |

## Фазы

### Phase 0 — Baseline hardening `← текущая`

| Задача | Статус | Файлы |
|--------|--------|-------|
| SSE parser + buffer + test | done | `src/lib/sseParser.ts` |
| Model fallback по типу ошибки | done | `worker/lib/provider-errors.ts` |
| Vitest + `npm test` + CI | done | `vite.config.ts`, `deploy.yml` |
| Roadmap + map | done | этот файл, `map.md` |
| Health endpoint без утечки секретов | open | `worker/index.ts` |
| Voice regression checklist | open | manual |

### Phase 1 — Cloud foundation

- Clerk (или адаптер) → `AuthContext`, `users`
- D1 + Drizzle migrations
- `personas`, `persona_versions`, `conversations`, `messages`, `user_personas`
- Server-side persona load для chat
- localStorage import после login
- Spec: `06-cloud-data-auth.md`

### Phase 2 — Multi-provider AI

- `AIProvider` interface, `DeepSeekProvider`, `GeminiProvider`
- `ModelRouter` (feature flags)
- Normalized `ProviderUsage`
- Eval suite `eval/persona-chat.json`
- Spec: `07-ai-provider-router.md`

### Phase 3 — Energy foundation

- `energy_wallets`, `energy_ledger`, `usage_events`
- `CostEngine`, trial grant (1× full battery)
- Pre-authorisation + settlement
- Battery UI `🔋 N%`
- Spec: `08-energy-billing.md`

### Phase 4 — Payments

- Paddle `PaymentProvider`, webhook idempotency
- Manual recharge → auto-recharge-ready schema
- Spec: `08-energy-billing.md` (payments section)

### Phase 5 — Persona platform

- visibility: private / unlisted / public
- `/discover`, `/p/:slug` (SEO)
- install, share, remix, versioning
- Spec: `09-persona-registry.md`

### Phase 6 — Persistent memory

- user / persona_relationship / room scopes
- extraction pipeline + user Memory screen
- Spec: `10-memory.md`

### Phase 7 — Rooms

- `conversation.type = room`, @mentions, Ask team
- max agents / turns / cost budgets
- Spec: `11-rooms.md`

### Phase 8 — Professional layer

- Tool registry, knowledge → R2
- Spec: `12-professional-tools.md`

### Phase 9 — Voice production

- AudioWorklet preferred, ScriptProcessor fallback
- Voice billing через CostEngine
- Spec: `04-mobile-voice-stability.md` (append)

### Phase 10 — Open-source readiness

- portable `persony.persona.json`, BYOK, self-host docs
- Spec: `13-open-source-architecture.md`

## Целевая структура кода

```text
src/domain/          # persona, conversation, memory, energy, room
src/features/        # chat, personas, catalog, rooms, billing, voice
src/lib/api/         # client API
worker/routes/       # HTTP + WS
worker/services/     # billing, memory, providers
worker/repositories/ # D1 access
```

Вводить постепенно при реализации фаз — без big-bang rewrite.

## MVP 2.0 acceptance (кратко)

Account + trial once + cloud chat + multi-provider text + usage/ledger + Paddle recharge + create/publish/share persona + memory + room (2+ personas) + live voice baseline + security gates (см. §63 исходной спецификации).

## Связанные specs (план)

| Файл | Тема |
|------|------|
| `06-cloud-data-auth.md` | D1, Clerk, migrations |
| `07-ai-provider-router.md` | Providers, routing, eval |
| `08-energy-billing.md` | Wallet, trial, Paddle |
| `09-persona-registry.md` | Catalog, share, remix |
| `10-memory.md` | Memory pipeline |
| `11-rooms.md` | Multi-persona rooms |
| `12-professional-tools.md` | Tools, knowledge |
| `13-open-source-architecture.md` | BYOK, portable format |

## Принцип приоритизации

> Помогает ли это экосистеме персон, распространению, памяти, Rooms и простой Energy-экономике?

Если нет — отложить (анимации, marketplace payouts, native apps, собственная LLM).

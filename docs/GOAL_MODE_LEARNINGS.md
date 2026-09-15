# Goal mode learnings

_Журнал пополняется через `record-learning.mjs` и вручную при необходимости._
## 2026-09-15 — reliability

- **Change:** SSE chat stream now uses a buffered parser; model fallback only on unavailable/transient errors.
- **Evidence:** npm test (12 passed), npm run lint, npm run build exit 0
- **Reusable practice:** Never split SSE on raw network chunks; classify provider errors before model cascade fallback.
- **Scope:** project goal mode


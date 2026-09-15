# Self-hosting Persony

Persony Core is designed for self-hosting with BYOK (Bring Your Own Key).

## Requirements

- Node.js 22+
- Cloudflare Workers (or compatible adapter)
- D1 database
- Optional: R2 for knowledge files

## Quick start

```bash
npm ci
cp .dev.vars.example .dev.vars
# Set GEMINI_API_KEY, optionally DEEPSEEK_API_KEY
npm run db:migrate:local
npm run dev
```

## BYOK

Configure provider keys via API:

```bash
POST /api/byok
{ "provider": "deepseek", "apiKey": "sk-..." }
```

Or set environment secrets on your Worker:

- `GEMINI_API_KEY`
- `DEEPSEEK_API_KEY`

Managed Persony Cloud keys are never exposed to clients.

## Portable Persona format

Export/import personas as `*.persony.json` — see `schemas/persony.persona.json`.

## Licensing

Persony Core: **AGPL-3.0-only**. Commercial licensing available — see `COMMERCIAL-LICENSE.md`.

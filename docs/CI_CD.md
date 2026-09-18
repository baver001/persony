# CI/CD

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| [CI](.github/workflows/ci.yml) | PR → `main`, manual | validate i18n, typecheck, tests, build |
| [Deploy](.github/workflows/deploy.yml) | push → `main`, manual | verify → build → D1 migrate → Workers deploy → health check |

Deploy **does not** run on pull requests — only after merge to `main`.

## Local parity

```bash
npm run validate:i18n
npm run lint
npm test
npm run build
```

Or one command:

```bash
npm run ci
```

## Required GitHub secrets

| Secret | Used in |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | D1 migrate, wrangler deploy |
| `CLOUDFLARE_ACCOUNT_ID` | D1 migrate, wrangler deploy |
| `VITE_CLERK_PUBLISHABLE_KEY` | production Vite build (optional for typecheck-only) |

Worker runtime secrets (`GEMINI_API_KEY`, `CLERK_SECRET_KEY`, etc.) are set in Cloudflare, not in GitHub.

## Common failure causes

1. **TypeScript** — `npm run lint` locally before push
2. **Invalid locale JSON** — `npm run validate:i18n` (missing commas in `src/i18n/locales/**`)
3. **Tests** — `npm test`
4. **Missing CF secrets** — deploy job fails at secret verification step

## Branch protection (recommended)

On `main`:

- Require status check **CI / Verify** before merge
- Require status check **Deploy / Verify** optional (runs after merge)

## Production URL

https://beta.persony.org — health: `GET /api/health`

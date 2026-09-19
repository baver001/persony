# CI/CD

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| [CI](.github/workflows/ci.yml) | PR → `main`, manual | validate i18n, typecheck, tests, build |
| [Deploy](.github/workflows/deploy.yml) | push → `main`, manual | verify → build → D1 migrate → Workers deploy → health check |

Deploy **does not** run on pull requests — only after merge to `main`.

## Local parity

Первый раз (или после ошибки `tsc не является командой`):

```powershell
cd "D:\02_Projects\Utilites\Persony"
npm ci
```

Если `npm ci` падает с `EBUSY` — сначала остановите `npm run dev` (Ctrl+C), затем:

```powershell
cd "D:\02_Projects\Utilites\Persony"
Remove-Item -Recurse -Force node_modules
npm ci
```

Проверки по отдельности:

```powershell
cd "D:\02_Projects\Utilites\Persony"
npm run validate:i18n
npm run lint
npm test
npm run build
```

Или одной командой:

```powershell
cd "D:\02_Projects\Utilites\Persony"
npm run ci
```

## Required GitHub secrets

| Secret | Used in |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | D1 migrate, wrangler deploy |
| `CLOUDFLARE_ACCOUNT_ID` | D1 migrate, wrangler deploy |
| `VITE_CLERK_PUBLISHABLE_KEY` | production Vite build (optional for typecheck-only) |
| `CLERK_SECRET_KEY` | **optional** — post-deploy owner economics smoke (mint JWT via Clerk API) |
| `SMOKE_OWNER_BEARER` | **optional** — short-lived owner JWT (alternative to mint) |

Worker runtime secrets (`GEMINI_API_KEY`, `CLERK_SECRET_KEY`, etc.) live in Cloudflare. For **CI owner smoke**, duplicate production `CLERK_SECRET_KEY` into GitHub (same value as `wrangler secret put CLERK_SECRET_KEY`):

```powershell
gh secret set CLERK_SECRET_KEY
# paste production sk_live_* from Clerk Dashboard (Persony production instance)
```

Deploy then auto-discovers `SMOKE_OWNER_CLERK_USER_ID` from D1 and runs `smoke:economics:owner` + parity. Without this secret, owner smoke is skipped (operator smoke still runs).

## Common failure causes

1. **TypeScript** — `npm run lint` locally before push
2. **Invalid locale JSON** — `npm run validate:i18n` (missing commas in `src/i18n/locales/**`)
3. **Tests** — `npm test`
4. **Missing CF secrets** — deploy job fails at secret verification step
5. **Missing `dist/`** — deploy job must run `npm run build` before `wrangler deploy` (assets directory)

## Branch protection (recommended)

On `main`:

- Require status check **CI / Verify** before merge
- Require status check **Deploy / Verify** optional (runs after merge)

## Production URL

https://beta.persony.org — health: `GET /api/health`

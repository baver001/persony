# Beta-critical E2E (Playwright)

Target: `PERSONY_E2E_BASE_URL` (default `https://beta.persony.org`).

## Anonymous (always runs)

```powershell
$env:PERSONY_E2E_CHANNEL = "msedge"   # Windows: avoid Chromium CDN download
npm run test:e2e:beta
```

8 specs: health, shell, discover, billing hidden, rooms hidden, auth entry, my-personas shell.

## Authenticated (opt-in)

Requires production Clerk (`CLERK_SECRET_KEY` in `.dev.vars` or env) and a beta user id:

```powershell
$env:PERSONY_E2E_CLERK_AUTH = "1"
$env:PERSONY_E2E_CLERK_USER_ID = "user_..."   # or SMOKE_OWNER_CLERK_USER_ID in .dev.vars
$env:PERSONY_E2E_CHANNEL = "msedge"
npm run test:e2e:beta
```

Adds 4 tests: persona lifecycle (incl. reload→edit), discover install.

Full suite: **12/12** when Clerk env is set.

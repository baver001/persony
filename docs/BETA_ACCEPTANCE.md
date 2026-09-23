# Beta RC — production acceptance (§86)

**Target:** https://beta.persony.org  
**Baseline:** Version `0e51ed4a` (2026-09-22T08:32Z)

Run automated gates first:

```powershell
npm run ci
npm run test:e2e:beta

# Authenticated persona lifecycle (optional; production Clerk keys required):
# $env:PERSONY_E2E_CLERK_AUTH = "1"
# $env:PERSONY_E2E_CLERK_USER_ID = "user_..."   # same Clerk instance as beta.persony.org
# $env:CLERK_SECRET_KEY = "sk_..."
# npm run test:e2e:beta
```

## Checklist

| # | Scenario | Auto | Manual | Status |
|---|----------|:----:|:------:|--------|
| 1 | Health `GET /api/health` → ok | ✓ | — | verify post-deploy |
| 2 | Anonymous: app shell loads | ✓ | — | |
| 3 | Anonymous: Discover loads | ✓ | — | |
| 4 | Anonymous: billing hidden in Settings | ✓ | — | |
| 5 | Anonymous: Rooms hidden | ✓ | — | |
| 6 | Auth: Sign in / Sign up entry visible | ✓ | sign-in flow | |
| 7 | Persona create → save → reload → edit → delete | partial | ✓ | E2E create→delete **3/3** green (opt-in); reload/edit manual |
| 8 | AI Persona + portrait generation | — | ✓ | WIP |
| 9 | Avatar Studio save + reload | — | ✓ | WIP |
| 10 | Discover install → chat opens | — | ✓ | |
| 11 | Chat persist after reload | partial | ✓ | |
| 12 | Voice note record + playback waveform | partial | ✓ | |
| 13 | Voice Call 15–30 min (iPhone Safari, Android Chrome) | — | ✓ | **user** |
| 14 | Official 6 avatars (not Unsplash) | — | ✓ | **user** |
| 15 | Owner Console KPI + periods | — | ✓ | |
| 16 | Beta user persona reset executed | script | ✓ | **user** |

## Sign-off

- [ ] All automated gates green on target SHA
- [ ] Manual rows 7–16 verified
- [ ] No P0 regressions in Persona / Auth / Chat
- [ ] `docs/BETA_READINESS.md` recommendation updated to GO/NO-GO

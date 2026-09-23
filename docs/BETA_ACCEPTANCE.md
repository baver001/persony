# Beta RC — production acceptance (§86)

**Target:** https://beta.persony.org  
**Baseline:** gitSha `af3a78d` · CF `952375cd` (2026-09-23T12:55Z)

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
| 1 | Health `GET /api/health` → ok | ✓ | — | **ok** `af3a78d` |
| 2 | Anonymous: app shell loads | ✓ | — | **ok** E2E 2026-09-23 |
| 3 | Anonymous: Discover loads | ✓ | — | **ok** E2E 2026-09-23 |
| 4 | Anonymous: billing hidden in Settings | ✓ | — | **ok** E2E 2026-09-23 |
| 5 | Anonymous: Rooms hidden | ✓ | — | **ok** E2E 2026-09-23 |
| 6 | Auth: Sign in / Sign up entry visible | ✓ | sign-in flow | **ok** E2E entry |
| 7 | Persona create → save → reload → edit → delete | partial | ✓ | E2E lifecycle **3/3** (opt-in); includes reload→edit→delete |
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

- [x] All automated gates green on target SHA (`af3a78d` prod; CI + E2E 11/11 2026-09-23)
- [ ] Manual rows 7–16 verified
- [ ] No P0 regressions in Persona / Auth / Chat
- [ ] `docs/BETA_READINESS.md` recommendation updated to GO/NO-GO

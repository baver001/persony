# Official Persona Avatar Style Bible (Beta RC §21)

All six official Personas share one visual collection:

- distinct fictional person (no celebrity likeness)
- premium AI messenger portrait
- recognizable face at small sizes (40–64px)
- bust / head-and-shoulders framing
- simple neutral background
- strong silhouette
- consistent soft lighting and crop
- no text, logos, or watermarks
- WebP 1:1, ~1K, optimized payload

Each portrait should reflect the Persona character (role, warmth, domain) while staying in the same collection.

## Production assets

Target paths:

```text
public/personas/official/athena.webp
public/personas/official/viktor.webp
public/personas/official/marc_nova.webp
public/personas/official/sofia.webp
public/personas/official/elsa.webp
public/personas/official/chef_marco.webp
```

## Generation

Use `npm run generate:official-avatars` (dry-run) after style is approved.

**Execute** (requires paid Gemini image quota on `gemini-3.1-flash-image`):

```powershell
# Preferred: production Worker key + Clerk JWT
npm run generate:official-avatars:api

# Or local GEMINI_API_KEY
npm run generate:official-avatars -- --execute

# Single persona
npm run generate:official-avatars:api -- --slug=athena

# After visual approve of all six
node scripts/generate-official-avatars.mjs --apply-roster --confirm
```

Model: `gemini-3.1-flash-image` via Worker `/api/generate-avatar` or direct API in script. Script retries on 429 with backoff.

# Official Persona Avatar Style Bible (Beta RC §21)

All six official Personas share one visual collection:

- distinct fictional person (no celebrity likeness)
- premium AI messenger portrait
- recognizable face at small sizes (36–64px sidebar circles)
- bust / head-and-shoulders framing, face ~70% of frame height
- simple neutral background (zinc / charcoal)
- strong silhouette, clear eyes with catchlights
- consistent soft lighting and crop
- no text, logos, or watermarks
- WebP 1:1, 1024px, sharpened for thumbnail readability

Each portrait should reflect the Persona character (role, warmth, domain) while staying in the same collection.

## Prompt system (source of truth)

| Piece | Location |
| --- | --- |
| Collection rules + behavior → visual cues | `shared/personas/official-avatar-prompt.ts` |
| Hand-tuned art direction (one slug at a time) | `OFFICIAL_AVATAR_ART_DIRECTION` in the same file |
| Persona specs | `shared/personas/*-spec.ts` + `official-roster.ts` |
| Generation script | `scripts/generate-official-avatars.mjs` (run with `tsx`) |

**Pilot workflow (Athena first):**

1. Tune `OFFICIAL_AVATAR_ART_DIRECTION.athena` and run unit tests: `npm test -- shared/personas/official-avatar-prompt.test.ts`
2. Dry-run prompt: `npm run generate:official-avatars -- --slug=athena`
3. Generate image + 36/64px previews: `npm run generate:official-avatars:workers -- --slug=athena`
4. Review `public/personas/official/_previews/athena-36px.png` (sidebar size) and full `athena.webp`
5. Point roster entry to local WebP (`official-roster.ts` → `/personas/official/athena.webp`)
6. Repeat art direction for the next official slug before batch `--apply-roster`

## Production assets

```text
public/personas/official/athena.webp
public/personas/official/viktor.webp
…
public/personas/official/_previews/{slug}-36px.png  # QA only, not shipped to users
```

## Generation commands

```powershell
# Prompt only
npm run generate:official-avatars -- --slug=athena

# Image via Cloudflare Workers AI (FLUX.1 schnell) — recommended
npm run generate:official-avatars:workers -- --slug=athena

# Image via production Worker /api/generate-avatar (same model after deploy)
npm run generate:official-avatars:api -- --slug=athena

# After all six approved
tsx scripts/generate-official-avatars.mjs --apply-roster --confirm
```

# Core Official Personas (Phase 1.2)

Persony ships six **Official Core Personas** as the primary product demonstration:

| Persona | Role | Safety | Slug |
|---------|------|--------|------|
| Athena | Thinking Partner | GENERAL | `athena` |
| Viktor | Software Engineer | GENERAL | `viktor` |
| Marc Nova | Product & Startup Strategist | GENERAL | `marc_nova` |
| Sofia | Reflective Companion | SENSITIVE | `sofia` |
| Elsa | Storyteller & Worldbuilder | GENERAL | `elsa` |
| Chef Marco | Cooking Companion | GENERAL | `chef_marco` |

## Architecture

- Source of truth: `personas` + immutable `persona_versions.configuration_json` (validated `PersonaSpecV1`)
- Seed: `ensureOfficialPersonasSeeded()` — idempotent, does not mutate existing versions
- Presentation: EN canonical, RU in `presentation.localized`
- Install: `user_personas` row created on **Start chat**, not on signup

## UX

- New signed-in users see **Meet your Personas** until first install
- Sidebar shows **installed/recent** personas only
- Uninstall removes install row; conversation history preserved

## Differentiation

Behavior vectors in each spec drive `PersonaCompiler` band mapping (`low` / `medium` / `high` per trait).

Evals: `worker/integration/phase12-official-personas.test.ts`

## Files

- Specs: `shared/personas/*-spec.ts`, `shared/personas/official-roster.ts`
- Schema: `shared/persona-spec/schema.ts`
- Compiler: `worker/services/persona-compiler.ts`

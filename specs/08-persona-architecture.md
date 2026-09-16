# Phase 1.2 — Persona Architecture

## PersonaSpec v1

Stored in `persona_versions.configuration_json`. Sections: Identity, Mission, Behavior, Expertise, Capabilities, policies, Safety, Presentation (localized EN/RU).

## PersonaCompiler

`worker/services/persona-compiler.ts` — generates runtime instructions from Platform Policy + PersonaSpec + memory context.

## Athena

Official default persona. New users auto-install Athena only via `user_personas`. Legacy demo personas remain in codebase as `LEGACY_PERSONAS` but are not auto-installed.

## Versioning

Conversations pin `persona_version`. Compiler loads pinned version via `getPersonaVersion`.

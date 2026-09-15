#!/usr/bin/env bash
# Per-boot setup for the Persony Cloud Agent environment.
# Runs on every VM start (not baked into the build snapshot), so it can pick up
# runtime secrets injected as environment variables.
set -euo pipefail

cd "$(dirname "$0")/.."

# The Cloudflare Vite dev server loads local bindings/secrets from `.dev.vars`.
# Regenerate it each boot from injected env vars so a real GEMINI_API_KEY secret
# (added in the Cloud Agent Secrets panel) is picked up automatically. Without a
# key the app still runs; only Gemini inference (chat/live/transcribe) returns a
# provider error until a valid key is supplied.
cat > .dev.vars <<EOF
GEMINI_API_KEY=${GEMINI_API_KEY:-dev-placeholder-not-a-real-key}
PERSONY_DEV_MODE=${PERSONY_DEV_MODE:-true}
PERSONY_DEV_USER_ID=${PERSONY_DEV_USER_ID:-dev-local-user}
EOF

# Apply the D1 schema to the local Miniflare store used by the dev server.
# Idempotent: the migration is written with CREATE TABLE/INDEX IF NOT EXISTS.
npm run db:migrate:local

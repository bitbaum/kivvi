#!/usr/bin/env bash
# Apply the committed Drizzle migrations, in order and exactly as committed, to
# an EMPTY throwaway database (the browser-smoke job's Postgres service). Never
# point this at a shared database: production is migrated by the deploy's
# forward-only applier (bitbaum/loki scripts/hetzner/apply-schema.sh).
#
# Verbatim on purpose: a migration that only replays with help (a duplicated
# ADD COLUMN, a missing guard) fails here, before it reaches a new install.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must point at the throwaway database}"
dir="$(cd "$(dirname "$0")/../.." && pwd)/packages/database/drizzle"

for file in "$dir"/[0-9]*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -X -o /dev/null -f "$file" 2> >(grep -v 'NOTICE' >&2)
  echo "applied $(basename "$file")"
done

#!/usr/bin/env bash
# Apply the committed Drizzle migrations, in order, to an EMPTY throwaway
# database (the browser-smoke job's Postgres service). Never point this at a
# shared database: production is migrated by `pnpm db:migrate` (docs/DEPLOYMENT.md).
#
# The chain does not replay onto an empty database as committed: 0032 re-adds
# six columns that 0029 already added (invitations/memberships.permission_preset,
# users.location/languages/skills/availability_type). The files stay as they are
# (applied migrations are immutable); here every `ADD COLUMN` is read as
# `ADD COLUMN IF NOT EXISTS`, which changes nothing else. Any other error stops.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must point at the throwaway database}"
dir="$(cd "$(dirname "$0")/../.." && pwd)/packages/database/drizzle"

for file in "$dir"/[0-9]*.sql; do
  sed -E 's/ADD COLUMN "/ADD COLUMN IF NOT EXISTS "/g' "$file" |
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -X -o /dev/null -f - 2> >(grep -v 'NOTICE' >&2)
  echo "applied $(basename "$file")"
done

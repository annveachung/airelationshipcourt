#!/usr/bin/env bash
# ONE-TIME, after the first successful deploy: copies all users and data from Supabase into the
# server's Postgres. Run from the repo root (needs the Supabase keys in .env.local):
#   deploy/copy-data.sh [ssh-host]     (default host: annvea)
#
# The SQL streams straight into psql on the server and runs as one transaction, so it either
# copies everything or nothing. It refuses to run if anyone has already signed in to the new site.
set -euo pipefail
cd "$(dirname "$0")/.."
HOST=${1:-annvea}

node scripts/copy-from-supabase.mjs | ssh "$HOST" \
  'cd /var/www/pairadox && set -a && . ./.env && set +a &&
   psql "$DATABASE_URL" -X -q -At -v ON_ERROR_STOP=1 --single-transaction -f -'

echo "==> Copied. People sign in again with Google and land on their existing accounts."

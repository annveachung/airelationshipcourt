#!/usr/bin/env bash
# Applies db/migrations/*.sql in filename order, each exactly once, each in its own transaction.
# Applied files are recorded in migrations.applied (a schema PostgREST never exposes).
#
# Usage: npm run db:migrate          (reads DATABASE_URL from .env.local)
#        DATABASE_URL=... scripts/migrate.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${DATABASE_URL:-}" ] && [ -f .env.local ]; then
  DATABASE_URL=$(grep -E '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"'"'"'')
fi
: "${DATABASE_URL:?DATABASE_URL is not set}"

run_psql() { PGOPTIONS="-c client_min_messages=warning" psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }

run_psql -c "create schema if not exists migrations;
  create table if not exists migrations.applied (
    name text primary key,
    applied_at timestamptz not null default now()
  );"

for file in db/migrations/*.sql; do
  name=$(basename "$file")
  if [ -z "$(run_psql -At -c "select 1 from migrations.applied where name = '$name'")" ]; then
    echo "==> Applying $name"
    run_psql --single-transaction -f "$file" -c "insert into migrations.applied (name) values ('$name')"
  fi
done

# Tell PostgREST to pick up new tables and functions.
run_psql -c "notify pgrst, 'reload schema'"
echo "==> Database is up to date"

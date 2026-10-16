#!/usr/bin/env bash
# One-time (and safe to re-run) setup of the production server for pairadox.achtlabs.com.
# It shares the Oracle instance, Postgres 16, nginx and pm2 with annvea.com.
#
# Run from the repo root on your computer:
#   tar -c db/roles.sql deploy | ssh annvea 'rm -rf /tmp/pairadox-setup && mkdir /tmp/pairadox-setup &&
#     tar -x -C /tmp/pairadox-setup && sudo bash /tmp/pairadox-setup/deploy/server-setup.sh'
#
# What it does (each step skips itself when already done):
#   1. 1 GB swap file, if the server has no swap (the box has 1 GB RAM and now runs two apps)
#   2. Postgres: Supabase-style roles, a `pairadox` owner role, a PostgREST login role, a database
#   3. PostgREST as a systemd service on 127.0.0.1:3100 (never exposed publicly)
#   4. /var/www/pairadox with a .env holding generated secrets (Google/DashScope keys left blank)
#   5. nginx site; HTTPS certificate from Let's Encrypt once DNS points at this server
set -euo pipefail

DOMAIN=pairadox.achtlabs.com
APP_DIR=/var/www/pairadox
APP_USER=ubuntu
APP_PORT=3001
REST_PORT=3100
PGRST_VERSION=v16.4
SETUP_DIR=$(cd "$(dirname "$0")/.." && pwd)

[ "$(id -u)" -eq 0 ] || { echo "Run with sudo." >&2; exit 1; }
log() { printf '\n==> %s\n' "$*"; }
secret() { openssl rand -hex 32; }
pg() { sudo -u postgres psql -X -q -v ON_ERROR_STOP=1 "$@"; }

# --- 1. Swap -----------------------------------------------------------------------------------
if [ -z "$(swapon --show)" ]; then
  log "Adding a 1 GB swap file"
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# --- Secrets: reuse what a previous run generated ----------------------------------------------
mkdir -p "$APP_DIR"
chown "$APP_USER:$APP_USER" "$APP_DIR"
ENV_FILE="$APP_DIR/.env"
PGRST_CONF=/etc/postgrest/pairadox.conf

env_value() { [ -f "$ENV_FILE" ] && grep -E "^$1=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' || true; }
DB_PASSWORD=$(env_value DATABASE_URL | sed -nE 's#^postgres://pairadox:([^@]+)@.*#\1#p')
JWT_SECRET=$(env_value POSTGREST_JWT_SECRET)
AUTH_SECRET=$(env_value AUTH_SECRET)
REST_PASSWORD=$([ -f "$PGRST_CONF" ] && sed -nE 's#^db-uri = "postgres://pairadox_authenticator:([^@]+)@.*#\1#p' "$PGRST_CONF" || true)
: "${DB_PASSWORD:=$(secret)}" "${JWT_SECRET:=$(secret)}" "${AUTH_SECRET:=$(secret)}" "${REST_PASSWORD:=$(secret)}"

# --- 2. Postgres -------------------------------------------------------------------------------
log "Postgres: roles and database"
pg -f "$SETUP_DIR/db/roles.sql"
pg -v db_pw="$DB_PASSWORD" -v rest_pw="$REST_PASSWORD" <<'SQL'
select format('create role pairadox login password %L', :'db_pw')
  where not exists (select from pg_roles where rolname = 'pairadox') \gexec
select format('alter role pairadox password %L', :'db_pw') \gexec
select format('create role pairadox_authenticator login noinherit password %L', :'rest_pw')
  where not exists (select from pg_roles where rolname = 'pairadox_authenticator') \gexec
select format('alter role pairadox_authenticator password %L', :'rest_pw') \gexec
grant anon, authenticated, service_role to pairadox_authenticator;
select 'create database pairadox owner pairadox'
  where not exists (select from pg_database where datname = 'pairadox') \gexec
revoke connect on database pairadox from public;
grant connect on database pairadox to pairadox, pairadox_authenticator;
SQL

# --- 3. PostgREST ------------------------------------------------------------------------------
if ! /usr/local/bin/postgrest --version 2>/dev/null | grep -q "${PGRST_VERSION#v}"; then
  log "Installing PostgREST $PGRST_VERSION"
  tmp=$(mktemp -d)
  curl -fsSL -o "$tmp/pgrst.tar.xz" \
    "https://github.com/PostgREST/postgrest/releases/download/$PGRST_VERSION/postgrest-$PGRST_VERSION-linux-static-x86-64.tar.xz"
  tar -xJf "$tmp/pgrst.tar.xz" -C "$tmp"
  install -m 755 "$tmp/postgrest" /usr/local/bin/postgrest
  rm -rf "$tmp"
fi
id postgrest >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin postgrest

log "PostgREST: config and service"
mkdir -p /etc/postgrest
cat > "$PGRST_CONF" <<EOF
db-uri = "postgres://pairadox_authenticator:$REST_PASSWORD@127.0.0.1:5432/pairadox"
db-schemas = "public"
db-anon-role = "anon"
db-pool = 5
jwt-secret = "$JWT_SECRET"
server-host = "127.0.0.1"
server-port = $REST_PORT
EOF
chown root:postgrest "$PGRST_CONF"
chmod 640 "$PGRST_CONF"

cat > /etc/systemd/system/postgrest-pairadox.service <<EOF
[Unit]
Description=PostgREST for pairadox.achtlabs.com
After=network.target postgresql.service
Requires=postgresql.service

[Service]
User=postgrest
ExecStart=/usr/local/bin/postgrest $PGRST_CONF
ExecReload=/bin/kill -SIGUSR1 \$MAINPID
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable postgrest-pairadox >/dev/null 2>&1
systemctl restart postgrest-pairadox

# --- 4. App .env -------------------------------------------------------------------------------
if [ ! -f "$ENV_FILE" ]; then
  log "Writing $ENV_FILE (fill in the Google and DashScope keys)"
  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=$APP_PORT
HOSTNAME=127.0.0.1

DATABASE_URL="postgres://pairadox:$DB_PASSWORD@127.0.0.1:5432/pairadox"
POSTGREST_URL="http://127.0.0.1:$REST_PORT"
POSTGREST_JWT_SECRET="$JWT_SECRET"

AUTH_SECRET="$AUTH_SECRET"
AUTH_TRUST_HOST=true
# Auth.js builds the Google callback address from this (Next reports the request host as localhost).
AUTH_URL="https://$DOMAIN"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""

DASHSCOPE_API_KEY=""
DASHSCOPE_BASE_URL="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
DASHSCOPE_MODEL="qwen-plus"
EOF
  chown "$APP_USER:$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

# --- 5. nginx + HTTPS --------------------------------------------------------------------------
NGINX_SITE=/etc/nginx/sites-available/pairadox
CERT_DIR=/etc/letsencrypt/live/$DOMAIN

write_nginx() {
  sed -e "s#__DOMAIN__#$DOMAIN#g" -e "s#__APP_PORT__#$APP_PORT#g" "$1" > "$NGINX_SITE"
  ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/pairadox
  nginx -t
  systemctl reload nginx
}

if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
  log "nginx: HTTP-only site (for the certificate challenge)"
  write_nginx "$SETUP_DIR/deploy/nginx/pairadox-http.conf"
  mkdir -p /var/www/html
  if getent hosts "$DOMAIN" >/dev/null; then
    log "Requesting HTTPS certificate for $DOMAIN"
    certbot certonly --webroot -w /var/www/html -d "$DOMAIN" --non-interactive --agree-tos \
      || echo "!! certbot failed. Check that $DOMAIN points at this server, then re-run this script."
  else
    echo "!! $DOMAIN does not resolve yet. Add the DNS record, then re-run this script for HTTPS."
  fi
fi

if [ -f "$CERT_DIR/fullchain.pem" ]; then
  log "nginx: HTTPS site"
  write_nginx "$SETUP_DIR/deploy/nginx/pairadox.conf"
fi

log "Done. PostgREST: $(systemctl is-active postgrest-pairadox). App dir: $APP_DIR"

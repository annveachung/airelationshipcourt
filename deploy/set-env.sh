#!/usr/bin/env bash
# Sets one value in the server's /var/www/pairadox/.env without it appearing in your shell
# history or on screen, then restarts the app so it takes effect.
#   deploy/set-env.sh AUTH_GOOGLE_ID [ssh-host]      (default host: annvea)
set -euo pipefail
KEY=${1:?usage: deploy/set-env.sh KEY [ssh-host]}
HOST=${2:-annvea}

read -rsp "$KEY: " VALUE
echo
[ -n "$VALUE" ] || { echo "Empty value; nothing changed." >&2; exit 1; }

printf '%s\t%s\n' "$KEY" "$VALUE" | ssh "$HOST" 'set -euo pipefail
  cd /var/www/pairadox
  IFS=$'"'"'\t'"'"' read -r k v
  awk -v k="$k" -v v="$v" -F= '"'"'BEGIN { OFS = "="; done = 0 }
    $1 == k { print k "=\"" v "\""; done = 1; next } { print }
    END { if (!done) print k "=\"" v "\"" }'"'"' .env > .env.tmp
  cat .env.tmp > .env && rm .env.tmp
  export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  if pm2 describe pairadox >/dev/null 2>&1; then
    set -a; . ./.env; set +a
    pm2 reload pairadox --update-env >/dev/null && echo "App restarted."
  fi'
echo "$KEY saved on $HOST."

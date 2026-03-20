#!/bin/sh
# Nube Auth – nginx entrypoint
# Injects DOMAIN, GATEWAY_INTERNAL_URL, CORE_INTERNAL_URL, and WORKERS_INTERNAL_URL
# into the nginx config template at startup, then hands off to the standard nginx process.
set -e

: "${DOMAIN:?DOMAIN environment variable is required (e.g. DOMAIN=nubeauth.com)}"
: "${GATEWAY_INTERNAL_URL:?GATEWAY_INTERNAL_URL environment variable is required (e.g. GATEWAY_INTERNAL_URL=http://nubeauth-gateway.railway.internal:8080)}"

# Optional – default to a dummy address so nginx starts even if these services
# are not yet deployed. Requests to core./work. will return 502 until set.
# Must be exported so envsubst (a child process) can see them.
export CORE_INTERNAL_URL="${CORE_INTERNAL_URL:-http://127.0.0.1:1}"
export WORKERS_INTERNAL_URL="${WORKERS_INTERNAL_URL:-http://127.0.0.1:1}"

envsubst '${DOMAIN} ${GATEWAY_INTERNAL_URL} ${CORE_INTERNAL_URL} ${WORKERS_INTERNAL_URL}' \
  < /etc/nginx/templates/subdomains.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'

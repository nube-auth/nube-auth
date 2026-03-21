#!/bin/sh
# Nube Auth – nginx entrypoint
# Injects DOMAIN, GATEWAY_INTERNAL_URL, CORE_INTERNAL_URL, WORKERS_INTERNAL_URL,
# and NGINX_RESOLVER into the nginx config template at startup.
set -e

: "${DOMAIN:?DOMAIN environment variable is required (e.g. DOMAIN=nubeauth.com)}"
: "${GATEWAY_INTERNAL_URL:?GATEWAY_INTERNAL_URL environment variable is required (e.g. GATEWAY_INTERNAL_URL=http://nubeauth-gateway.railway.internal:8080)}"

# Optional – default to a dummy address so nginx starts even if these services
# are not yet deployed. Requests to core./work. will return 502 until set.
# Must be exported so envsubst (a child process) can see them.
export CORE_INTERNAL_URL="${CORE_INTERNAL_URL:-http://127.0.0.1:1}"
export WORKERS_INTERNAL_URL="${WORKERS_INTERNAL_URL:-http://127.0.0.1:1}"

# Detect the system DNS resolver so nginx can re-resolve Railway internal
# hostnames at runtime. Railway containers use their own DNS — it is not
# always 127.0.0.11 (Docker's embedded DNS). We read the first nameserver
# from /etc/resolv.conf and fall back to 8.8.8.8 if unavailable.
export NGINX_RESOLVER
NGINX_RESOLVER=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf 2>/dev/null || echo '8.8.8.8')
echo "[entrypoint] using DNS resolver: ${NGINX_RESOLVER}"

envsubst '${DOMAIN} ${GATEWAY_INTERNAL_URL} ${CORE_INTERNAL_URL} ${WORKERS_INTERNAL_URL} ${NGINX_RESOLVER}' \
  < /etc/nginx/templates/subdomains.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'

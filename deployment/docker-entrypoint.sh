#!/bin/sh
# Nube Auth – nginx entrypoint
# Injects DOMAIN, GATEWAY_INTERNAL_URL, CORE_INTERNAL_URL, and WORKERS_INTERNAL_URL
# into the nginx config template at startup, then hands off to the standard nginx process.
set -e

: "${DOMAIN:?DOMAIN environment variable is required (e.g. DOMAIN=nubeauth.com)}"
: "${GATEWAY_INTERNAL_URL:?GATEWAY_INTERNAL_URL environment variable is required (e.g. GATEWAY_INTERNAL_URL=http://nubeauth-gateway.railway.internal:8080)}"
: "${CORE_INTERNAL_URL:?CORE_INTERNAL_URL environment variable is required (e.g. CORE_INTERNAL_URL=http://nubeauth-core.railway.internal:8080)}"
: "${WORKERS_INTERNAL_URL:?WORKERS_INTERNAL_URL environment variable is required (e.g. WORKERS_INTERNAL_URL=http://nubeauth-workers.railway.internal:8080)}"

envsubst '${DOMAIN} ${GATEWAY_INTERNAL_URL} ${CORE_INTERNAL_URL} ${WORKERS_INTERNAL_URL}' \
  < /etc/nginx/templates/subdomains.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'

#!/bin/sh
# Nube Auth – entrypoint for Dockerfile.app (all-in-one staging container)
#
# 1. Validates required env vars
# 2. Sets localhost defaults for internal service URLs (all services run in-container)
# 3. Detects system DNS resolver for nginx
# 4. Renders the nginx config template
# 5. Execs supervisord (which starts nginx + core + gateway + workers)
set -e

: "${DOMAIN:?DOMAIN environment variable is required (e.g. DOMAIN=nubeauth.com)}"

# In this combined container all Node services run on localhost.
# Dockerfile ENV provides sensible defaults; Railway vars can override if needed.
export SUBDOMAIN_PREFIX="${SUBDOMAIN_PREFIX:-}"
export GATEWAY_INTERNAL_URL="${GATEWAY_INTERNAL_URL:-http://localhost:3004}"
export CORE_INTERNAL_URL="${CORE_INTERNAL_URL:-http://localhost:3003}"
# Workers has no public HTTP traffic; dummy value suppresses nginx upstream errors.
export WORKERS_INTERNAL_URL="${WORKERS_INTERNAL_URL:-http://localhost:1}"

# Detect the system DNS resolver so nginx can re-resolve variable hostnames at
# runtime.  Even for localhost targets the resolver directive must be present.
export NGINX_RESOLVER

NGINX_RESOLVER=$(awk '/^nameserver/ && $2 !~ /:/{print $2; exit}' /etc/resolv.conf 2>/dev/null)

if [ -z "$NGINX_RESOLVER" ]; then
  _raw=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf 2>/dev/null)
  if [ -n "$_raw" ]; then
    NGINX_RESOLVER="[${_raw}]"
  else
    NGINX_RESOLVER="8.8.8.8"
  fi
fi

echo "[entrypoint] DNS resolver     : ${NGINX_RESOLVER}"
echo "[entrypoint] GATEWAY_INTERNAL : ${GATEWAY_INTERNAL_URL}"
echo "[entrypoint] CORE_INTERNAL    : ${CORE_INTERNAL_URL}"
echo "[entrypoint] SUBDOMAIN_PREFIX : '${SUBDOMAIN_PREFIX}'"

envsubst '${DOMAIN} ${SUBDOMAIN_PREFIX} ${GATEWAY_INTERNAL_URL} ${CORE_INTERNAL_URL} ${WORKERS_INTERNAL_URL} ${NGINX_RESOLVER}' \
  < /etc/nginx/templates/subdomains.conf.template \
  > /etc/nginx/http.d/default.conf

echo "[entrypoint] nginx config rendered — starting supervisord"
exec supervisord -c /etc/supervisord.conf

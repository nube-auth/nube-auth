#!/bin/sh
# Nube Auth – entrypoint for Dockerfile.app (all-in-one staging container)
#
# 1. Optionally fetches .env.prod from DaemonHound vault
# 2. Validates required env vars
# 3. Sets localhost defaults for internal service URLs (all services run in-container)
# 4. Detects system DNS resolver for nginx
# 5. Renders the nginx config template
# 6. Execs supervisord (which starts nginx + core + gateway + workers)
set -e

# ── DaemonHound vault fetch (optional) ───────────────────────────────────────
# If DHD_VAULT_REMOTE is set, fetch .env.prod from the vault and source it.
# All supervisord-managed processes will inherit this environment.
# If not set, we skip gracefully — existing Railway services without dhd vars
# will continue to work with their native env configuration.
if [ -n "${DHD_VAULT_REMOTE:-}" ] && [ "${DHD_SKIP:-}" != "true" ]; then
  DHD_NAMESPACE="${DHD_NAMESPACE:-github.com/nube-auth/nube-auth}"
  DHD_FILE="${DHD_FILE:-.env.prod}"
  DHD_VAULT_DIR="${DHD_VAULT_DIR:-/tmp/dhd-vault}"

  # Resolve age identity
  if [ -n "${DHD_IDENTITY_FILE:-}" ]; then
    IDENTITY_FILE="$DHD_IDENTITY_FILE"
  elif [ -n "${DHD_AGE_KEY:-}" ]; then
    IDENTITY_FILE=$(mktemp)
    printf '%s\n' "$DHD_AGE_KEY" > "$IDENTITY_FILE"
    trap 'rm -f "$IDENTITY_FILE"' EXIT
  else
    echo "[dhd] WARNING: DHD_VAULT_REMOTE is set but neither DHD_AGE_KEY nor DHD_IDENTITY_FILE is provided. Skipping vault fetch." >&2
    DHD_SKIP=true
  fi

  if [ "${DHD_SKIP:-}" != "true" ]; then
    echo "[dhd] cloning vault from ${DHD_VAULT_REMOTE}..."
    rm -rf "$DHD_VAULT_DIR"

    if dhd clone "$DHD_VAULT_REMOTE" \
      --directory "$DHD_VAULT_DIR" \
      --identity "$IDENTITY_FILE" 2>&1; then

      echo "[dhd] reading ${DHD_NAMESPACE}:${DHD_FILE}..."
      cd "$DHD_VAULT_DIR"

      RAW_OUTPUT=$(dhd read "${DHD_NAMESPACE}:${DHD_FILE}" 2>/dev/null) || {
        echo "[dhd] WARNING: failed to read ${DHD_NAMESPACE}:${DHD_FILE}. Proceeding without vault env." >&2
        RAW_OUTPUT=""
      }

      if [ -n "$RAW_OUTPUT" ]; then
        # Filter dhd info lines; keep only env-var lines, comments, and blanks
        ENV_CONTENT=$(printf '%s\n' "$RAW_OUTPUT" | sed -n '/^[A-Za-z_][A-Za-z0-9_]*=/p;/^#/p;/^$/p')
        if [ -n "$ENV_CONTENT" ]; then
          ENV_FILE=$(mktemp)
          printf '%s\n' "$ENV_CONTENT" > "$ENV_FILE"
          echo "[dhd] sourcing env file (${DHD_FILE})..."
          set -a
          . "$ENV_FILE"
          set +a
          rm -f "$ENV_FILE"
        fi
      fi

      rm -rf "$DHD_VAULT_DIR"
    else
      echo "[dhd] WARNING: failed to clone vault. Proceeding without vault env." >&2
    fi
  fi
fi

# ── Validate critical env vars ───────────────────────────────────────────────
# These must be present regardless of source (Railway native or dhd vault).
validate_env() {
  _missing=""
  for _var in "$@"; do
    eval "_val=\${$_var:-}"
    if [ -z "$_val" ]; then
      _missing="${_missing}  - ${_var}\n"
    fi
  done
  if [ -n "$_missing" ]; then
    echo "[entrypoint] ERROR: the following required environment variables are missing:" >&2
    printf '%b' "$_missing" >&2
    echo "[entrypoint] Set them via Railway Variables or ensure they are present in the dhd vault file." >&2
    exit 1
  fi
}

validate_env \
  NODE_ENV \
  DATABASE_URL \
  REDIS_URL \
  S2S_SECRET \
  SESSION_SECRET \
  ENCRYPTION_KEY

: "${DOMAIN:?DOMAIN environment variable is required (e.g. DOMAIN=nubeauth.com)}"

# In this combined container all Node services run on localhost.
# Dockerfile ENV provides sensible defaults; Railway vars can override if needed.
export SUBDOMAIN_PREFIX="${SUBDOMAIN_PREFIX:-}"
export GATEWAY_INTERNAL_URL="${GATEWAY_INTERNAL_URL:-http://127.0.0.1:3004}"
export CORE_INTERNAL_URL="${CORE_INTERNAL_URL:-http://127.0.0.1:3003}"
# Workers has no public HTTP traffic; dummy value suppresses nginx upstream errors.
export WORKERS_INTERNAL_URL="${WORKERS_INTERNAL_URL:-http://127.0.0.1:1}"

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

# App template uses direct proxy_pass — no NGINX_RESOLVER needed.
envsubst '${DOMAIN} ${SUBDOMAIN_PREFIX} ${GATEWAY_INTERNAL_URL} ${CORE_INTERNAL_URL} ${WORKERS_INTERNAL_URL}' \
  < /etc/nginx/templates/subdomains.conf.template \
  > /etc/nginx/http.d/default.conf

echo "[entrypoint] nginx config rendered — starting supervisord"
exec supervisord -c /etc/supervisord.conf

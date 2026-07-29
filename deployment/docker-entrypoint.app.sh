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

echo "[entrypoint] ============================================"
echo "[entrypoint] Nube Auth All-in-One Entrypoint Starting"
echo "[entrypoint] ============================================"

# ── Check dhd binary ─────────────────────────────────────────────────────────
if command -v dhd >/dev/null 2>&1; then
  DHD_VERSION=$(dhd --version 2>/dev/null || echo "unknown")
  echo "[entrypoint] dhd binary version: ${DHD_VERSION}"
else
  echo "[entrypoint] dhd binary not found in PATH — vault fetch unavailable"
fi

# ── DaemonHound vault fetch (optional) ───────────────────────────────────────
# If DHD_VAULT_REMOTE is set, fetch .env from the vault and source it.
# All supervisord-managed processes will inherit this environment.
# If not set, we skip gracefully — existing Railway services without dhd vars
# will continue to work with their native env configuration.
echo "[entrypoint] config: DHD_SKIP=${DHD_SKIP:-<not set>}"
echo "[entrypoint] config: DHD_VAULT_REMOTE=${DHD_VAULT_REMOTE:-<not set>}"
echo "[entrypoint] config: DHD_NAMESPACE=${DHD_NAMESPACE:-<not set, will use default>}"
echo "[entrypoint] config: DHD_FILE=${DHD_FILE:-<not set, will use default>}"
echo "[entrypoint] config: DHD_IDENTITY_FILE=${DHD_IDENTITY_FILE:-<not set>}"
echo "[entrypoint] config: DHD_AGE_KEY=${DHD_AGE_KEY:+<set, length ${#DHD_AGE_KEY}>}"

if [ -n "${DHD_VAULT_REMOTE:-}" ] && [ "${DHD_SKIP:-}" != "true" ]; then
  DHD_NAMESPACE="${DHD_NAMESPACE:-github.com/nube-auth/nube-auth}"
  DHD_FILE="${DHD_FILE:-.env.prod}"
  DHD_VAULT_DIR="${DHD_VAULT_DIR:-/tmp/dhd-vault}"

  echo "[entrypoint] resolved: DHD_NAMESPACE=${DHD_NAMESPACE}"
  echo "[entrypoint] resolved: DHD_FILE=${DHD_FILE}"
  echo "[entrypoint] resolved: DHD_VAULT_DIR=${DHD_VAULT_DIR}"
  echo "[entrypoint] vault fetch enabled — resolving age identity..."

  # Resolve age identity
  if [ -n "${DHD_IDENTITY_FILE:-}" ]; then
    IDENTITY_FILE="$DHD_IDENTITY_FILE"
    echo "[entrypoint] identity source: DHD_IDENTITY_FILE=${IDENTITY_FILE}"
  elif [ -n "${DHD_AGE_KEY:-}" ]; then
    IDENTITY_FILE=$(mktemp)
    printf '%s\n' "$DHD_AGE_KEY" > "$IDENTITY_FILE"
    trap 'rm -f "$IDENTITY_FILE"' EXIT
    echo "[entrypoint] identity source: DHD_AGE_KEY (written to temp file)"
    echo "[entrypoint] identity temp file: ${IDENTITY_FILE}"
  else
    echo "[entrypoint] WARNING: DHD_VAULT_REMOTE is set but neither DHD_AGE_KEY nor DHD_IDENTITY_FILE provided" >&2
    echo "[entrypoint] skipping vault fetch — service will use Railway native env vars" >&2
    DHD_SKIP=true
  fi

  if [ "${DHD_SKIP:-}" != "true" ]; then
    echo "[entrypoint] cloning vault from ${DHD_VAULT_REMOTE}..."
    rm -rf "$DHD_VAULT_DIR"

    CLONE_START=$(date +%s)
    if dhd clone "$DHD_VAULT_REMOTE" \
      --directory "$DHD_VAULT_DIR" \
      --identity "$IDENTITY_FILE" 2>&1; then
      CLONE_END=$(date +%s)
      echo "[entrypoint] vault cloned successfully in $((CLONE_END - CLONE_START))s"

      echo "[entrypoint] reading ${DHD_NAMESPACE}:${DHD_FILE} from vault..."
      cd "$DHD_VAULT_DIR"

      READ_START=$(date +%s)
      RAW_OUTPUT=$(dhd read "${DHD_NAMESPACE}:${DHD_FILE}" 2>/dev/null) || {
        READ_END=$(date +%s)
        echo "[entrypoint] WARNING: failed to read ${DHD_NAMESPACE}:${DHD_FILE} after $((READ_END - READ_START))s" >&2
        echo "[entrypoint] proceeding without vault env — using Railway native variables" >&2
        RAW_OUTPUT=""
      }

      if [ -n "$RAW_OUTPUT" ]; then
        READ_END=$(date +%s)
        echo "[entrypoint] raw file read in $((READ_END - READ_START))s ($(printf '%s' "$RAW_OUTPUT" | wc -l) lines)"

        # Filter dhd info lines; keep only env-var lines, comments, and blanks
        ENV_CONTENT=$(printf '%s\n' "$RAW_OUTPUT" | sed -n '/^[A-Za-z_][A-Za-z0-9_]*=/p;/^#/p;/^$/p')
        ENV_COUNT=$(printf '%s\n' "$ENV_CONTENT" | grep -c '^[A-Za-z_][A-Za-z0-9_]*=' || true)

        if [ -n "$ENV_CONTENT" ]; then
          ENV_FILE=$(mktemp)
          printf '%s\n' "$ENV_CONTENT" > "$ENV_FILE"
          echo "[entrypoint] parsed ${ENV_COUNT} environment variables — sourcing into shell..."
          set -a
          . "$ENV_FILE"
          set +a
          echo "[entrypoint] env file sourced successfully"
          rm -f "$ENV_FILE"
        else
          echo "[entrypoint] WARNING: no valid env-var lines found in vault file" >&2
          echo "[entrypoint] proceeding with Railway native variables only" >&2
        fi
      fi

      rm -rf "$DHD_VAULT_DIR"
      echo "[entrypoint] cleaned up vault clone directory"
    else
      CLONE_END=$(date +%s)
      echo "[entrypoint] WARNING: vault clone failed after $((CLONE_END - CLONE_START))s" >&2
      echo "[entrypoint] proceeding without vault env — using Railway native variables" >&2
    fi
  fi
else
  echo "[entrypoint] vault fetch skipped — using Railway native environment variables"
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

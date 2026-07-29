#!/bin/sh
# Nube Auth – entrypoint for Dockerfile.app (all-in-one staging container)
#
# 1. Optionally fetches bootstrap.sh from DaemonHound vault
# 2. Sources it (sets all env vars for this shell)
# 3. Validates required env vars
# 4. Sets localhost defaults for internal service URLs
# 5. Detects system DNS resolver for nginx
# 6. Renders the nginx config template
# 7. Execs supervisord (which starts nginx + core + gateway + workers)
set -e

echo "[entrypoint] ============================================"
echo "[entrypoint] Nube Auth All-in-One Entrypoint Starting"
echo "[entrypoint] ============================================"

# ── Helper: mask credentials in git URLs ────────────────────────────────────
mask_url() {
  echo "$1" | sed -E 's|(https?://)[^@]+@|\1***@|'
}

# ── Helper: build authenticated git URL ─────────────────────────────────────
# If DHD_GITHUB_TOKEN is set, inject it into an HTTPS URL.
auth_url() {
  _url="$1"
  _token="${DHD_GITHUB_TOKEN:-}"
  if [ -n "$_token" ] && echo "$_url" | grep -qE '^https://'; then
    echo "$_url" | sed -E "s|(https://)|\1${_token}@|"
  else
    echo "$_url"
  fi
}

# ── Check dhd binary ─────────────────────────────────────────────────────────
if command -v dhd >/dev/null 2>&1; then
  DHD_VERSION=$(dhd --version 2>/dev/null || echo "unknown")
  echo "[entrypoint] dhd binary version: ${DHD_VERSION}"
else
  echo "[entrypoint] dhd binary not found in PATH — vault fetch unavailable"
fi

# ── DaemonHound vault fetch (optional) ───────────────────────────────────────
# If DHD_VAULT_REMOTE is set, fetch bootstrap.sh from the vault and source it.
# All supervisord-managed processes will inherit this environment.
# If not set, we skip gracefully — existing Railway services without dhd vars
# will continue to work with their native env configuration.
echo "[entrypoint] config: DHD_SKIP=${DHD_SKIP:-<not set>}"
echo "[entrypoint] config: DHD_VAULT_REMOTE=$(mask_url "${DHD_VAULT_REMOTE:-<not set>}")"
echo "[entrypoint] config: DHD_GITHUB_TOKEN=${DHD_GITHUB_TOKEN:+<set, length ${#DHD_GITHUB_TOKEN}>}"
echo "[entrypoint] config: DHD_NAMESPACE=${DHD_NAMESPACE:-<not set, will use default>}"
echo "[entrypoint] config: DHD_FILE=${DHD_FILE:-<not set, will use default>}"
echo "[entrypoint] config: DHD_IDENTITY_FILE=${DHD_IDENTITY_FILE:-<not set>}"
echo "[entrypoint] config: DHD_AGE_KEY=${DHD_AGE_KEY:+<set, length ${#DHD_AGE_KEY}>}"

if [ -n "${DHD_VAULT_REMOTE:-}" ] && [ "${DHD_SKIP:-}" != "true" ]; then
  DHD_NAMESPACE="${DHD_NAMESPACE:-github.com/nube-auth/nube-auth}"
  DHD_FILE="${DHD_FILE:-bootstrap.sh}"
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
    # Trim trailing newlines — Railway sometimes appends one to env vars
    printf '%s' "$DHD_AGE_KEY" > "$IDENTITY_FILE"
    trap 'rm -f "$IDENTITY_FILE"' EXIT
    echo "[entrypoint] identity source: DHD_AGE_KEY (written to temp file)"
    echo "[entrypoint] identity temp file: ${IDENTITY_FILE}"
  else
    echo "[entrypoint] WARNING: DHD_VAULT_REMOTE is set but neither DHD_AGE_KEY nor DHD_IDENTITY_FILE provided" >&2
    echo "[entrypoint] skipping vault fetch — service will use Railway native env vars" >&2
    DHD_SKIP=true
  fi

  if [ "${DHD_SKIP:-}" != "true" ]; then
    echo "[entrypoint] cloning vault from $(mask_url "$DHD_VAULT_REMOTE")..."
    rm -rf "$DHD_VAULT_DIR"

    VAULT_URL=$(auth_url "$DHD_VAULT_REMOTE")

    CLONE_START=$(date +%s)
    if dhd clone "$VAULT_URL" \
      --directory "$DHD_VAULT_DIR" \
      --identity "$IDENTITY_FILE" 2>&1; then
      CLONE_END=$(date +%s)
      echo "[entrypoint] vault cloned successfully in $((CLONE_END - CLONE_START))s"

      echo "[entrypoint] reading ${DHD_NAMESPACE}:${DHD_FILE} from vault..."
      cd "$DHD_VAULT_DIR"

      READ_START=$(date +%s)
      BOOTSTRAP=$(dhd read "${DHD_NAMESPACE}:${DHD_FILE}" 2>/dev/null) || {
        READ_END=$(date +%s)
        echo "[entrypoint] WARNING: failed to read ${DHD_NAMESPACE}:${DHD_FILE} after $((READ_END - READ_START))s" >&2
        echo "[entrypoint] proceeding without vault env — using Railway native variables" >&2
        BOOTSTRAP=""
      }

      if [ -n "$BOOTSTRAP" ]; then
        READ_END=$(date +%s)
        echo "[entrypoint] bootstrap script read in $((READ_END - READ_START))s ($(printf '%s' "$BOOTSTRAP" | wc -l) lines)"

        BOOTSTRAP_FILE=$(mktemp)
        printf '%s\n' "$BOOTSTRAP" > "$BOOTSTRAP_FILE"

        # Parse and export env vars (handles both .env and export formats)
        echo "[entrypoint] parsing env vars from bootstrap file..."
        ENV_COUNT=0
        while IFS= read -r line; do
          case "$line" in
            ''|\#*) continue ;;                 # skip blank/comment lines
            export\ *) line="${line#export }" ;; # strip leading "export "
          esac

          case "$line" in
            [A-Za-z_][A-Za-z0-9_]*=*) ;;         # valid KEY=…
            *) continue ;;                       # skip malformed lines
          esac

          key="${line%%=*}"
          value="${line#*=}"

          # strip surrounding quotes (both " and ')
          value="${value%\"}"; value="${value#\"}"
          value="${value%\'}"; value="${value#\'}"

          export "$key=$value"
          ENV_COUNT=$((ENV_COUNT + 1))
        done < "$BOOTSTRAP_FILE"
        echo "[entrypoint] exported ${ENV_COUNT} environment variables successfully"
        rm -f "$BOOTSTRAP_FILE"
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

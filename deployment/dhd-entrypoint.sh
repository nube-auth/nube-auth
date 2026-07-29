#!/bin/sh
set -e

# ── DaemonHound Secret Retrieval Entrypoint ──────────────────────────────────
# Fetches .env.prod from the dhd vault, sources it, then execs the service.
#
# Required (one of):
#   DHD_AGE_KEY       - Age secret key for decrypting vault contents
#   DHD_IDENTITY_FILE - Path to an existing age identity file
#
# Required:
#   DHD_VAULT_REMOTE  - Git remote URL of the vault repository
#
# Optional:
#   DHD_NAMESPACE     - Namespace to read from (default: github.com/nube-auth/nube-auth)
#   DHD_FILE          - File to read (default: .env.prod)
#   DHD_VAULT_DIR     - Temp directory for vault clone (default: /tmp/dhd-vault)
#   DHD_SKIP          - Set to "true" to skip vault fetch (for local dev)
# ─────────────────────────────────────────────────────────────────────────────

echo "[dhd] ============================================"
echo "[dhd] DaemonHound Vault Entrypoint Starting"
echo "[dhd] ============================================"

# ── Check dhd binary ─────────────────────────────────────────────────────────
if command -v dhd >/dev/null 2>&1; then
  DHD_VERSION=$(dhd --version 2>/dev/null || echo "unknown")
  echo "[dhd] binary version: ${DHD_VERSION}"
else
  echo "[dhd] WARNING: dhd binary not found in PATH" >&2
fi

# ── Log configuration state ──────────────────────────────────────────────────
echo "[dhd] config: DHD_SKIP=${DHD_SKIP:-<not set>}"
echo "[dhd] config: DHD_VAULT_REMOTE=${DHD_VAULT_REMOTE:-<not set>}"
echo "[dhd] config: DHD_NAMESPACE=${DHD_NAMESPACE:-<not set, will use default>}"
echo "[dhd] config: DHD_FILE=${DHD_FILE:-<not set, will use default>}"
echo "[dhd] config: DHD_IDENTITY_FILE=${DHD_IDENTITY_FILE:-<not set>}"
echo "[dhd] config: DHD_AGE_KEY=${DHD_AGE_KEY:+<set, length ${#DHD_AGE_KEY}>}"

# ── Early exit paths ───────────────────────────────────────────────────────────
if [ "${DHD_SKIP:-}" = "true" ]; then
  echo "[dhd] skipping vault fetch (DHD_SKIP=true)"
  echo "[dhd] proceeding to service startup"
  exec "$@"
fi

if [ -z "${DHD_VAULT_REMOTE:-}" ]; then
  echo "[dhd] DHD_VAULT_REMOTE not set — skipping vault fetch"
  echo "[dhd] service will use Railway native environment variables"
  exec "$@"
fi

DHD_NAMESPACE="${DHD_NAMESPACE:-github.com/nube-auth/nube-auth}"
DHD_FILE="${DHD_FILE:-.env.prod}"
DHD_VAULT_DIR="${DHD_VAULT_DIR:-/tmp/dhd-vault}"

echo "[dhd] resolved: DHD_NAMESPACE=${DHD_NAMESPACE}"
echo "[dhd] resolved: DHD_FILE=${DHD_FILE}"
echo "[dhd] resolved: DHD_VAULT_DIR=${DHD_VAULT_DIR}"

# ── Resolve age identity ─────────────────────────────────────────────────────
echo "[dhd] resolving age identity..."
if [ -n "${DHD_IDENTITY_FILE:-}" ]; then
  IDENTITY_FILE="$DHD_IDENTITY_FILE"
  echo "[dhd] identity source: DHD_IDENTITY_FILE=${IDENTITY_FILE}"
elif [ -n "${DHD_AGE_KEY:-}" ]; then
  IDENTITY_FILE=$(mktemp)
  trap 'rm -f "$IDENTITY_FILE"' EXIT
  printf '%s\n' "$DHD_AGE_KEY" > "$IDENTITY_FILE"
  echo "[dhd] identity source: DHD_AGE_KEY (written to temp file)"
  echo "[dhd] identity temp file: ${IDENTITY_FILE}"
else
  echo "[dhd] ERROR: DHD_VAULT_REMOTE is set but neither DHD_AGE_KEY nor DHD_IDENTITY_FILE is provided" >&2
  echo "[dhd] provide one of these to decrypt the vault, or set DHD_SKIP=true to disable vault fetch" >&2
  exit 1
fi

# ── Clone vault ──────────────────────────────────────────────────────────────
echo "[dhd] cloning vault from ${DHD_VAULT_REMOTE}..."
echo "[dhd] clone destination: ${DHD_VAULT_DIR}"
rm -rf "$DHD_VAULT_DIR"

CLONE_START=$(date +%s)
if ! dhd clone "$DHD_VAULT_REMOTE" \
  --directory "$DHD_VAULT_DIR" \
  --identity "$IDENTITY_FILE" 2>&1; then
  CLONE_END=$(date +%s)
  echo "[dhd] ERROR: vault clone failed after $((CLONE_END - CLONE_START))s" >&2
  echo "[dhd] check: remote URL is accessible, identity is valid, and vault is initialized" >&2
  exit 1
fi
CLONE_END=$(date +%s)
echo "[dhd] vault cloned successfully in $((CLONE_END - CLONE_START))s"

# ── Read env file from vault ─────────────────────────────────────────────────
echo "[dhd] reading ${DHD_NAMESPACE}:${DHD_FILE} from vault..."
cd "$DHD_VAULT_DIR"

READ_START=$(date +%s)
RAW_OUTPUT=$(dhd read "${DHD_NAMESPACE}:${DHD_FILE}" 2>/dev/null) || {
  READ_END=$(date +%s)
  echo "[dhd] ERROR: failed to read ${DHD_NAMESPACE}:${DHD_FILE} after $((READ_END - READ_START))s" >&2
  echo "[dhd] check: namespace and file path exist in the vault" >&2
  exit 1
}
READ_END=$(date +%s)

if [ -z "$RAW_OUTPUT" ]; then
  echo "[dhd] ERROR: ${DHD_NAMESPACE}:${DHD_FILE} is empty or not found" >&2
  exit 1
fi

echo "[dhd] raw file read in $((READ_END - READ_START))s ($(printf '%s' "$RAW_OUTPUT" | wc -l) lines)"

# Filter: keep only lines that look like env vars or comments/blank lines
ENV_CONTENT=$(printf '%s\n' "$RAW_OUTPUT" | sed -n '/^[A-Za-z_][A-Za-z0-9_]*=/p;/^#/p;/^$/p')
ENV_COUNT=$(printf '%s\n' "$ENV_CONTENT" | grep -c '^[A-Za-z_][A-Za-z0-9_]*=' || true)

if [ -z "$ENV_CONTENT" ]; then
  echo "[dhd] ERROR: no valid env-var lines found in ${DHD_NAMESPACE}:${DHD_FILE}" >&2
  echo "[dhd] the file may be empty or contain no KEY=VALUE pairs" >&2
  exit 1
fi

echo "[dhd] parsed ${ENV_COUNT} environment variables from vault file"

# ── Source env file ──────────────────────────────────────────────────────────
ENV_FILE=$(mktemp)
trap 'rm -f "$ENV_FILE" "$IDENTITY_FILE"' EXIT
printf '%s\n' "$ENV_CONTENT" > "$ENV_FILE"

echo "[dhd] sourcing env file into current shell (${DHD_FILE})..."
set -a
. "$ENV_FILE"
set +a
echo "[dhd] env file sourced successfully"

# ── Clean up ─────────────────────────────────────────────────────────────────
rm -rf "$DHD_VAULT_DIR"
echo "[dhd] cleaned up vault clone directory"

# ── Validate critical env vars ───────────────────────────────────────────────
# These must be present regardless of source (Railway native or dhd vault).
# Fail fast with a clear message instead of letting the service crash later.
echo "[dhd] validating required environment variables..."

validate_env() {
  _missing=""
  for _var in "$@"; do
    eval "_val=\${$_var:-}"
    if [ -z "$_val" ]; then
      _missing="${_missing}  - ${_var}\n"
    fi
  done
  if [ -n "$_missing" ]; then
    echo "[dhd] ERROR: the following required environment variables are missing:" >&2
    printf '%b' "$_missing" >&2
    echo "[dhd] Set them via Railway Variables or ensure they are present in the dhd vault file." >&2
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

echo "[dhd] all required environment variables present"
echo "[dhd] vault fetch complete — proceeding to service startup"

# ── Start service ────────────────────────────────────────────────────────────
echo "[dhd] exec'ing service: $@"
exec "$@"

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

if [ "${DHD_SKIP:-}" = "true" ]; then
  echo "[dhd] skipping vault fetch (DHD_SKIP=true)"
  exec "$@"
fi

if [ -z "${DHD_VAULT_REMOTE:-}" ]; then
  echo "[dhd] DHD_VAULT_REMOTE not set — skipping vault fetch, starting service directly"
  exec "$@"
fi

DHD_NAMESPACE="${DHD_NAMESPACE:-github.com/nube-auth/nube-auth}"
DHD_FILE="${DHD_FILE:-.env.prod}"
DHD_VAULT_DIR="${DHD_VAULT_DIR:-/tmp/dhd-vault}"

# ── Resolve age identity ─────────────────────────────────────────────────────
if [ -n "${DHD_IDENTITY_FILE:-}" ]; then
  IDENTITY_FILE="$DHD_IDENTITY_FILE"
  echo "[dhd] using identity file: ${IDENTITY_FILE}"
elif [ -n "${DHD_AGE_KEY:-}" ]; then
  IDENTITY_FILE=$(mktemp)
  trap 'rm -f "$IDENTITY_FILE"' EXIT
  printf '%s\n' "$DHD_AGE_KEY" > "$IDENTITY_FILE"
  echo "[dhd] using age key from DHD_AGE_KEY"
else
  echo "[dhd] ERROR: either DHD_AGE_KEY or DHD_IDENTITY_FILE must be set" >&2
  exit 1
fi

# ── Clone vault ──────────────────────────────────────────────────────────────
echo "[dhd] cloning vault from ${DHD_VAULT_REMOTE}..."
rm -rf "$DHD_VAULT_DIR"

if ! dhd clone "$DHD_VAULT_REMOTE" \
  --directory "$DHD_VAULT_DIR" \
  --identity "$IDENTITY_FILE" 2>&1; then
  echo "[dhd] ERROR: failed to clone vault" >&2
  exit 1
fi

# ── Read env file from vault ─────────────────────────────────────────────────
echo "[dhd] reading ${DHD_NAMESPACE}:${DHD_FILE}..."
cd "$DHD_VAULT_DIR"

# dhd read prints info lines ("Pulling...") to stdout alongside the file content.
# We capture stdout then filter to only valid env-var lines (KEY=VALUE or comments).
RAW_OUTPUT=$(dhd read "${DHD_NAMESPACE}:${DHD_FILE}" 2>/dev/null) || {
  echo "[dhd] ERROR: failed to read ${DHD_NAMESPACE}:${DHD_FILE}" >&2
  exit 1
}

if [ -z "$RAW_OUTPUT" ]; then
  echo "[dhd] ERROR: ${DHD_NAMESPACE}:${DHD_FILE} is empty or not found" >&2
  exit 1
fi

# Filter: keep only lines that look like env vars or comments/blank lines
ENV_CONTENT=$(printf '%s\n' "$RAW_OUTPUT" | sed -n '/^[A-Za-z_][A-Za-z0-9_]*=/p;/^#/p;/^$/p')

if [ -z "$ENV_CONTENT" ]; then
  echo "[dhd] ERROR: no valid env-var lines found in ${DHD_NAMESPACE}:${DHD_FILE}" >&2
  exit 1
fi

# ── Source env file ──────────────────────────────────────────────────────────
ENV_FILE=$(mktemp)
trap 'rm -f "$ENV_FILE" "$IDENTITY_FILE"' EXIT
printf '%s\n' "$ENV_CONTENT" > "$ENV_FILE"

echo "[dhd] sourcing env file (${DHD_FILE})..."
set -a
. "$ENV_FILE"
set +a

# ── Clean up ─────────────────────────────────────────────────────────────────
rm -rf "$DHD_VAULT_DIR"

# ── Validate critical env vars ───────────────────────────────────────────────
# These must be present regardless of source (Railway native or dhd vault).
# Fail fast with a clear message instead of letting the service crash later.
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

# ── Start service ────────────────────────────────────────────────────────────
echo "[dhd] starting service..."
exec "$@"

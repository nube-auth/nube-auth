#!/usr/bin/env bash
# ── dhd-bootstrap-generator ────────────────────────────────────────────────
# Converts a .env file into a bootstrap.sh shell script for the dhd vault.
#
# Usage:
#   ./scripts/generate-dhd-bootstrap.sh .env.staging > bootstrap.sh
#   dhd track bootstrap.sh
#   dhd sync
#
# The output script is safe to source — every value is properly quoted.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

ENV_FILE="${1:-}"
if [ -z "$ENV_FILE" ] || [ ! -f "$ENV_FILE" ]; then
  echo "Usage: $0 <env-file>" >&2
  echo "Example: $0 .env.staging" >&2
  exit 1
fi

echo '#!/bin/sh'
echo '# Auto-generated from '"$ENV_FILE"' — do not edit manually'
echo '# Sourced by dhd-entrypoint.sh at container startup'
echo ''

while IFS= read -r line || [ -n "$line" ]; do
  # Skip blank lines and comments
  case "$line" in
    ''|\#*) echo "$line"; continue ;;
  esac

  # Extract key and value
  key="${line%%=*}"
  value="${line#*=}"

  # Remove optional surrounding quotes from the raw value
  value="${value%\"}"
  value="${value#\"}"

  # Output: export KEY="value" (always double-quoted, with proper escaping)
  # Escape any existing double quotes inside the value
  escaped_value=$(printf '%s' "$value" | sed 's/"/\\"/g')
  printf 'export %s="%s"\n' "$key" "$escaped_value"
done < "$ENV_FILE"

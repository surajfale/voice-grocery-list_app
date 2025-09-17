#!/usr/bin/env bash
# Encode a JSONBin master key to base64, optionally write to .env and test with JSONBin
set -euo pipefail

REPO_ROOT=$(dirname "$0")/.. # scripts/.. -> repo root
ENV_FILE="$REPO_ROOT/.env"

usage(){
  cat <<EOF
Usage: $0 [-w] [-t] [raw-key]

Options:
  -w        Write the base64 value into .env as VITE_JSONBIN_MASTER_KEY_B64 (backups created)
  -t        Run a quick curl test against JSONBin using the encoded key (requires curl)
  raw-key   Optional raw master key. If omitted you will be prompted (hidden input).

Examples:
  $0                 # prompts for key, prints base64
  $0 -w              # prompts for key, writes base64 to .env
  $0 'raw-key-here'  # prints base64 for the provided raw key
  $0 -w -t           # write to .env and test against JSONBin
EOF
}

WRITE_ENV=0
DO_TEST=0

while getopts ":wt" opt; do
  case $opt in
    w) WRITE_ENV=1 ;;
    t) DO_TEST=1 ;;
    *) usage; exit 1 ;;
  esac
done
shift $((OPTIND-1))

RAW_KEY="${1-}"
if [ -z "$RAW_KEY" ]; then
  # read hidden input
  printf "Enter JSONBin Master Key (input hidden): "
  stty -echo
  read -r RAW_KEY || true
  stty echo
  printf "\n"
fi

if [ -z "$RAW_KEY" ]; then
  echo "No key provided" >&2
  exit 2
fi

# compute base64
BASE64_KEY=$(printf '%s' "$RAW_KEY" | base64)
echo "Base64: $BASE64_KEY"

if [ "$WRITE_ENV" -eq 1 ]; then
  if [ ! -f "$ENV_FILE" ]; then
    echo ".env not found at $ENV_FILE" >&2
    exit 3
  fi

  # backup
  BACKUP="$ENV_FILE.$(date +%Y%m%d%H%M%S).bak"
  cp "$ENV_FILE" "$BACKUP"
  echo "Backed up .env to $BACKUP"

  # sanitize existing file and replace or append the variable
  # remove existing raw VITE_JSONBIN_MASTER_KEY line to avoid confusion
  sed -i "/^VITE_JSONBIN_MASTER_KEY\s*=\s*/d" "$ENV_FILE" || true

  if grep -q "^VITE_JSONBIN_MASTER_KEY_B64\s*=\s*" "$ENV_FILE"; then
    # replace
    sed -i "s/^VITE_JSONBIN_MASTER_KEY_B64\s*=.*/VITE_JSONBIN_MASTER_KEY_B64=$BASE64_KEY/" "$ENV_FILE"
  else
    # append
    printf "\nVITE_JSONBIN_MASTER_KEY_B64=%s\n" "$BASE64_KEY" >> "$ENV_FILE"
  fi

  echo "Updated .env with VITE_JSONBIN_MASTER_KEY_B64 (unquoted)."
fi

if [ "$DO_TEST" -eq 1 ]; then
  if ! command -v curl >/dev/null 2>&1; then
    echo "curl required for test" >&2; exit 4
  fi
  KEY="$RAW_KEY"
  echo "Running JSONBin test (masked): ${KEY:0:6}...${KEY: -4}"
  HTTP_CODE=$(curl -s -o /tmp/jsonbin_test_resp.txt -w '%{http_code}' -X POST https://api.jsonbin.io/v3/b -H "Content-Type: application/json" -H "X-Master-Key: $KEY" -d '{"test":"connection"}') || true
  echo "HTTP CODE: $HTTP_CODE"
  echo "RESPONSE:"; cat /tmp/jsonbin_test_resp.txt || true
fi

exit 0

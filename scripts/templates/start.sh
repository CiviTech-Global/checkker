#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# --- .env loading ----------------------------------------------------------
if [ -f .env ]; then
  echo "[env] Loading .env"
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

# --- CLI args --------------------------------------------------------------
ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port|-p)      ARGS+=("--port" "$2");  shift 2 ;;
    --web-dist|-w)  ARGS+=("--web-dist" "$2"); shift 2 ;;
    *)              echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# --- Validate bundle -------------------------------------------------------
BUNDLE="$SCRIPT_DIR/server.bundle.js"
if [ ! -f "$BUNDLE" ]; then
  echo "ERROR: server.bundle.js not found in $SCRIPT_DIR" >&2
  echo "Run scripts/deploy-server.ps1 first to build the deployment package." >&2
  exit 1
fi

# --- Start -----------------------------------------------------------------
echo "Starting Checkker server..." | tee >&2
echo "  Working directory: $SCRIPT_DIR" | tee >&2
echo "  Args: ${ARGS[*]}" | tee >&2
echo "" | tee >&2
echo "Server output:" | tee >&2

exec node "$BUNDLE" "${ARGS[@]}"

#!/usr/bin/env bash
# Wrapper for the Node.js deployment wizard on Linux, macOS, and WSL.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not installed. Get it from https://nodejs.org"
  exit 1
fi

node "${SCRIPT_DIR}/deploy-wizard.mjs" "$@"

#!/usr/bin/env bash
# Mindlr — Superconductor "Run" script.
#
# Boots the Electron app in dev mode: main + preload + renderers with HMR,
# plus the two windows (settings + notch).

set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v bun >/dev/null 2>&1; then
  if [ -x "$HOME/.bun/bin/bun" ]; then
    export PATH="$HOME/.bun/bin:$PATH"
  else
    echo "[dev] bun not found. Run scripts/setup.sh first."
    exit 1
  fi
fi

# electron-vite dev — watches src/{main,preload,renderer} and spawns Electron.
exec bun --filter @mindlr/desktop dev

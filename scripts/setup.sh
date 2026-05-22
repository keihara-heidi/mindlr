#!/usr/bin/env bash
# Mindlr — Superconductor "Setup" script.
#
# Runs once per worktree (and any time deps / native modules change).
# Idempotent: safe to re-run.

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
echo "[setup] root: $ROOT"

# Put bun on PATH if it's installed in the standard location but not on PATH yet.
if ! command -v bun >/dev/null 2>&1; then
  if [ -x "$HOME/.bun/bin/bun" ]; then
    export PATH="$HOME/.bun/bin:$PATH"
  else
    echo "[setup] bun not found. Install via: curl -fsSL https://bun.sh/install | bash"
    exit 1
  fi
fi

echo "[setup] bun $(bun --version)"

# 1. Install workspace deps.
echo "[setup] bun install"
bun install

# 2. Rebuild native modules against Electron's Node ABI.
#    better-sqlite3 (and later naudiodon2 / uiohook-napi) must match the Electron
#    runtime, not the host Node. electron-builder ships install-app-deps for this.
#    NOTE: electron-builder's legacy source-map deps don't run under Bun's
#    runtime, so we invoke the binary directly under Node.
echo "[setup] electron-builder install-app-deps (native rebuild for Electron ABI)"
(cd apps/desktop && node ./node_modules/.bin/electron-builder install-app-deps)

# 2b. Manually rebuild segfault-handler.
#     It's a transitive native dep of naudiodon2 but ships without
#     `gypfile: true` in its package.json, so @electron/rebuild's auto-detect
#     skips it. Without this its prebuilt .node mismatches Electron's
#     NODE_MODULE_VERSION and the main process crashes on startup.
SEG_DIR=$(node -e "console.log(require('path').dirname(require.resolve('segfault-handler/package.json', { paths: ['$ROOT/apps/desktop'] })))" 2>/dev/null || true)
if [ -n "$SEG_DIR" ] && [ -f "$SEG_DIR/binding.gyp" ]; then
  echo "[setup] node-gyp rebuild segfault-handler @ $SEG_DIR"
  (cd "$SEG_DIR" && npx --yes node-gyp rebuild --target=33.4.11 --arch=arm64 --dist-url=https://electronjs.org/headers >/dev/null 2>&1) || \
    echo "[setup] segfault-handler rebuild failed (non-fatal — only matters if naudiodon2 loads it)"
fi

# 3. Generate the TanStack Router route tree (so tsc + IDE both see it).
echo "[setup] generate TanStack Router route tree"
(cd apps/desktop && node ./node_modules/.bin/tsr generate)

# 4. Install lefthook pre-commit hooks if a .git directory is present.
if [ -d .git ]; then
  echo "[setup] lefthook install"
  bunx --bun lefthook install || echo "[setup] lefthook install failed (non-fatal)"
fi

echo "[setup] done."

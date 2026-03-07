#!/bin/bash
# SessionStart hook: install npm dependencies at the start of a remote session
#
# This hook runs when a Claude Code session starts (e.g., via `claude --remote`).
# In remote VMs the workspace is freshly checked out and node_modules may be absent.
# Running `npm install` here ensures:
#   - All JS/TS dependencies are available
#   - Native Node.js addons (e.g., gnubg-hints / node-gyp addons) are compiled
#     against the VM's Node.js version
#
# Exit 0 = proceed, Exit non-zero = abort session

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GIT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Find the closest package.json (repo root, then first subdirectory)
PKG_JSON="$GIT_ROOT/package.json"
INSTALL_DIR="$GIT_ROOT"

if [ ! -f "$PKG_JSON" ]; then
  # Monorepo: find first package.json in a direct subdirectory
  FOUND=$(find "$GIT_ROOT" -maxdepth 2 -name "package.json" \
    -not -path "*/node_modules/*" | head -1)
  if [ -z "$FOUND" ]; then
    echo "session-start-install-deps: no package.json found — skipping npm install" >&2
    exit 0
  fi
  INSTALL_DIR="$(dirname "$FOUND")"
fi

echo "session-start-install-deps: running npm install in $INSTALL_DIR" >&2
cd "$INSTALL_DIR" && npm install --prefer-offline 2>&1

if [ $? -ne 0 ]; then
  echo "session-start-install-deps: npm install failed" >&2
  exit 1
fi

echo "session-start-install-deps: dependencies ready" >&2

# Diagnostic: check gh CLI and GH_TOKEN availability for remote sessions
if command -v gh >/dev/null 2>&1; then
  if [ -n "$GH_TOKEN" ]; then
    echo "session-start-install-deps: gh CLI available, GH_TOKEN set" >&2
    gh auth status 2>&1 || true
  else
    echo "session-start-install-deps: gh CLI available but GH_TOKEN is not set — gh operations may fail in remote sessions" >&2
  fi
else
  if [ -n "$GH_TOKEN" ]; then
    echo "session-start-install-deps: gh CLI not installed but GH_TOKEN is set — agent can use curl fallback" >&2
  else
    echo "session-start-install-deps: gh CLI not installed and GH_TOKEN not set — issue reading and PR creation will fail" >&2
  fi
fi

exit 0

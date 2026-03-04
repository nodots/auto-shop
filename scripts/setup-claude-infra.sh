#!/bin/bash
set -euo pipefail

# setup-claude-infra.sh — Install Claude Code hooks and cell-worker agent in a target repo
#
# Usage:
#   ./scripts/setup-claude-infra.sh <repo-path> <project-name>
#   auto-shop infra setup <project-name>   (resolves path from projects.json)
#
# Example:
#   ./scripts/setup-claude-infra.sh /Users/kenr/Code/nodots-backgammon/packages/gnubg-hints gnubg-hints
#   ./scripts/setup-claude-infra.sh /Users/kenr/Code/a2z-freight-claims a2z-freight-claims
#   auto-shop infra setup a2z-freight-claims
#
# What it does:
#   1. Creates .claude/hooks/ and .claude/agents/ directories
#   2. Copies the three hook scripts (scope enforcement, handoff checks)
#   3. Installs minimatch if not already available
#   4. Generates .claude/settings.json with correct NODE_PATH
#   5. Copies the generic cell-worker agent template for customization
#   6. Verifies the setup works

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AUTO_SHOP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  echo "Usage: $0 <repo-path> <project-name>"
  echo ""
  echo "  repo-path     Absolute path to the target git repository root"
  echo "  project-name  Short project name (used in agent file naming)"
  echo ""
  echo "Example:"
  echo "  $0 /Users/kenr/Code/my-project my-project"
  exit 1
}

REPO_PATH="${1:-}"
PROJECT_NAME="${2:-}"

if [ -z "$REPO_PATH" ] || [ -z "$PROJECT_NAME" ]; then
  usage
fi

# Validate repo path
if [ ! -d "$REPO_PATH" ]; then
  echo "Error: $REPO_PATH does not exist" >&2
  exit 1
fi

if [ ! -d "$REPO_PATH/.git" ]; then
  echo "Error: $REPO_PATH is not a git repository" >&2
  exit 1
fi

# Check if .claude/ already exists
if [ -f "$REPO_PATH/.claude/settings.json" ]; then
  echo "Warning: .claude/settings.json already exists in $REPO_PATH"
  read -p "Overwrite? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

echo "Setting up Claude Code infrastructure in: $REPO_PATH"
echo "Project name: $PROJECT_NAME"
echo ""

# --- Step 1: Create directory structure ---
echo "Creating .claude/ directory structure..."
mkdir -p "$REPO_PATH/.claude/hooks"
mkdir -p "$REPO_PATH/.claude/agents"

# --- Step 2: Copy hook scripts ---
echo "Copying hook scripts..."

cp "$AUTO_SHOP_ROOT/scripts/hooks/enforce-scope-pretooluse.js" \
   "$REPO_PATH/.claude/hooks/enforce-scope-pretooluse.js"

cp "$AUTO_SHOP_ROOT/scripts/hooks/check-handoff-on-complete.sh" \
   "$REPO_PATH/.claude/hooks/check-handoff-on-complete.sh"

cp "$AUTO_SHOP_ROOT/scripts/hooks/check-handoff-on-stop.sh" \
   "$REPO_PATH/.claude/hooks/check-handoff-on-stop.sh"

chmod +x "$REPO_PATH/.claude/hooks/check-handoff-on-complete.sh"
chmod +x "$REPO_PATH/.claude/hooks/check-handoff-on-stop.sh"

# --- Step 3: Find or install minimatch ---
echo "Checking for minimatch..."

# Search for node_modules with minimatch, starting from repo root
NODE_PATH_VALUE=""
MINIMATCH_FOUND=false

# Check common locations
for candidate in \
  "$REPO_PATH/node_modules" \
  "$REPO_PATH"/*/node_modules \
; do
  if [ -d "$candidate/minimatch" ]; then
    # Convert to relative path from repo root
    NODE_PATH_VALUE="$(python3 -c "import os; print(os.path.relpath('$candidate', '$REPO_PATH'))")"
    MINIMATCH_FOUND=true
    echo "  Found minimatch at: $NODE_PATH_VALUE"
    break
  fi
done

if [ "$MINIMATCH_FOUND" = false ]; then
  echo "  minimatch not found. Installing at repo root..."
  (cd "$REPO_PATH" && npm install --save-dev minimatch 2>/dev/null) || {
    echo "  npm install failed. Trying to find package.json in subdirectories..."
    # Find the first package.json and install there
    PKG_DIR=$(find "$REPO_PATH" -maxdepth 2 -name "package.json" -not -path "*/node_modules/*" -exec dirname {} \; | head -1)
    if [ -n "$PKG_DIR" ]; then
      echo "  Installing minimatch in: $PKG_DIR"
      (cd "$PKG_DIR" && npm install --save-dev minimatch)
      NODE_PATH_VALUE="$(python3 -c "import os; print(os.path.relpath('$PKG_DIR/node_modules', '$REPO_PATH'))")"
    else
      echo "Error: Cannot find a package.json to install minimatch" >&2
      exit 1
    fi
  }
  if [ -z "$NODE_PATH_VALUE" ]; then
    NODE_PATH_VALUE="node_modules"
  fi
fi

# --- Step 4: Generate settings.json ---
echo "Generating .claude/settings.json..."

# Build the PreToolUse command with NODE_PATH if needed
if [ "$NODE_PATH_VALUE" = "node_modules" ]; then
  PRETOOL_CMD="node .claude/hooks/enforce-scope-pretooluse.js"
else
  PRETOOL_CMD="NODE_PATH=$NODE_PATH_VALUE node .claude/hooks/enforce-scope-pretooluse.js"
fi

cat > "$REPO_PATH/.claude/settings.json" << SETTINGS_EOF
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "$PRETOOL_CMD"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/check-handoff-on-stop.sh"
          }
        ]
      }
    ]
  }
}
SETTINGS_EOF

# --- Step 5: Copy cell-worker agent template ---
AGENT_FILE="$REPO_PATH/.claude/agents/cell-worker-${PROJECT_NAME}.md"
if [ ! -f "$AGENT_FILE" ]; then
  echo "Copying cell-worker agent template..."
  cp "$AUTO_SHOP_ROOT/templates/agents/cell-worker.md" "$AGENT_FILE"
  echo "  Created: .claude/agents/cell-worker-${PROJECT_NAME}.md"
  echo "  ** Customize this file with project-specific context (build commands, directory layout) **"
else
  echo "Agent file already exists: .claude/agents/cell-worker-${PROJECT_NAME}.md (skipping)"
fi

# --- Step 6: Verify ---
echo ""
echo "Verifying setup..."

# Test that the hook script can load minimatch
VERIFY_CMD="echo '{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$REPO_PATH/test-file.txt\"}}'"
VERIFY_CMD="$VERIFY_CMD | NODE_PATH=$NODE_PATH_VALUE node $REPO_PATH/.claude/hooks/enforce-scope-pretooluse.js"

if eval "$VERIFY_CMD" 2>/dev/null; then
  echo "  PreToolUse hook: OK (no SCOPE.json = allows everything)"
else
  echo "  PreToolUse hook: FAILED" >&2
  echo "  Check that minimatch is installed at: $NODE_PATH_VALUE/minimatch" >&2
  exit 1
fi

# Test shell hooks
if bash "$REPO_PATH/.claude/hooks/check-handoff-on-stop.sh" 2>/dev/null; then
  echo "  Stop hook: OK"
else
  # On a feat/ branch without HANDOFF.md this is expected to fail
  BRANCH=$(git -C "$REPO_PATH" rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [[ "$BRANCH" =~ ^feat/ ]]; then
    echo "  Stop hook: OK (correctly blocks on feat/ branch without HANDOFF.md)"
  else
    echo "  Stop hook: FAILED" >&2
    exit 1
  fi
fi

echo ""
echo "--- Setup complete ---"
echo ""
echo "Files created:"
echo "  .claude/settings.json"
echo "  .claude/hooks/enforce-scope-pretooluse.js"
echo "  .claude/hooks/check-handoff-on-complete.sh"
echo "  .claude/hooks/check-handoff-on-stop.sh"
echo "  .claude/agents/cell-worker-${PROJECT_NAME}.md"
echo ""
echo "Next steps:"
echo "  1. Edit .claude/agents/cell-worker-${PROJECT_NAME}.md with project-specific context"
echo "  2. Commit .claude/ to main: git add .claude/ && git commit -m 'Add Claude Code cell infrastructure'"
echo "  3. Push to origin"

#!/bin/bash
# notify-slack-posttooluse.sh — PostToolUse hook for Claude Code
#
# Sends async Slack notifications when cell workers create BLOCKER.md or HANDOFF.md.
# This hook runs after Write/Edit operations and checks if the target file
# is a coordination file that the coordinator should know about.
#
# Required environment variable:
#   SLACK_WEBHOOK_ALERTS — Incoming webhook URL for #auto-shop-alerts
#
# Claude Code hook config (in .claude/settings.json):
#   "PostToolUse": [{
#     "matcher": "Edit|Write",
#     "hooks": [{
#       "type": "command",
#       "command": "bash .claude/hooks/notify-slack-posttooluse.sh"
#     }]
#   }]

set -euo pipefail

# Read hook input from stdin
INPUT=$(cat)

# Extract the file path from the hook event JSON
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Get just the filename
FILENAME=$(basename "$FILE_PATH")

# Only notify for coordination files
case "$FILENAME" in
  BLOCKER.md|HANDOFF.md) ;;
  *) exit 0 ;;
esac

# Skip if no webhook configured
if [ -z "${SLACK_WEBHOOK_ALERTS:-}" ]; then
  exit 0
fi

# Determine the current branch and project context
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
if [ -z "$GIT_ROOT" ]; then
  exit 0
fi

BRANCH=$(git -C "$GIT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# Read project name from SCOPE.json if available
PROJECT="unknown"
FEATURE="unknown"
if [ -f "$GIT_ROOT/SCOPE.json" ]; then
  PROJECT=$(python3 -c "import json; d=json.load(open('$GIT_ROOT/SCOPE.json')); print(d.get('project','unknown'))" 2>/dev/null || echo "unknown")
  FEATURE=$(python3 -c "import json; d=json.load(open('$GIT_ROOT/SCOPE.json')); print(d.get('feature','unknown'))" 2>/dev/null || echo "unknown")
fi

# Build the notification
if [ "$FILENAME" = "BLOCKER.md" ]; then
  EMOJI=":rotating_light:"
  STATUS="BLOCKED"
  COLOR="#FF0000"
  # Try to extract the blocker reason (first line after "## Why I'm Blocked")
  REASON=""
  if [ -f "$FILE_PATH" ]; then
    REASON=$(sed -n '/^## Why I.*Blocked/,/^##/{/^## Why/d;/^##/d;/^$/d;p;}' "$FILE_PATH" | head -3 | tr '\n' ' ')
  fi
elif [ "$FILENAME" = "HANDOFF.md" ]; then
  EMOJI=":white_check_mark:"
  STATUS="HANDOFF"
  COLOR="#36A64F"
  REASON=""
  if [ -f "$FILE_PATH" ]; then
    REASON=$(sed -n '/^Status: /s/^Status: //p' "$FILE_PATH" | head -1)
  fi
fi

# Build Slack payload
DETAIL=""
if [ -n "$REASON" ]; then
  DETAIL="\n> ${REASON}"
fi

PAYLOAD=$(cat << PAYLOAD_EOF
{
  "text": "${EMOJI} ${STATUS}: ${FEATURE} (${PROJECT})",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "${EMOJI} *Cell ${STATUS}*\nFeature: *${FEATURE}*\nProject: \`${PROJECT}\`\nBranch: \`${BRANCH}\`${DETAIL}"
      }
    }
  ]
}
PAYLOAD_EOF
)

# Send asynchronously (do not block the agent)
(curl -s -X POST -H 'Content-type: application/json' \
  --data "$PAYLOAD" \
  --max-time 5 \
  "$SLACK_WEBHOOK_ALERTS" > /dev/null 2>&1 &)

exit 0

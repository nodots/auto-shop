# Handoff: Integrate auto-shop with Slack for cell notifications and coordinator commands

Date: 2026-03-11
Status: complete
Branch: feat/integrate-auto-shop-with-slack-for-cell-notifications-and-coordinator-commands
Issue: https://github.com/nodots/auto-shop/issues/25

## What Was Done

- **Phase 1 — GitHub Actions to Slack:**
  - `slack-label-change.yml`: Notifies `#auto-shop-cells` on cell status label changes; alerts `#auto-shop-alerts` when a cell is blocked
  - `slack-pr-events.yml`: Notifies on PR open/close/merge/ready-for-review; alerts on `[READY]` PRs
  - `slack-stale-cells.yml`: Daily cron (9 AM UTC) flags cells active >3 days to `#auto-shop-alerts`
  - `feature-ci.yml`: Added `notify-slack` job that posts to `#auto-shop-alerts` on CI failure

- **Phase 2 — Claude Code Hooks to Slack:**
  - `notify-slack-posttooluse.sh`: Async PostToolUse hook that detects BLOCKER.md/HANDOFF.md writes and sends Slack alerts
  - `enforce-scope-pretooluse.js`: Added fire-and-forget Slack notification on scope violations
  - `setup-claude-infra.sh`: Updated to copy new hook and add PostToolUse config to generated settings.json

- **Phase 3 — Slack Bot:**
  - Cloudflare Worker-based bot at `scripts/slack-bot/`
  - `/autoshop status` — unified cell status overview
  - `/autoshop cells` — grouped cell list
  - `/autoshop blocked` — blocked cells only
  - `/autoshop approve <pr>` — approve with confirmation
  - `/autoshop merge <pr>` — squash-merge with double confirmation
  - HMAC-SHA256 request signature verification
  - GitHub REST API client (no gh CLI dependency)

- **Phase 4 — Rich Formatting:**
  - Block Kit used throughout all notifications and command responses
  - Action buttons on messages (View PR, Review PR, View Issue, View Run)
  - Confirmation dialogs for destructive operations

- **Documentation:**
  - `docs/slack-integration.md` covering full setup, channels, commands, and troubleshooting

## Key Decisions

- Used incoming webhooks (not Slack API posts) for GitHub Actions notifications — simpler, no bot token needed for workflows
- Slack bot uses native fetch + crypto.subtle instead of @slack/bolt framework — better fit for Cloudflare Workers which have limited Node.js compatibility
- All webhook hooks are fire-and-forget with short timeouts to never block agent work
- Destructive commands (approve, merge) require interactive confirmation buttons rather than direct execution

## Files Modified

| File | Change |
|------|--------|
| `.github/workflows/slack-label-change.yml` | New — cell status label notifications |
| `.github/workflows/slack-pr-events.yml` | New — PR event notifications |
| `.github/workflows/slack-stale-cells.yml` | New — daily stale cell cron |
| `.github/workflows/feature-ci.yml` | Modified — added notify-slack job on failure |
| `scripts/hooks/notify-slack-posttooluse.sh` | New — PostToolUse hook for BLOCKER/HANDOFF detection |
| `scripts/hooks/enforce-scope-pretooluse.js` | Modified — added Slack notification on scope violation |
| `scripts/setup-claude-infra.sh` | Modified — copies new hook, adds PostToolUse config |
| `scripts/slack-bot/` | New — Slack bot (index.ts, commands.ts, actions.ts, github.ts) |
| `docs/slack-integration.md` | New — setup and usage documentation |
| `SCOPE.json` | Modified — added allowedPaths for this feature |

## Test Status

- No test framework in this repository (coordination/documentation repo)
- All shell scripts have `set -euo pipefail` and graceful degradation when secrets are missing
- TypeScript in slack-bot compiles with strict mode

## Notes

- Slack app must be created manually (cannot be automated via code). See docs/slack-integration.md for step-by-step setup.
- `SLACK_WEBHOOK_CELLS` and `SLACK_WEBHOOK_ALERTS` GitHub secrets must be configured before workflows will send notifications. Workflows skip gracefully if secrets are absent.
- For `--remote` sessions, `hooks.slack.com` must be added to the network allowlist.
- The `/autoshop launch <name>` command mentioned in the issue (via workflow_dispatch) was not implemented — it would require a separate GitHub Actions workflow for cell provisioning which is out of scope for the Slack integration.

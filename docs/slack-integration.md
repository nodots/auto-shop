# Slack Integration

Auto-shop integrates with Slack to give the coordinator real-time visibility into cell status and the ability to manage cells from any device.

## Architecture

Three integration layers work together:

1. **GitHub Actions** — Forward repository events (label changes, PRs, CI failures) to Slack channels
2. **Claude Code Hooks** — Notify when cell workers create BLOCKER.md, HANDOFF.md, or trigger scope violations
3. **Slack Bot** — Handle `/autoshop` slash commands for status queries and PR management

## Channels

| Channel | Purpose | Notification Level |
|---------|---------|-------------------|
| `#auto-shop-cells` | All cell activity (label changes, PRs) | Informational |
| `#auto-shop-alerts` | Blockers, CI failures, stale cells, READY PRs | High-priority (push notifications recommended) |

## Setup

### 1. Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. Enable **Incoming Webhooks** and create webhooks for both channels
3. Enable **Slash Commands** and add `/autoshop` pointing to your Cloudflare Worker URL
4. Enable **Interactivity** and set the Request URL to `https://<worker>/slack/actions`
5. Under **OAuth & Permissions**, add scopes: `chat:write`, `commands`
6. Install the app to your workspace

### 2. Configure GitHub Secrets

Add these secrets to the `nodots/auto-shop` repository:

| Secret | Value |
|--------|-------|
| `SLACK_WEBHOOK_CELLS` | Incoming webhook URL for `#auto-shop-cells` |
| `SLACK_WEBHOOK_ALERTS` | Incoming webhook URL for `#auto-shop-alerts` |

```bash
gh secret set SLACK_WEBHOOK_CELLS --repo nodots/auto-shop
gh secret set SLACK_WEBHOOK_ALERTS --repo nodots/auto-shop
```

### 3. Configure Environment for Claude Code Hooks

Cell workers need `SLACK_WEBHOOK_ALERTS` in their environment for the PostToolUse and PreToolUse hooks to send notifications:

**Local sessions:** Add to your shell profile:
```bash
export SLACK_WEBHOOK_ALERTS="https://hooks.slack.com/services/T.../B.../..."
```

**Remote sessions (`--remote`):** Add `hooks.slack.com` to the network allowlist and set the environment variable in the claude.ai environment config.

### 4. Deploy Slack Bot

```bash
cd scripts/slack-bot
npm install
# Set secrets (one-time)
wrangler secret put SLACK_BOT_TOKEN
wrangler secret put SLACK_SIGNING_SECRET
wrangler secret put GITHUB_TOKEN
# Deploy
wrangler deploy
```

The bot runs on Cloudflare Workers free tier (100k requests/day).

### 5. Set Up Slack App URLs

After deploying, configure these URLs in your Slack app settings:

| Setting | URL |
|---------|-----|
| Slash Command (`/autoshop`) | `https://<worker>.workers.dev/slack/commands` |
| Interactivity Request URL | `https://<worker>.workers.dev/slack/actions` |

## Slash Commands

All commands are ephemeral (only visible to the user who runs them).

| Command | Description |
|---------|-------------|
| `/autoshop status` | Overview with counts for each cell status |
| `/autoshop cells` | Full list of all cells grouped by status |
| `/autoshop blocked` | List of blocked cells only |
| `/autoshop approve <pr>` | Approve a PR (shows confirmation button) |
| `/autoshop merge <pr>` | Squash-merge a PR (requires double confirmation) |

## GitHub Actions Workflows

### slack-label-change.yml

Triggers on issue label changes for any `cell:*` label. Sends to `#auto-shop-cells`. Blocked cells also alert `#auto-shop-alerts`.

### slack-pr-events.yml

Triggers on PR open, close, merge, and ready-for-review. Sends to `#auto-shop-cells`. PRs with `[READY]` prefix also alert `#auto-shop-alerts`.

### slack-stale-cells.yml

Daily cron (9:00 AM UTC) that checks for issues labeled `cell:active` that were created more than 3 days ago. Sends a summary to `#auto-shop-alerts`. Can also be triggered manually via `workflow_dispatch`.

### feature-ci.yml (modified)

Added a `notify-slack` job that runs on CI failure and posts to `#auto-shop-alerts` with a link to the failed run.

## Claude Code Hooks

### notify-slack-posttooluse.sh

PostToolUse hook that fires after Edit/Write operations. When a cell worker writes `BLOCKER.md` or `HANDOFF.md`, sends a notification to `#auto-shop-alerts` with feature name, project, branch, and extracted status/reason.

Runs asynchronously (background curl) to avoid blocking the agent.

### enforce-scope-pretooluse.js (modified)

When a scope violation is detected and `SLACK_WEBHOOK_ALERTS` is set, fires a notification before blocking the operation. Uses a 200ms timeout to allow the request to send before the process exits.

## Security

- Webhook URLs are stored as GitHub Secrets and shell environment variables — never committed to the repository
- The Slack bot verifies request signatures using HMAC-SHA256 with the app's signing secret
- Requests older than 5 minutes are rejected to prevent replay attacks
- The GitHub token used by the bot should have minimal scope (`repo` for reading issues/PRs and merging)
- Destructive operations (approve, merge) require interactive confirmation in Slack

## Cost

All components run on free tiers:
- Slack: Free plan (no per-message costs for incoming webhooks or slash commands)
- Cloudflare Workers: Free tier (100k requests/day)
- GitHub Actions: Free tier for public repos; included minutes for private repos

## Troubleshooting

**Webhooks not firing:** Verify `SLACK_WEBHOOK_CELLS` and `SLACK_WEBHOOK_ALERTS` secrets are set. Workflows skip gracefully if secrets are missing.

**Bot not responding:** Check `wrangler tail` for errors. Verify the Slack app's signing secret matches what was set via `wrangler secret put`.

**Scope violation notifications not sending:** Verify `SLACK_WEBHOOK_ALERTS` is exported in the shell environment where the agent session runs.

**Stale cell check not running:** The cron schedule uses UTC. Run manually with `gh workflow run slack-stale-cells.yml` to test.

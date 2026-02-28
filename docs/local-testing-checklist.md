# Local Testing Checklist: auto-shop + nodots-backgammon

Last run: 2026-02-28

## Prerequisites

- [x] Node.js 20+ installed — v22.17.1
- [x] PostgreSQL installed and running — psql 14.19
- [x] GitHub CLI authenticated — nodots account
- [x] auto-shop CLI responds — `bin/auto-shop help`

## 1. Verify auto-shop CLI commands

```bash
bin/auto-shop cell list
bin/auto-shop queue show
bin/auto-shop help
```

- [x] `cell list` queries GitHub and shows cell statuses
- [x] `queue show` reports no MERGE_QUEUE.md (expected — none created yet)
- [x] `help` prints usage

## 2. Install infra on nodots-backgammon

nodots-backgammon had legacy `.claude/agents/` and a `settings.json` referencing hooks that did not exist.

```bash
bin/auto-shop infra setup /Users/kenr/Code/nodots-backgammon nodots-backgammon
```

- [x] `.claude/hooks/enforce-scope-pretooluse.js` created
- [x] `.claude/hooks/check-handoff-on-complete.sh` created
- [x] `.claude/hooks/check-handoff-on-stop.sh` created
- [x] `.claude/agents/cell-worker-nodots-backgammon.md` already existed (skipped)
- [x] `.claude/settings.json` generated — `node_modules` found at repo root, no NODE_PATH prefix needed
- [x] Existing `.claude/agents/` (8 legacy agents) not clobbered
- [x] `.claude/settings.local.json` untouched

## 3. Verify gnubg-hints infra (already installed)

gnubg-hints had auto-shop hooks installed on Feb 28.

```bash
ls -la /Users/kenr/Code/nodots-backgammon/packages/gnubg-hints/.claude/hooks/
ls -la /Users/kenr/Code/nodots-backgammon/packages/gnubg-hints/.claude/agents/
cat /Users/kenr/Code/nodots-backgammon/packages/gnubg-hints/.claude/settings.json
```

- [x] `.claude/hooks/enforce-scope-pretooluse.js` present
- [x] `.claude/hooks/check-handoff-on-complete.sh` present
- [x] `.claude/hooks/check-handoff-on-stop.sh` present
- [x] `.claude/settings.json` present — NODE_PATH=gnubg-node-addon/node_modules
- [x] SCOPE.json on `feat/pr-calculation-gnubg` branch
- [x] Husky pre-commit at `gnubg-node-addon/.husky/pre-commit`
- [x] Cell-worker agent at `.claude/agents/cell-worker-gnubg.md`

## 4. Test scope enforcement (git pre-commit hook)

On gnubg-hints, `feat/pr-calculation-gnubg` branch:

### Should PASS (in allowedPaths)

```bash
cd /Users/kenr/Code/nodots-backgammon/packages/gnubg-hints
echo "// test" > gnubg-node-addon/src/_test-scope.ts
git add gnubg-node-addon/src/_test-scope.ts
git commit -m "test: scope enforcement pass"
```

- [x] Commit succeeds — "Scope check passed"

Clean up:

```bash
git reset HEAD~1
rm gnubg-node-addon/src/_test-scope.ts
```

### Should FAIL (in forbiddenPaths)

```bash
echo "// test" >> gnubg-node-addon/binding.gyp
git add gnubg-node-addon/binding.gyp
git commit -m "test: scope enforcement fail"
```

- [x] Commit rejected — "Scope violation — files outside SCOPE.json allowedPaths: gnubg-node-addon/binding.gyp"

Clean up:

```bash
git checkout -- gnubg-node-addon/binding.gyp
```

## 5. Verify Claude Code hooks

These hooks fire during Claude Code sessions, not from the shell.

```bash
cat /Users/kenr/Code/nodots-backgammon/packages/gnubg-hints/.claude/settings.json
```

- [x] `hooks` object references PreToolUse (enforce-scope), TaskCompleted (check-handoff), and Stop (check-handoff)
- [ ] Start a Claude Code session on the feat branch, attempt to edit a forbidden file — hook blocks it (requires manual test)

## 6. Test database provisioning

### Verify target database exists

```bash
psql -U postgres -c "\l" | grep nodots
```

- [x] `nodots_backgammon_dev` exists

**Note:** Scripts default to `nodots_dev` which does not exist. Set `DATABASE_URL` to override:

```bash
export DATABASE_URL="postgresql://localhost:5432/nodots_backgammon_dev"
```

### Provision

```bash
./scripts/provision-feature-env.sh test-local
```

- [x] Script completes without error
- [x] `.env.local` created with DATABASE_SCHEMA, PORT, FEATURE_SLUG

```bash
psql -U postgres -d nodots_backgammon_dev -c \
  "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'feat_test_local';"
```

- [x] Schema `feat_test_local` exists

### Teardown

```bash
./scripts/teardown-feature-env.sh test-local
```

- [x] Script completes without error
- [x] Schema `feat_test_local` dropped
- [x] `.env.local` removed

## 7. Test full cell lifecycle (dry run)

The CLI creates branches in auto-shop itself (coordination repo), not in target project repos.

```bash
DATABASE_URL="postgresql://localhost:5432/nodots_backgammon_dev" \
  bin/auto-shop cell create test-local-validation
```

- [x] Branch `feat/test-local-validation` created in auto-shop
- [x] SCOPE.json committed to branch
- [x] Database schema `feat_test_local_validation` provisioned

**Bug found:** SCOPE.json fields are empty — the CLI's string replacements (`"descriptive-feature-name"`, etc.) do not match the current template which has empty string values. The feature name, project, and branch are not populated.

Teardown:

```bash
git checkout main
DATABASE_URL="postgresql://localhost:5432/nodots_backgammon_dev" \
  bin/auto-shop cell teardown test-local-validation
git branch -D feat/test-local-validation
```

- [x] Database schema dropped
- [x] Branch deleted
- [x] Working tree clean after cleanup

## 8. Verify GitHub integration

```bash
gh issue list --repo nodots/auto-shop --label cell:active
gh issue list --repo nodots/auto-shop --label cell:blocked
gh issue view 13 --repo nodots/gnubg-hints --json title,state
```

- [x] Active/blocked cell queries return empty (no issues currently labeled)
- [x] Cell 1 issue (gnubg-hints#13) is open: "Cell 1: Expose PR calculation through gnubg N-API layer"

## 9. Not testable locally

| Item | Reason |
|---|---|
| Railway preview environments | No services configured |
| CI workflow (`.github/workflows/feature-ci.yml`) | Requires push to `feat/` branch on GitHub |
| `auto-shop queue next` | Not implemented (stub) |
| Multi-cell merge sequencing | Manual process only |

## Issues Found

| Issue | Severity | Details |
|---|---|---|
| `nodots_dev` database does not exist | Medium | Provision/teardown scripts default to `nodots_dev`. Actual database is `nodots_backgammon_dev`. Must set `DATABASE_URL` env var. |
| `cell create` SCOPE.json template mismatch | Low | CLI replaces `"descriptive-feature-name"` but template has empty strings. Fields are not populated. |
| `cell create` runs in auto-shop, not target repo | Info | By design — auto-shop is the coordination repo. But may confuse users expecting it to operate on the target project. |

## Repo map

```
auto-shop/                              <- coordination repo
  bin/auto-shop                         <- CLI tool
  scripts/enforce-scope.js              <- git pre-commit hook source
  scripts/hooks/                        <- Claude Code hook sources
  scripts/setup-claude-infra.sh         <- installs hooks into target repos
  templates/                            <- SCOPE.json, agent prompts, etc.

nodots-backgammon/                      <- target project (HTTPS remote)
  .claude/agents/                       <- 8 legacy agents + cell-worker
  .claude/hooks/                        <- auto-shop hooks (installed 2026-02-28)
  .claude/settings.json                 <- auto-shop generated
  .claude/settings.local.json           <- pre-existing local settings
  packages/gnubg-hints/                 <- SEPARATE GIT REPO (SSH remote)
    .claude/hooks/                      <- auto-shop hooks (installed 2026-02-28)
    .claude/settings.json               <- auto-shop generated
    gnubg-node-addon/.husky/            <- husky pre-commit
    SCOPE.json                          <- Cell 1 scope (on feat branch)
```

# AI-Driven Multi-Feature Development: Implementation Plan

> **Goal:** Scale AI-assisted development across multiple features and projects simultaneously, with a single human coordinator managing the process without conflicts or cognitive overload.

---

## Table of Contents

1. [Overview & Principles](#1-overview--principles)
2. [Phase 1 — Foundation: Scope Manifests & Stopping Conditions](#2-phase-1--foundation-scope-manifests--stopping-conditions)
3. [Phase 2 — Environment Isolation](#3-phase-2--environment-isolation)
4. [Phase 3 — Contract Freezing for Shared Packages](#4-phase-3--contract-freezing-for-shared-packages)
5. [Phase 4 — The Work Queue System](#5-phase-4--the-work-queue-system)
6. [Phase 5 — Human Coordination Workflow](#6-phase-5--human-coordination-workflow)
7. [Phase 6 — CI/CD & Merge Sequencing](#7-phase-6--cicd--merge-sequencing)
8. [Phase 7 — Context Handoff System](#8-phase-7--context-handoff-system)
9. [Tooling Summary](#9-tooling-summary)
10. [Rollout Sequence](#10-rollout-sequence)
11. [Reference Templates](#11-reference-templates)

---

## 1. Overview & Principles

### The Mental Model

Each unit of work is a self-contained **AI Dev Cell**: one agent, one feature, one branch, one isolated environment. The human coordinator's job is not to direct code — it's to manage the boundaries *between* cells: unblocking, reviewing, and sequencing merges.

### Core Principles

**Bounded scope over flexibility.** Every cell declares exactly what it's allowed to touch before it starts. Agents do not make autonomous decisions about shared code.

**Stopping over guessing.** Agents stop and surface ambiguity to the human rather than making unilateral decisions. This is enforced through explicit stopping conditions in every agent prompt.

**Contracts over coordination.** Shared interfaces between packages are frozen documents. Cross-package API changes are their own dedicated cells, not side effects of feature work.

**Async over interruption.** The coordinator is not available on-demand. Agents work to a stopping condition and wait. Human review happens in two scheduled sessions per day, not continuously.

---

## 2. Phase 1 — Foundation: Scope Manifests & Stopping Conditions

**Priority: Implement first. This is the highest-leverage change.**

### 2.1 The Scope Manifest

Every feature branch gets a `SCOPE.json` file at the repository root, created by the human coordinator before the agent starts work.

```json
{
  "feature": "move-history-keyboard-nav",
  "project": "nodots-ui",
  "branch": "feat/move-history-keyboard-nav",
  "createdAt": "2026-02-21",
  "allowedPaths": [
    "src/components/MoveHistory/**",
    "src/hooks/useKeyboard*",
    "src/components/MoveHistory/__tests__/**"
  ],
  "forbiddenPaths": [
    "src/types/shared/**",
    "contracts/**",
    "package.json",
    "package-lock.json",
    "tsconfig.json"
  ],
  "dependsOn": [],
  "blockedBy": [],
  "estimatedScope": "Small — keyboard navigation only, no new state shape"
}
```

**Rules for writing a scope manifest:**
- `allowedPaths` uses glob patterns and should be as narrow as possible
- `forbiddenPaths` must always include shared types, contracts, and config files
- `dependsOn` lists other feature branches this cell should not start before
- `blockedBy` is populated at runtime when the agent hits a blocker

### 2.2 Pre-Commit Hook Enforcement

Install a pre-commit hook that validates every staged file against the scope manifest. Commits touching files outside `allowedPaths` are rejected with a descriptive error.

**Setup:**

```bash
# In each repo, install husky
npm install --save-dev husky
npx husky init

# Create the scope enforcement hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
node scripts/enforce-scope.js
EOF
chmod +x .husky/pre-commit
```

**`scripts/enforce-scope.js`:**

```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { minimatch } = require('minimatch');

const scopePath = path.resolve(process.cwd(), 'SCOPE.json');

// No scope manifest = no restriction (main branch, hotfix, etc.)
if (!fs.existsSync(scopePath)) process.exit(0);

const scope = JSON.parse(fs.readFileSync(scopePath, 'utf8'));

const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

// SCOPE.json itself is always allowed
const violations = staged.filter(file => {
  if (file === 'SCOPE.json') return false;
  if (file === 'BLOCKER.md') return false;
  if (file === 'HANDOFF.md') return false;

  const allowed = scope.allowedPaths.some(pattern => minimatch(file, pattern));
  const forbidden = scope.forbiddenPaths.some(pattern => minimatch(file, pattern));

  return !allowed || forbidden;
});

if (violations.length > 0) {
  console.error('\n❌ Scope violation — files outside SCOPE.json allowedPaths:\n');
  violations.forEach(f => console.error(`  ${f}`));
  console.error('\nUpdate SCOPE.json or move changes to the correct branch.\n');
  process.exit(1);
}

console.log('✅ Scope check passed');
process.exit(0);
```

```bash
npm install --save-dev minimatch
```

### 2.3 Stopping Conditions

Every agent session begins with a system prompt section that defines when to stop. This is not optional guidance — it's the primary mechanism that makes async coordination possible.

**Standard stopping conditions to include in every agent prompt:**

```
## Boundaries & Stopping Conditions

You are working within the scope defined in SCOPE.json. Before making any change, 
verify the target file matches an allowedPaths glob. If it does not, stop.

Stop and write to BLOCKER.md if any of the following occur:
- You need to modify a file outside allowedPaths to complete the feature
- You need to change a shared type, contract, or package interface
- Tests fail after two distinct fix attempts
- You are uncertain which of two valid approaches to take and the decision 
  has meaningful architectural implications
- You discover the scope manifest is incomplete or incorrect

When the feature is complete:
- All tests pass
- TypeScript compiles with no errors
- Lint passes
- Write HANDOFF.md summarizing work done, decisions made, and anything left
- Open a draft PR with the title prefix [READY] and stop

Do not ask for confirmation mid-task. Work to completion or a stopping condition.
```

---

## 3. Phase 2 — Environment Isolation

### 3.1 Database Schema Isolation (PostgreSQL)

Each feature branch gets its own PostgreSQL schema, prefixed by feature name. This prevents concurrent features from clobbering each other's migrations or test data.

**Schema naming convention:** `feat_{feature_slug}` (e.g., `feat_move_history_keyboard_nav`)

**Provisioning script (`scripts/provision-feature-env.sh`):**

```bash
#!/bin/bash
# Usage: ./scripts/provision-feature-env.sh <feature-slug>

FEATURE_SLUG=$1
SCHEMA_NAME="feat_${FEATURE_SLUG//-/_}"
DB_URL=${DATABASE_URL:-"postgresql://localhost:5432/nodots_dev"}

if [ -z "$FEATURE_SLUG" ]; then
  echo "Usage: $0 <feature-slug>"
  exit 1
fi

echo "Provisioning schema: $SCHEMA_NAME"
psql "$DB_URL" -c "CREATE SCHEMA IF NOT EXISTS \"$SCHEMA_NAME\";"

# Write feature-local .env
cat > .env.local << EOF
DATABASE_SCHEMA=$SCHEMA_NAME
PORT=$(node -e "console.log(3000 + Math.floor(Math.random() * 1000))")
FEATURE_SLUG=$FEATURE_SLUG
EOF

echo "✅ Environment provisioned. Schema: $SCHEMA_NAME"
echo "   .env.local written."
```

**Teardown script (`scripts/teardown-feature-env.sh`):**

```bash
#!/bin/bash
FEATURE_SLUG=$1
SCHEMA_NAME="feat_${FEATURE_SLUG//-/_}"
DB_URL=${DATABASE_URL:-"postgresql://localhost:5432/nodots_dev"}

psql "$DB_URL" -c "DROP SCHEMA IF EXISTS \"$SCHEMA_NAME\" CASCADE;"
rm -f .env.local
echo "✅ Schema $SCHEMA_NAME dropped and .env.local removed."
```

### 3.2 Port Assignment

Reserve port ranges per project to avoid conflicts when running multiple local servers:

| Project | Port Range |
|---|---|
| nodots-ui dev server | 3000–3099 |
| nodots-api | 4000–4099 |
| nodots-analysis | 5000–5099 |

Each `.env.local` is generated with a random port within the project's range by the provisioning script above.

### 3.3 Railway Preview Environments

For Railway deployments, enable preview environments per branch in the Railway project settings. Each branch push automatically provisions an isolated preview deployment.

In `railway.json` (or Railway dashboard settings):
- Enable "Preview Environments" 
- Set environment variable `FEATURE_SLUG` from branch name using Railway's branch variable support
- Configure database provisioning as a deploy hook calling the equivalent of the provisioning script above

---

## 4. Phase 3 — Contract Freezing for Shared Packages

### 4.1 The Contracts Directory

Create a `contracts/` directory at the monorepo root (or in your most shared package). This directory contains TypeScript interface files representing the public API between packages. It is treated as read-only by all feature cells.

```
contracts/
  analysis-engine.ts       # IAnalysisEngine, IAnalysisResult, etc.
  game-state.ts            # IGameState, IMove, IDice, etc.
  plugin-system.ts         # IPlugin, IPluginManifest, etc.
  api-responses.ts         # Shared HTTP response shapes
  index.ts                 # Re-exports all contracts
  CHANGELOG.md             # History of contract changes
  README.md                # How to propose a contract change
```

**`contracts/README.md`:**

```markdown
# Contracts

These files define the shared interfaces between Nodots packages.

**Do not modify these files in a feature branch.**

If you need a contract change to complete your feature:
1. Stop work on your feature branch
2. Write the proposed change and rationale to your BLOCKER.md
3. The coordinator will create a dedicated `contract/` branch for the change
4. Your feature branch will be unblocked once the contract branch merges

Contract changes require coordinator approval because they affect all active cells.
```

### 4.2 Enforcing Contract Freeze in Scope Manifests

Every `SCOPE.json` must include `contracts/**` in `forbiddenPaths`. This is non-negotiable and should be validated by a setup script.

### 4.3 Contract Change Workflow

When a feature cell discovers it needs a contract change:

1. Agent writes the required change to `BLOCKER.md`
2. Coordinator reviews and creates a dedicated `contract/change-name` branch
3. That branch gets its own scope manifest with `allowedPaths: ["contracts/**"]`
4. Contract change is implemented, reviewed, and merged to main first
5. All dependent feature branches rebase onto updated main
6. Dependent feature cells are unblocked and resume

---

## 5. Phase 4 — The Work Queue System

### 5.1 Queue Structure

Use GitHub Issues as the work queue. Each feature cell maps to one GitHub Issue with a standardized structure.

**Issue template (`.github/ISSUE_TEMPLATE/feature-cell.md`):**

```markdown
---
name: Feature Cell
about: A single unit of AI-driven development work
labels: feature-cell
---

## Feature
<!-- One-line description -->

## Project & Branch
- **Project:** 
- **Branch:** `feat/`
- **Scope Manifest:** [ ] Written

## Status
<!-- queued | active | blocked | awaiting-review | merged -->
`queued`

## Dependencies
<!-- List issue numbers this cell must wait for -->
- None

## Scope Summary
<!-- What files/components will be touched -->

## Acceptance Criteria
- [ ] 
- [ ] 
- [ ] Tests pass
- [ ] TypeScript compiles
- [ ] PR opened with [READY] prefix

## Blocker (if blocked)
<!-- Filled in by agent or coordinator -->

## Agent Session Reference
<!-- Cursor chat thread ID or session note -->

## Environment
- Schema: `feat_`
- Port: 
```

### 5.2 Labels

Create these GitHub labels for queue management:

| Label | Color | Meaning |
|---|---|---|
| `cell:queued` | gray | Ready to start, waiting for capacity |
| `cell:active` | blue | Agent currently working |
| `cell:blocked` | red | Agent stopped, needs coordinator action |
| `cell:awaiting-review` | yellow | PR open, needs human review |
| `cell:merged` | green | Complete |
| `cell:contract-change` | purple | Modifies contracts — high priority |

### 5.3 Capacity Limits

Set a personal WIP limit: **no more than 4 active cells at once.** More than 4 means your morning review session can't realistically cover everything. If the queue grows beyond 4 ready items, prioritize and queue the rest.

---

## 6. Phase 5 — Human Coordination Workflow

### 6.1 Daily Schedule

**Morning Session (20–30 minutes):**

1. Open all issues labeled `cell:blocked` — resolve each or document why it can't be resolved yet
2. Open all PRs labeled `[READY]` — do a quick review pass; approve or leave specific feedback
3. Check `cell:queued` items — if capacity allows, start new cells by writing their scope manifest, running provisioning script, and launching agent session
4. Update issue labels to reflect current state

**Evening Session (20–30 minutes):**

1. Review any PRs that passed CI since morning
2. Execute merge queue in dependency order (see Phase 6)
3. Write scope manifests for tomorrow's new cells
4. Update the work queue — reprioritize if needed

**Between sessions:** Do not monitor agent progress. Let agents work to their stopping conditions. Interrupting agents mid-task destroys the async model.

### 6.2 Starting a Cell

Checklist before launching an agent session:

- [ ] GitHub Issue created with all fields filled
- [ ] `SCOPE.json` written and committed to the feature branch
- [ ] Feature branch created from latest `main`
- [ ] Provisioning script run: `./scripts/provision-feature-env.sh <slug>`
- [ ] `.env.local` verified
- [ ] Issue label set to `cell:active`
- [ ] Agent session started with standard prompt (see Section 11)

### 6.3 Handling Blockers

When an agent writes a `BLOCKER.md`:

1. Read the blocker description
2. Categorize it:
   - **Scope question** → update `SCOPE.json` and restart agent with updated context
   - **Contract change needed** → create a contract cell (highest priority), add dependency to original cell
   - **Test failure the agent can't solve** → review the test and failed code yourself, leave specific guidance in a comment on the issue, restart agent with that guidance in prompt
   - **Architectural decision** → make the decision yourself, document it in the issue, restart agent
3. Update issue label from `cell:blocked` to `cell:active` after unblocking

### 6.4 Reviewing Agent PRs

When reviewing a PR opened by an agent:

- Read `HANDOFF.md` first — it summarizes decisions made
- Check that all acceptance criteria on the issue are met
- Verify no files outside `SCOPE.json` allowedPaths were changed (the pre-commit hook prevents this, but verify)
- Run the feature locally if the change is non-trivial
- Do not ask the agent to make cosmetic changes; only block on correctness, missing tests, or scope violations

---

## 7. Phase 6 — CI/CD & Merge Sequencing

### 7.1 CI Pipeline

Every feature branch gets the standard CI run on every push:

```yaml
# .github/workflows/feature-ci.yml
name: Feature Branch CI

on:
  push:
    branches:
      - 'feat/**'
      - 'contract/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: TypeScript
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

      - name: Scope manifest present
        run: |
          if [ ! -f SCOPE.json ]; then
            echo "❌ SCOPE.json missing from feature branch"
            exit 1
          fi

  integration-check:
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0

      - name: Rebase onto main and test
        run: |
          git config user.email "ci@nodots.dev"
          git config user.name "CI"
          git fetch origin ${{ github.ref_name }}
          git checkout ${{ github.ref_name }}
          git rebase origin/main
          npm ci
          npm test
```

### 7.2 Merge Queue

Maintain a `MERGE_QUEUE.md` file in the repo root (on `main`) that you update each evening:

```markdown
# Merge Queue

Last updated: 2026-02-21

## Ready to Merge (in order)
1. `contract/analysis-engine-v2` — #42 — no dependencies
2. `feat/move-history-keyboard-nav` — #38 — depends on #42
3. `feat/dice-animation` — #39 — no dependencies

## Awaiting Review
- `feat/board-theme-selector` — #41 — PR open, not yet reviewed

## Active
- `feat/game-history-export` — #44 — agent working

## Queued
- `feat/tournament-mode-scaffold` — #45 — starts after #41 merges
```

### 7.3 Merge Procedure

For each item at the top of the queue:

```bash
# 1. Rebase onto latest main
git checkout feat/move-history-keyboard-nav
git fetch origin
git rebase origin/main

# 2. Run tests one final time
npm test

# 3. Merge (squash for features, merge commit for contracts)
git checkout main
git merge --squash feat/move-history-keyboard-nav
git commit -m "feat: keyboard navigation for move history (#38)"

# 4. Push and tag
git push origin main

# 5. Teardown feature environment
./scripts/teardown-feature-env.sh move-history-keyboard-nav

# 6. Close issue, update MERGE_QUEUE.md
```

---

## 8. Phase 7 — Context Handoff System

### 8.1 HANDOFF.md

Every time an agent reaches a stopping condition (blocked or complete), it writes `HANDOFF.md` to the branch root before stopping. This file is the context bridge between sessions.

**Required sections:**

```markdown
# Handoff: [feature name]
Date: [today]
Status: [blocked | complete]

## What Was Done
<!-- Summary of work completed this session -->

## What Remains
<!-- If blocked or partially complete -->

## Key Decisions Made
<!-- Architectural or implementation choices and the reasoning -->

## Files Modified
<!-- List of every file changed and why -->

## Test Status
<!-- Which tests pass, which fail, any known flakiness -->

## Current Blockers
<!-- If status is blocked: exact description of what's needed -->

## How to Resume
<!-- Specific instructions for the next agent session -->
```

### 8.2 Starting a New Agent Session on an Existing Cell

Paste the following into the agent's initial prompt, filling in the bracketed sections:

```
You are resuming work on the feature: [feature name].
Project: [project name]
Branch: [branch name]

Read the following files before doing anything else:
1. SCOPE.json — your boundaries
2. HANDOFF.md — what was done and what remains

Then continue work from where the previous session left off, following 
the stopping conditions defined in SCOPE.json.

Do not re-do work that HANDOFF.md says is complete.
Do not ask for confirmation before starting — begin immediately.
```

### 8.3 Session Log (Optional but Recommended)

For active cells spanning multiple days, maintain a `SESSION_LOG.md` that appends a one-line entry per session:

```
2026-02-19 | Session 1 | Scaffolded component, wrote first two tests
2026-02-20 | Session 2 | Blocked: needs shared type change in IMove
2026-02-21 | Session 3 | Unblocked, completed implementation, PR opened
```

This gives the coordinator a quick glance at the history of a cell without reading every HANDOFF.md.

---

## 9. Tooling Summary

| Tool | Purpose |
|---|---|
| Git + GitHub | Branch isolation, PRs, issue tracking |
| GitHub Issues | Work queue with standardized templates |
| GitHub Actions | CI on every push, integration check against main |
| Husky + pre-commit hook | Scope enforcement at commit time |
| PostgreSQL schemas | Database isolation per feature cell |
| Railway Preview Environments | Deployed preview per branch |
| Cursor | AI agent IDE; one chat thread per cell |
| `SCOPE.json` | Declarative scope per branch |
| `BLOCKER.md` | Agent-to-human async communication |
| `HANDOFF.md` | Session-to-session context preservation |
| `MERGE_QUEUE.md` | Coordinator's merge sequencer |

---

## 10. Rollout Sequence

Implement in this order. Each phase builds on the last and delivers value independently.

### Week 1 — Scope & Stopping Conditions
- [ ] Write standard scope manifest format (`SCOPE.json`)
- [ ] Write and install pre-commit hook (`scripts/enforce-scope.js`)
- [ ] Write standard agent prompt template with stopping conditions
- [ ] Create GitHub issue template for feature cells
- [ ] Create GitHub labels
- [ ] Run one test cell end-to-end with the new system

### Week 2 — Environment Isolation
- [ ] Write `scripts/provision-feature-env.sh`
- [ ] Write `scripts/teardown-feature-env.sh`
- [ ] Configure Railway preview environments
- [ ] Update agent prompt to include `.env.local` instructions
- [ ] Test with two concurrent cells in isolated environments

### Week 3 — Contract Freezing
- [ ] Create `contracts/` directory
- [ ] Extract existing shared interfaces into contract files
- [ ] Write `contracts/README.md`
- [ ] Add `contracts/**` to every future scope manifest's `forbiddenPaths`
- [ ] Define contract change workflow with the team

### Week 4 — CI & Merge Sequencing
- [ ] Write `feature-ci.yml` GitHub Actions workflow
- [ ] Add integration-check job (rebase onto main + test)
- [ ] Create `MERGE_QUEUE.md` and adopt daily merge procedure
- [ ] Run first multi-cell merge sequence

### Ongoing — Coordination Rhythm
- [ ] Commit to two daily coordination sessions (morning + evening)
- [ ] Enforce WIP limit of 4 active cells
- [ ] Review and refine scope manifest templates based on what violations occur
- [ ] After each merged feature, do a 5-minute retro: did the scope manifest capture everything? Did the agent stop at the right times?

---

## 11. Reference Templates

### Standard Agent Prompt Template

```
You are an AI developer working on the Nodots backgammon ecosystem.

## Your Assignment
Feature: [feature name]
Project: [project name]  
Branch: [branch name]

## Before You Start
1. Read SCOPE.json carefully — it defines exactly what you are and are not allowed to touch
2. If HANDOFF.md exists, read it — it tells you what was done in a previous session

## Boundaries & Stopping Conditions

You are constrained to the paths listed in SCOPE.json allowedPaths. Before modifying 
any file, verify it matches an allowed glob. If it does not, stop.

Stop immediately and write a clear description to BLOCKER.md if:
- You need to modify a file outside allowedPaths
- You need to change anything in contracts/**
- Tests fail after two distinct fix attempts
- You are facing a genuine architectural decision with no clear answer
- The scope manifest appears incomplete or incorrect for this feature

When the feature is complete (all acceptance criteria met, tests pass, TS compiles, lint passes):
1. Write HANDOFF.md
2. Open a draft PR with title prefix [READY]: [feature name]
3. Stop — do not continue making changes after opening the PR

## Technical Context
- TypeScript strict mode
- Node 20, Express, PostgreSQL
- React with Material UI
- Run tests with: npm test
- Run typecheck with: npx tsc --noEmit
- Run lint with: npm run lint
- Your database schema is in .env.local (DATABASE_SCHEMA)

## Style Conventions
- Functional components, no class components
- Hooks for shared logic
- Co-locate tests with implementation (__tests__ directories)
- No `any` types

Begin working now. Do not ask for permission or confirmation before starting.
```

### SCOPE.json Template

```json
{
  "feature": "",
  "project": "",
  "branch": "feat/",
  "createdAt": "",
  "allowedPaths": [],
  "forbiddenPaths": [
    "contracts/**",
    "src/types/shared/**",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.*.json",
    ".github/**",
    "scripts/**"
  ],
  "dependsOn": [],
  "blockedBy": [],
  "estimatedScope": ""
}
```

### BLOCKER.md Template

```markdown
# Blocker: [feature name]
Date: [today]

## What I Was Trying to Do

## Why I'm Blocked

## What I Need From the Coordinator

## Options Considered

## Work Completed Before Blocking
```

### HANDOFF.md Template

```markdown
# Handoff: [feature name]
Date: [today]
Status: [blocked | complete]

## What Was Done

## What Remains

## Key Decisions Made

## Files Modified

## Test Status

## Current Blockers

## How to Resume
```

### MERGE_QUEUE.md Template

```markdown
# Merge Queue

Last updated: [date]

## Ready to Merge (in order)

## Awaiting Review

## Active

## Queued (not yet started)
```

---

*This document is a living plan. Update it as the system is refined through use.*

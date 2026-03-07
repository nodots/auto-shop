# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **auto-shop** — a coordination layer for managing multi-project agentic AI-driven software development. It is not a traditional codebase; it's a system for orchestrating multiple concurrent AI development cells working on different features across multiple projects simultaneously.

The core idea: break complex multi-feature development into isolated "cells" (one feature, one AI agent, one branch, one scoped environment), where a single human coordinator manages boundaries between cells rather than the code itself.

## Key Concepts

**AI Dev Cell:** A bounded unit of work consisting of:
- One feature branch
- One scope manifest (`SCOPE.json`)
- One AI agent session
- Strict boundaries on which files can be modified
- Explicit stopping conditions

**Scope Manifest (`SCOPE.json`):** Declarative definition of what an agent can and cannot touch, preventing conflicts and scope creep.

**Stopping Conditions:** Agents work to completion or a well-defined stopping condition, enabling async coordination without interruption.

**Contracts Directory (`contracts/`):** Shared interfaces between packages are frozen documents, preventing silent API changes across concurrent features.

**Context Handoff Files:** `BLOCKER.md` and `HANDOFF.md` bridge sessions and coordinate with the human.

## Primary Use: Creating Feature Cells

When starting a new feature cell, create:

1. **Feature branch** from `main`
2. **SCOPE.json** at repository root (see template below)
3. **GitHub Issue** using the feature-cell template
4. **Environment provisioning** (database schema, ports, etc.)
5. **Agent session** in an IDE (Cursor) with the standard agent prompt

### SCOPE.json Template

```json
{
  "feature": "descriptive-feature-name",
  "project": "project-name",
  "branch": "feat/descriptive-feature-name",
  "createdAt": "2026-02-23",
  "allowedPaths": [
    "src/path/to/feature/**",
    "test/path/**"
  ],
  "forbiddenPaths": [
    "contracts/**",
    "src/types/shared/**",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.*.json",
    ".github/**"
  ],
  "dependsOn": [],
  "blockedBy": [],
  "estimatedScope": "Brief description of the feature"
}
```

**Rules:**
- `allowedPaths`: Use glob patterns, as narrow as possible
- `forbiddenPaths`: Always include shared types, contracts, config files, and package management
- `dependsOn`: List other feature branches this cell must wait for
- `blockedBy`: Updated at runtime if agent hits a blocker

## Agent Prompt Template (Standard)

Use this as the foundation for every agent session:

```
You are an AI developer working on [project name].

## Your Assignment
Feature: [feature name]
Project: [project name]
Branch: [branch name]

## Before You Start
1. Read SCOPE.json carefully — it defines exactly what you are and are not allowed to touch
2. If HANDOFF.md exists, read it — it tells you what was done in a previous session
3. Explore the existing codebase structure before writing any code

## Boundaries & Stopping Conditions

You are constrained to the paths listed in SCOPE.json allowedPaths. Before modifying any file, verify it matches an allowed glob. If it does not, stop.

Stop immediately and write to BLOCKER.md if:
- You need to modify a file outside allowedPaths
- You need to change anything in contracts/**
- Tests fail after two distinct fix attempts
- You are facing a genuine architectural decision with no clear answer
- The scope manifest appears incomplete or incorrect

When the feature is complete (all acceptance criteria met, tests pass, TS compiles, lint passes):
1. Write HANDOFF.md
2. Open a draft PR with title prefix [READY]: [feature name]
3. Stop — do not make further changes after opening the PR

## Technical Context
[Add relevant build/test/lint commands for the specific project]

Do not ask for permission or confirmation before starting. Begin immediately.
```

## Context Handoff Files

### BLOCKER.md

When an agent hits a stopping condition and cannot continue, it writes this file:

```markdown
# Blocker: [feature name]
Date: [date]

## What I Was Trying to Do
[Describe the task]

## Why I'm Blocked
[Explain the blocking issue]

## What I Need From the Coordinator
[Request for action]

## Options Considered
[Alternative approaches]

## Work Completed Before Blocking
[Summary of progress to date]
```

### HANDOFF.md

When an agent reaches completion or pauses, it writes this file:

```markdown
# Handoff: [feature name]
Date: [date]
Status: [blocked | complete]

## What Was Done
[Summary of work completed]

## What Remains
[If incomplete, what's left to do]

## Key Decisions Made
[Architectural choices and reasoning]

## Files Modified
[List of files changed and why]

## Test Status
[Which tests pass/fail, known issues]

## Current Blockers
[If status is blocked, exact blocker description]

## How to Resume
[Specific instructions for the next session]
```

## Coordination Workflow

**Morning Session (20–30 min):**
1. Review all `cell:blocked` issues — resolve or document blockers
2. Review `[READY]` PRs — quick pass; approve or leave specific feedback
3. If capacity, start new cells: write SCOPE.json, run provisioning, launch agent
4. Update issue labels

**Evening Session (20–30 min):**
1. Review PRs that passed CI
2. Execute merge queue in dependency order
3. Write scope manifests for tomorrow's cells
4. Reprioritize queue

**Between sessions:** Do not interrupt agents. They work to stopping conditions asynchronously.

## Multi-Project Setup

This repository documents the coordination system used across multiple projects:

- **nodots-backgammon** — Three sequential cells (gnubg-hints → backgammon-core → backgammon-ai)
- **a2z-freight-claims** — Email provider integration (independent)

Each project has its own repository and SCOPE.json files. This repository (`auto-shop`) is purely documentation and coordination.

## Pre-Commit Scope Enforcement

Each project should install a pre-commit hook to prevent commits outside the scope manifest. Hook file: `scripts/enforce-scope.js` (see `ai-dev-scaling-plan.md` for implementation).

Install with:
```bash
npm install --save-dev husky minimatch
npx husky init
# Create .husky/pre-commit with the enforcement script
```

## Key Files in This Repository

- **README.md** — High-level project description
- **docs/active-cells.md** — Current work queue with SCOPE.json templates and agent prompts for each cell
- **docs/ai-dev-scaling-plan.md** — Comprehensive multi-phase implementation plan (7 phases, detailed tooling, templates, rollout sequence)
- **LICENSE** — Project license

## Common Commands

This repository has no build or test commands. It's purely documentation. Each project under coordination has its own development setup (see individual project READMEs and SCOPE.json files for their test/build/lint commands).

## Quick Reference: Contract Freezing

If an agent needs to modify shared interfaces:

1. Agent writes the required change to BLOCKER.md
2. Coordinator creates a dedicated `contract/change-name` branch
3. That branch gets its own SCOPE.json with `allowedPaths: ["contracts/**"]`
4. Contract change is merged to main first
5. All dependent feature branches rebase and resume

**Rule:** `contracts/**` is forbidden in all feature cell scope manifests.

## Coordinator Checklist

Before launching each cell:
- [ ] Create feature branch from latest main
- [ ] Write and commit SCOPE.json to the branch
- [ ] Verify allowedPaths/forbiddenPaths match actual directory structure
- [ ] Run provisioning script (database schema, .env.local, ports)
- [ ] Create GitHub Issue with feature-cell template
- [ ] Set issue label to `cell:active`
- [ ] Launch agent session with standard prompt

## WIP Limits

Maintain a personal limit of **4 active cells maximum** at any time. More than 4 makes the morning/evening coordination sessions unrealistic.

## Recommended Models

- **Opus 4.6** — Cell workers (feature implementation, complex reasoning)
- **Sonnet 4.5** — Lightweight validation, scope checks, PR review assistance

Cell worker subagent files specify their model in YAML frontmatter. Override per-session if needed.

## Status Labels (GitHub)

- `cell:queued` — Ready to start, waiting for capacity
- `cell:active` — Agent currently working
- `cell:blocked` — Agent stopped, needs coordinator action
- `cell:awaiting-review` — PR open, needs human review
- `cell:merged` — Complete
- `cell:contract-change` — Modifies contracts (highest priority)

## Resuming Work on a Cell

To restart an existing cell after an agent session ends:

1. Read SCOPE.json and HANDOFF.md
2. Resolve any blockers documented in BLOCKER.md
3. Update the agent prompt with the blocker resolution
4. Include in prompt: "You are resuming work on [feature]. Read SCOPE.json and HANDOFF.md before continuing."
5. Restart agent session

## Entry Points by Role

### For New Coordinators

**Start here (in order):**

1. **docs/quickstart.md** (30 min) — Overview of the system and your first feature cell
2. **This file (CLAUDE.md)** — Agent and coordinator instructions
3. **docs/coordinator-workflow.md** (detailed) — Your morning and evening session checklists
4. **docs/merge-procedure.md** (reference) — Step-by-step merge guide
5. **docs/ai-dev-scaling-plan.md** (deep dive) — Full architecture and phases

### For New Agents

**Start here (in order):**

1. **Read CLAUDE.md** Section "Agent Prompt Template"
2. **Read your specific agent prompt** (provided by coordinator)
3. **Read SCOPE.json** on your feature branch
4. **If resuming, read HANDOFF.md** from previous session
5. **Reference templates/README.md** if you hit BLOCKER.md or need HANDOFF.md

### For Teams Adopting the System

1. Review **docs/ai-dev-scaling-plan.md** Section 10 (Rollout Sequence)
2. Follow **ISSUES_CREATED.md** for implementation order
3. Execute Phase 1–4 issues in sequence
4. Use retrospectives to improve the system

---

## Complete Documentation Map

### Core Documentation

| File | Purpose | Audience |
|------|---------|----------|
| **docs/quickstart.md** | 30-minute getting started guide | New coordinators |
| **docs/ai-dev-scaling-plan.md** | Complete technical architecture (7 phases) | Architects, team leads |
| **docs/coordinator-workflow.md** | Daily morning/evening checklists | Coordinators (reference) |
| **docs/merge-procedure.md** | Step-by-step merge guide with troubleshooting | Coordinators (reference) |
| **docs/scope-design-guide.md** | Decision tree for writing SCOPE.json | Coordinators, agents |
| **docs/contract-workflow.md** | How to request and approve contract changes | Coordinators, agents |
| **docs/railway-setup.md** | Configure Railway for preview environments | DevOps, coordinators |
| **docs/agent-teams.md** | Using Agent Teams for within-cell parallelism | Coordinators, agents |
| **docs/context-management.md** | Context window, compaction, and file-based artifacts | Agents |
| **docs/cross-repo-features.md** | Workflow for features spanning multiple repos | Coordinators |
| **docs/remote-execution.md** | Running cell workers remotely with `claude --remote` | Coordinators |

### Templates

| File | Purpose | When to Use |
|------|---------|------------|
| **templates/SCOPE.json** | Generic scope manifest | Starting any feature cell |
| **templates/SCOPE-{project}.json** | Project-specific templates | See naming convention below |
| **templates/agent-prompt.template.md** | Standard agent session prompt (legacy) | Launching agent sessions |
| **templates/agents/cell-worker.md** | Subagent definition for cell workers | Launching agent sessions |
| **templates/agents/README.md** | How to use subagent templates | Understanding agent templates |
| **templates/BLOCKER.md** | Blocker notification template | When agent hits stopping condition |
| **templates/HANDOFF.md** | Feature completion template | When feature is complete or paused |
| **templates/MERGE_QUEUE.md** | Merge queue template | Evening coordinator session |
| **templates/README.md** | How to use all templates | Understanding the templates |

**Project-Specific Templates:**
- `templates/SCOPE-nodots-backgammon.template.json` — For nodots-backgammon project
- `templates/SCOPE-a2z-freight-claims.template.json` — For a2z-freight-claims

### GitHub Automation

| File | Purpose |
|------|---------|
| **.github/ISSUE_TEMPLATE/feature-cell.md** | Create new feature cell issues |
| **.github/ISSUE_TEMPLATE/contract-change.md** | Create contract change issues |
| **.github/ISSUE_TEMPLATE/blocker.md** | Create blocker escalation issues |
| **.github/workflows/feature-ci.yml** | CI checks for feature branches |

### Retrospectives & Insights

| File | Purpose |
|------|---------|
| **docs/retrospectives/TEMPLATE.md** | Template for post-cell retrospectives |
| **docs/retrospectives/INSIGHTS.md** | Aggregated learnings from all cells |
| **docs/retrospectives/{feature-name}.md** | Individual cell retrospectives (created per cell) |

### Support Scripts

| Script | Purpose |
|--------|---------|
| **scripts/enforce-scope.js** | Pre-commit hook that validates SCOPE.json |
| **scripts/setup-claude-infra.sh** | Install Claude Code hooks and agent in a target repo |
| **scripts/hooks/** | Canonical hook scripts copied by setup-claude-infra.sh |
| **scripts/provision-feature-env.sh** | Provision database schema for feature |
| **scripts/teardown-feature-env.sh** | Clean up database schema after merge |
| **bin/auto-shop** | CLI tool for coordinator workflows |

---

## Coordinator Daily Workflow (Quick Reference)

For detailed steps, see **docs/coordinator-workflow.md**

### Morning Session (20–30 min)

```bash
# Review blocked cells
gh issue list --label cell:blocked

# Review completed cells waiting for merge
gh issue list --label cell:awaiting-review

# Check capacity
gh issue list --label cell:active  # Should be < 4

# If capacity, start a new cell:
git checkout -b feat/feature-name
cp templates/SCOPE-{project}.template.json SCOPE.json
# Edit SCOPE.json
git add SCOPE.json && git commit -m "Add SCOPE.json"
./scripts/provision-feature-env.sh feature-slug
# Create GitHub issue using feature-cell template
# Launch agent session with templates/agent-prompt.template.md
```

### Evening Session (20–30 min)

```bash
# Merge completed cells (in dependency order)
# For each cell in MERGE_QUEUE.md:
git checkout feat/feature-name
git rebase origin/main
npm test && npm run build
git checkout main && git pull origin main
git merge --squash feat/feature-name
git commit -m "[MERGED] Feature name"
git push origin main
./scripts/teardown-feature-env.sh feature-slug

# Update MERGE_QUEUE.md with current status

# Pre-write scope manifests for tomorrow's starts
# (Copy templates, fill in paths)
```

---

## Contract Freezing Quick Reference

For detailed steps, see **docs/contract-workflow.md**

### When an Agent Requests a Contract Change

1. Agent writes BLOCKER.md with:
   - Current interface (code block)
   - Proposed interface (code block)
   - Rationale (why needed)
   - Affected packages (list)

2. Coordinator creates contract change cell:
   ```bash
   git checkout -b contract/change-name
   # SCOPE.json: allowedPaths: ["contracts/**"], forbiddenPaths: [src/**, test/**, etc.]
   # Edit contracts/
   git add contracts/ && git commit -m "Contract: ..."
   git push && open PR
   ```

3. Contract change merges to main FIRST

4. Agent's feature branch rebases onto main

5. Agent resumes work with new contract available

**Rule:** `contracts/**` is forbidden in all feature branches.

---

## Scope Design Quick Reference

For detailed guidance, see **docs/scope-design-guide.md**

### Typical allowedPaths (by project)

**nodots-backgammon:**
```json
"allowedPaths": [
  "src/features/{feature-name}/**",
  "test/features/{feature-name}/**"
]
```

**a2z-freight-claims:**
```json
"allowedPaths": [
  "src/{feature-area}/**",
  "test/{feature-area}/**"
]
```

### Always forbid (standard forbiddenPaths)

```json
"forbiddenPaths": [
  "contracts/**",
  "src/types/shared/**",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  ".github/**"
]
```

### Test your SCOPE.json

```bash
# In-scope file should commit successfully
echo "test" > src/features/feature-name/test.ts
git add src/features/feature-name/test.ts
git commit -m "Test"  # Should succeed ✓

# Out-of-scope file should be rejected
echo "test" >> package.json
git add package.json
git commit -m "Test"  # Should fail ❌
```

---

## Common Questions

### Q: Can I modify SCOPE.json mid-cell?

**A:** Yes, but carefully. If agent discovers scope is incomplete:
1. Agent writes BLOCKER.md explaining why
2. Coordinator approves the change
3. Agent updates SCOPE.json
4. Agent resumes work

Major changes = escalate or split the cell.

### Q: What if a merge has conflicts?

**A:** Conflicts mean main changed in a way that conflicts with the feature.

```bash
git checkout feat/feature-name
git rebase origin/main
# Resolve conflicts in your editor
git add <conflicted-files>
git rebase --continue
git push origin feat/feature-name --force-with-lease
```

### Q: How long should a cell take?

**A:** 1–4 days is typical.
- **Small:** 1–2 days (single component, no dependencies)
- **Medium:** 2–4 days (multiple components or small package)
- **Large:** 4+ days (consider splitting into smaller cells)

### Q: Can I run more than 4 concurrent cells?

**A:** Not recommended. Coordinator overhead becomes unsustainable. 4 cells = 1 hour/day management.

If you consistently have >4 ready cells:
- Your cells are finishing faster (good)
- Increase capacity management time, OR
- Cells are too small (consider combining)

### Q: What if an agent gets stuck?

**A:** Agent writes BLOCKER.md and stops. Coordinator reviews and unblocks:
- Modify SCOPE.json if scope is incomplete
- Create contract change cell if contract change is needed
- Provide clarification if architectural decision is needed
- Mark dependency as priority if waiting for another cell

### Q: How do I handle a production bug while cells are running?

**A:** Create a `hotfix/bug-name` branch (not `feat/`):
1. Hotfix is exempt from SCOPE.json enforcement
2. Merge directly to main (don't use merge queue)
3. Dependent feature branches rebase if they touched the same files

---

## Troubleshooting

### Problem: Pre-commit hook is rejecting my commit

**Solution:**
1. Check which file was rejected
2. Is it in SCOPE.json allowedPaths? If not, you can't modify it
3. Either:
   - Don't commit that file (move changes to correct branch)
   - Update SCOPE.json to allow the file (if legitimate)
   - Write BLOCKER.md if you think scope is wrong

### Problem: Database provisioning failed

**Solution:**
```bash
# Verify PostgreSQL is running
psql -U postgres -c "SELECT 1;"

# Check DATABASE_URL
echo $DATABASE_URL

# Try manual schema creation
psql -U postgres -d auto_shop_dev -c "CREATE SCHEMA feat_my_feature;"
```

Then run the provision script again.

### Problem: A cell took way longer than estimated

**Solution:**
1. Review the retrospective
2. Was SCOPE.json incomplete? Update templates.
3. Were stopping conditions unclear? Update agent prompt.
4. Gather learnings for next cell

### Problem: Two cells have conflicting changes to the same file

**Solution:** This shouldn't happen if scope is correct. If it does:
1. Merge the first cell
2. Second cell rebases (integrates changes from first cell)
3. If conflicts, resolve and re-test
4. Merge second cell

Prevention: Tighter scope, better dependency tracking.

---

## CLI Tool (if implemented)

See **bin/auto-shop** for available commands:

```bash
auto-shop cell create <name>      # Start a new cell
auto-shop cell list               # Show all cells
auto-shop cell teardown <name>    # Clean up a cell
auto-shop queue show              # Show merge queue
auto-shop queue next              # Merge next cell
auto-shop help                    # All commands
```

---

## See Also

- **docs/ai-dev-scaling-plan.md** — Full system design with 7 phases, implementation details, and reference templates
- **docs/active-cells.md** — Current work queue with example SCOPE.json files and agent prompts
- **ISSUES_CREATED.md** — GitHub issues tracking the implementation rollout

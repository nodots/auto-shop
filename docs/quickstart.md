# Quick Start Guide

Welcome to the AI-Driven Multi-Feature Development Coordination System. This guide will get you up and running in 30 minutes.

## What is This System?

Imagine running **4 AI agents working on 4 features simultaneously**, each isolated in their own branch, without conflicts. That's what this system enables.

**Key idea:** Instead of managing code directly, you (the human) manage **boundaries between feature cells**: unblocking agents, reviewing completed work, and sequencing merges.

**Why this works:**
- Each agent has a **bounded scope** (SCOPE.json) — they can't accidentally break shared code
- Each agent works to **stopping conditions** — they don't ask for permission mid-task
- **Async coordination** — two 30-minute sessions per day is enough to manage 4 cells
- **Contracts are frozen** — shared interfaces don't change as side effects of features

---

## Prerequisites (5 minutes)

You'll need:

- **Node.js + npm** installed (v16+)
- **Git** for version control
- **GitHub CLI** (`gh`) authenticated and working
- Access to **PostgreSQL** (local or Railway)
- A text editor or IDE (e.g., VS Code, Cursor)

**Verify setup:**
```bash
node --version      # Should be v16+
npm --version       # Should be v8+
git --version       # Should work
gh auth status      # Should show you're logged in
psql --version      # Should show PostgreSQL version
```

If any of these fail, install the missing tool before continuing.

---

## Setup (10 minutes)

### 1. Clone the Repository
```bash
git clone https://github.com/nodots/auto-shop.git
cd auto-shop
```

### 2. Install Dependencies
```bash
npm install
```

This installs Husky (for pre-commit hooks) and minimatch (for scope validation).

### 3. Initialize Husky Hooks
```bash
npx husky install
```

This wires up the pre-commit hook that enforces SCOPE.json boundaries.

**Verify the hook exists:**
```bash
cat .husky/pre-commit
# Should show: node scripts/enforce-scope.js
```

### 4. Review Key Files

Open these files and read them (in order):
1. **CLAUDE.md** (this repository) — Instructions for agents and coordinators
2. **docs/ai-dev-scaling-plan.md** (longer read) — Full technical architecture
3. **templates/README.md** — How to use the templates

### 5. Database Setup

You'll need a PostgreSQL database. Two options:

**Option A: Local PostgreSQL**
```bash
createdb auto_shop_dev
export DATABASE_URL="postgresql://localhost:5432/auto_shop_dev"
```

**Option B: Railway (Cloud)**
1. Sign up at railway.app
2. Create a PostgreSQL plugin
3. Copy the connection string to your `.env.local`

---

## Your First Feature Cell (30 minutes)

Let's walk through starting and completing a simple feature cell.

### Step 1: Create Feature Branch (2 min)

```bash
git checkout -b feat/first-feature
```

### Step 2: Write SCOPE.json (3 min)

Copy the template and fill it in:

```bash
mkdir -p .auto-shop/cells/feat/first-feature
cp templates/SCOPE.json .auto-shop/cells/feat/first-feature/SCOPE.json
```

Edit `.auto-shop/cells/feat/first-feature/SCOPE.json`:
```json
{
  "feature": "first-feature",
  "project": "auto-shop",
  "branch": "feat/first-feature",
  "createdAt": "2026-02-23",
  "allowedPaths": [
    "docs/examples/**",
    "test/examples/**"
  ],
  "forbiddenPaths": [
    "contracts/**",
    "package.json",
    "tsconfig.json"
  ],
  "dependsOn": [],
  "blockedBy": [],
  "estimatedScope": "Small — example feature for documentation"
}
```

Commit:
```bash
git add .auto-shop/cells/feat/first-feature/SCOPE.json
git commit -m "Add SCOPE.json for feat/first-feature"
```

### Step 3: Provision Environment (2 min)

```bash
./scripts/provision-feature-env.sh first-feature
```

This creates a PostgreSQL schema `feat_first_feature` and writes `.env.local`.

**Verify it worked:**
```bash
psql -U postgres -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'feat_%';"
# Should show: feat_first_feature
```

### Step 4: Create GitHub Issue (2 min)

On GitHub, create a new issue using the "Feature Cell" template.

**Fill in:**
- Feature: "First Feature"
- Project: "auto-shop"
- Branch: "feat/first-feature"
- Scope summary: "Example feature for testing the system"
- Acceptance criteria:
  - [ ] Test feature compiles
  - [ ] HANDOFF.md written

**Apply labels:**
- `cell:active` (you're working on it)
- `phase-1` (this is a pilot test)

### Step 5: "Do the Work" (Simulate Agent) (10 min)

In a real scenario, an AI agent would do this. For now, we'll simulate:

**Create example files:**
```bash
mkdir -p docs/examples
cat > docs/examples/first-feature.md << 'EOF'
# First Feature Example

This is an example of a completed feature.

## What Was Done
- Created example documentation

## How It Works
This demonstrates the feature cell coordination system.
EOF

git add docs/examples/first-feature.md
git commit -m "Add first feature example documentation"
```

**Test the scope enforcement — this should be REJECTED:**
```bash
echo "unauthorized change" >> package.json
git add package.json
git commit -m "Try to modify forbidden file"
# Hook will reject this because package.json is in forbiddenPaths
```

**Undo the rejected change:**
```bash
git reset HEAD package.json
git checkout -- package.json
```

### Step 6: Write HANDOFF.md (3 min)

Copy the template:
```bash
cp templates/HANDOFF.md .auto-shop/cells/feat/first-feature/HANDOFF.md
```

Edit `.auto-shop/cells/feat/first-feature/HANDOFF.md`:
```markdown
# Handoff: First Feature

**Date:** 2026-02-23
**Status:** complete

## What Was Done
- Created example documentation in docs/examples/
- Verified SCOPE.json enforcement works
- Demonstrated full feature cell workflow

## Key Decisions Made
- Kept scope narrow (docs/ only)
- Used example content for clarity

## Files Modified
- docs/examples/first-feature.md

## Test Status
All manual verification passed

## How to Resume
Not applicable — feature is complete.
```

Commit:
```bash
git add .auto-shop/cells/feat/first-feature/HANDOFF.md
git commit -m "Add HANDOFF.md for feat/first-feature"
```

### Step 7: Open Draft PR (2 min)

Push the branch:
```bash
git push -u origin feat/first-feature
```

Create a pull request with title:
```
[READY]: First Feature — example feature cell
```

Leave it as a **draft** PR.

### Step 8: Merge the Cell (2 min)

In your coordinator role, you would:

1. Review the PR (looks good)
2. Run final tests (all pass)
3. Merge:
   ```bash
   git checkout main
   git pull origin main
   git merge --squash feat/first-feature
   git commit -m "[MERGED] First Feature Example — PR #XYZ"
   git push origin main
   ```

4. Teardown:
   ```bash
   ./scripts/teardown-feature-env.sh first-feature
   ```

5. Verify the schema is dropped:
   ```bash
   psql -U postgres -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'feat_%';"
   # Should NOT show feat_first_feature
   ```

---

## Daily Coordinator Workflow

Now that you've completed one cell, here's how you manage multiple cells.

### Morning Session (20–30 min)

**Every morning, spend 20–30 minutes on:**

```bash
# 1. Check for blocked cells
gh issue list --label cell:blocked

# 2. Review completed cells waiting for merge
gh issue list --label cell:awaiting-review

# 3. Check how many cells are active
gh issue list --label cell:active

# 4. If capacity, start a new cell
# (Create branch, write SCOPE.json, provision, create issue)

# 5. Update all issue labels
```

### Evening Session (20–30 min)

**Every evening, spend 20–30 minutes on:**

```bash
# 1. Merge completed cells (in dependency order)
# (Use docs/merge-procedure.md for step-by-step)

# 2. Teardown environments
./scripts/teardown-feature-env.sh <feature-slug>

# 3. Pre-write scope manifests for tomorrow's starts
# (Copy templates, fill in paths)

# 4. Update MERGE_QUEUE.md with current status
```

**That's it.** 4 active cells, 1 hour per day, async coordination.

---

## Troubleshooting

### "Pre-commit hook rejected my commit"

The hook is working correctly. You tried to commit a file outside `SCOPE.json` allowedPaths.

**Fix:** Either:
1. Don't commit that file (move changes to correct branch)
2. Update `SCOPE.json` to allow the file (if it's legitimate)
3. Write `BLOCKER.md` if you think the scope is wrong

### "Database provisioning failed"

```bash
# Check if PostgreSQL is running
psql -U postgres -c "SELECT 1;"  # Should return: 1

# Check environment variables
echo $DATABASE_URL

# Try manual schema creation
psql -U postgres -d auto_shop_dev -c "CREATE SCHEMA feat_my_feature;"
```

Then run the provision script again.

### "I can't see the GitHub issue templates"

The templates are in `.github/ISSUE_TEMPLATE/`. They appear on GitHub's "Create Issue" page.

If they don't show:
1. Commit the files to main branch: `git add .github/ && git commit -m "Add issue templates"`
2. Push to origin: `git push origin main`
3. Refresh GitHub (they should appear now)

### "A merge has conflicts"

This means main changed in a way that conflicts with your feature.

**Steps:**
1. Fetch latest: `git fetch origin`
2. Rebase your branch: `git checkout feat/feature-name && git rebase origin/main`
3. Resolve conflicts in your editor (look for `<<<<` and `>>>>` markers)
4. Continue rebase: `git add . && git rebase --continue`
5. Push: `git push origin feat/feature-name --force-with-lease` (force with lease is safer)
6. Try merge again

---

## Next Steps

1. **Read CLAUDE.md** — Full agent and coordinator instructions
2. **Read docs/ai-dev-scaling-plan.md** (Section 10) — Implementation phases
3. **Read docs/coordinator-workflow.md** — Detailed morning/evening checklists
4. **Set up your daily rhythm:**
   - Morning: 09:00 — Review, unblock, start new cells
   - Evening: 18:00 — Merge, plan for tomorrow

---

## Quick Reference

### Key Commands

```bash
# Start a new cell
git checkout -b feat/feature-name
cp templates/SCOPE.json SCOPE.json
# Edit SCOPE.json
git add SCOPE.json && git commit -m "Add SCOPE.json"
./scripts/provision-feature-env.sh feature-slug

# Check scope enforcement
# Try to commit out-of-scope file (hook will reject)

# Complete a cell
cp templates/HANDOFF.md HANDOFF.md
# Fill in HANDOFF.md
git add HANDOFF.md && git commit -m "Add HANDOFF.md"
git push -u origin feat/feature-name
# (Open PR on GitHub with [READY] prefix)

# Merge a cell
git fetch origin && git checkout main && git pull origin main
git merge --squash feat/feature-name
git commit -m "[MERGED] Feature Name"
git push origin main
./scripts/teardown-feature-env.sh feature-slug

# Check database schemas
psql -U postgres -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'feat_%';"
```

### Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Agent & coordinator instructions |
| `docs/ai-dev-scaling-plan.md` | Full architecture & phases |
| `docs/coordinator-workflow.md` | Daily morning/evening checklists |
| `docs/merge-procedure.md` | Step-by-step merge guide |
| `templates/SCOPE.json` | Feature scope template |
| `templates/HANDOFF.md` | Feature completion template |
| `SCOPE.json` | (on feature branches) Current cell's scope |
| `BLOCKER.md` | (on feature branches) Stopping conditions |

### Key Labels

| Label | Meaning |
|-------|---------|
| `cell:active` | Agent is working |
| `cell:blocked` | Agent stopped, waiting for coordinator |
| `cell:awaiting-review` | [READY] PR open |
| `cell:queued` | Ready to start, waiting for capacity |
| `cell:merged` | Complete |

---

## Getting Help

If you get stuck:

1. **Check `CLAUDE.md`** for instructions
2. **Check `docs/`** for detailed guides
3. **Review retrospectives** of previous cells (in `docs/retrospectives/`)
4. **Ask the team** (in Slack or team sync)

---

**Ready?** Start your first morning session. You've got this.

---

**Last updated:** 2026-02-23
**System version:** 1.0
**Coordinator:** [Your name]

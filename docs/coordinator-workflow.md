# Coordinator Daily Workflow

The coordinator manages the async queue of feature cells using two scheduled sessions per day. This document describes the exact workflow for each session.

## Core Principle

You are not directing code. You are managing boundaries between cells: unblocking agents, reviewing completed work, and sequencing merges.

---

## Morning Session (20–30 minutes)

**Time:** 09:00–09:30 (adjust to your timezone)

**Goal:** Unblock agents, approve work, start new cells

### Morning Checklist

```
□ Review cell:blocked issues (any blockers emerge overnight?)
□ Review [READY] PRs (which cells are done?)
□ Check current cell:active count (capacity for new cells?)
□ Start new cells if capacity permits
□ Update all issue labels to reflect current status
```

### Step-by-Step

#### 1. Review Blocked Cells (5 min)

Go to GitHub Issues and filter: `label:cell:blocked`

For each blocked cell:
1. Read the GitHub issue description
2. Find and read `BLOCKER.md` in the branch
3. Determine if you can unblock:
   - **Can modify SCOPE.json?** If agent just needs broader scope, edit SCOPE.json on their branch and notify them
   - **Need to create contract change cell?** Create a new issue with contract-change template, create contract/* branch, handle it, then notify agent to rebase
   - **Is dependency blocking?** Check if the dependency has completed. If so, notify agent. If not, mark expected unblock date
   - **Architectural decision needed?** Review the blocker and leave a comment with your decision. Ask agent to resume.
   - **Genuine blocker you can't resolve?** Escalate to team; update the issue with your analysis

4. If you unblock the agent:
   - Update the issue: change label from `cell:blocked` → `cell:active`
   - Comment on the issue: "Unblocked. See [branch] for SCOPE.json update" (or whatever action you took)
   - Agent resumes work

#### 2. Review Ready PRs (10 min)

Filter: `label:cell:awaiting-review`

For each [READY] PR:
1. Check CI status. Are all checks passing?
   - If no: Leave feedback on the PR and mark as not ready
   - If yes: Continue

2. Skim the HANDOFF.md. Any concerns?
   - If concerns: Leave feedback
   - If clean: Continue

3. If ready to merge:
   - Approve the PR
   - Add comment: "Approved for merge. Will merge in evening session."
   - Remove `cell:awaiting-review` label
   - Add `cell:queued` label (marks it for merge queue)

#### 3. Check Capacity (2 min)

Count cells with `cell:active` label.
- If < 4: You have capacity to start new cells
- If = 4: Do not start new cells yet. Wait for one to merge.
- If > 4: Something went wrong. Investigate.

#### 4. Start New Cells (optional, only if capacity)

If you have capacity:

1. Look at `cell:queued` issues (highest priority first)
2. Pick the next cell to start
3. For that cell:
   ```bash
   git checkout -b feat/feature-name
   cp templates/SCOPE-{project}.template.json SCOPE.json
   # Edit SCOPE.json with actual paths
   git add SCOPE.json && git commit -m "Add SCOPE.json for feat/feature-name"

   # Run provisioning script
   ./scripts/provision-feature-env.sh feature-slug
   ```

4. Update the GitHub issue:
   - Add `cell:active` label
   - Remove `cell:queued` label
   - Leave comment: "Cell started. Branch: `feat/feature-name`. Environment: `feat_feature_slug`. Agent session starting."

5. Launch agent session in Cursor/Claude Code with agent-prompt.template.md

#### 5. Update All Labels (3 min)

Walk through all open issues and verify labels are current:
- `cell:queued` → Waiting to start, no work yet
- `cell:active` → Agent is currently working
- `cell:blocked` → Agent stopped, waiting for coordinator action
- `cell:awaiting-review` → [READY] PR open
- `cell:merged` → Complete (can archive or leave for history)

### Morning Session Log Entry

After completing the morning session, add a line to MORNING_LOG.md:

```markdown
## Session - 2026-02-23 09:00 UTC

**Blocked cells handled:** 2 (Cell X unblocked, Cell Y waiting on dependency)
**Ready PRs:** 1 Cell A approved
**Active cells:** 3 (B, C, D)
**Started:** Cell E (gnubg-hints)

**Summary:** Capacity used. Next: Merge Cell A in evening.
```

---

## Evening Session (20–30 minutes)

**Time:** 18:00–18:30 (adjust to your timezone)

**Goal:** Execute merge queue, plan tomorrow's starts

### Evening Checklist

```
□ Review CI status on all PRs (any new failures?)
□ Execute merge queue (merge approved cells in dependency order)
□ Write scope manifests for tomorrow's starts
□ Reprioritize cell:queued backlog
□ Update MERGE_QUEUE.md
```

### Step-by-Step

#### 1. Review CI Status (5 min)

Filter: `label:cell:awaiting-review`

Any PRs showing CI failures?
- If yes: Leave feedback, do NOT merge
- If no: Continue to merge queue

#### 2. Execute Merge Queue (15 min)

Open `MERGE_QUEUE.md` and find "Ready for Merge" section.

For each cell in merge order:

**Pre-Merge Check:**
1. Branch is up-to-date with main? If not: ask coordinator to rebase
2. All tests passing? If not: ask agent to fix or defer merge
3. No new dependencies? If blocker exists: mark as "Waiting"

**Merge Steps:**

```bash
# Verify clean working directory
git status  # Should be clean

# Rebase onto main
git fetch origin main
git checkout feat/feature-name
git rebase origin/main

# Run final test
npm test
npm run build
npm run lint

# Merge (squash for features, merge commit for contracts)
git checkout main
git pull origin main
git merge --squash feat/feature-name
git commit -m "[MERGED] Feature name — PR #123"

# Tag
git tag -a feat/feature-name -m "Merged PR #123"

# Push
git push origin main
git push origin feat/feature-name  # Push the tag

# Teardown
./scripts/teardown-feature-env.sh feature-slug

# Close PR
# (GitHub will auto-close or do it manually)
```

**Update Merge Queue:**
1. Remove from "Ready for Merge" section
2. Add to "Merged" section with date and commit hash
3. Move any "Waiting" cells to "Ready for Merge" (if their dependency just merged)

**Timebox:** 3–5 min per merge. If a merge takes >10 min, something is wrong. Pause and investigate.

#### 3. Write Tomorrow's Scope Manifests (5 min)

Look at `cell:queued` backlog. Which cells will likely start tomorrow?

For each:
- Copy project-specific template: `cp templates/SCOPE-{project}.template.json /tmp/SCOPE-{feature}.json`
- Fill in the feature name, allowedPaths, dependencies
- Save in a working directory (don't commit yet)

Why? This saves 5 minutes in tomorrow's morning session when you go to start cells.

#### 4. Reprioritize Cell Queue (3 min)

Did any new dependencies emerge today? Did any change in priority?

Update `cell:queued` issue order:
- Move highest-priority items to the top
- Mark `dependsOn` issues clearly

#### 5. Update Documentation (2 min)

Update MERGE_QUEUE.md with:
- Cells merged today
- Current merge status
- Tomorrow's plan

### Evening Session Log Entry

Add to EVENING_LOG.md:

```markdown
## Session - 2026-02-23 18:00 UTC

**Merged cells:** 1 (Cell A — 4 min)
**Total active:** 3 (Cells B, C, D + Cell E from morning)
**Queue status:** 5 cell:queued, 0 cell:blocked

**Merges:**
- Cell A (gnubg-hints) — Merged, tagged, torn down ✓

**Prep for tomorrow:**
- Pre-wrote SCOPE for Cell F (project-emerald)
- Pre-wrote SCOPE for Cell G (a2z-claims)

**Status:** On track. No blockers. All tests passing.
```

---

## GitHub Project Board

Maintain a GitHub project board with these columns:

| Column | When to Move Here | Auto-trigger |
|--------|------------------|------|
| **Backlog** | Features not yet cell:queued | Manual |
| **Queued** | Ready to start, waiting for capacity | `cell:queued` label |
| **Active** | Agent is working | `cell:active` label |
| **Review** | [READY] PR open | `cell:awaiting-review` label |
| **Merging** | In current merge queue | Manual (move when starting merge) |
| **Done** | Merged and closed | `cell:merged` label |

Use GitHub automation to move cards based on labels. Manually move to "Merging" column during evening merge session.

---

## Common Issues & Troubleshooting

### "A cell is taking too long"

If a cell has been `cell:active` for >3 days:
1. Check if agent is still working (are there recent commits?)
2. If no commits: Agent may be stuck. Check for BLOCKER.md or reach out.
3. If commits are slow: Is the feature larger than estimated? Extend estimate.
4. If stuck with no blocker: Pair session to unblock.

### "Two cells have conflicting dependencies"

Example: Cell B needs to be done before Cell C, but Cell C needs to be done before Cell B.

**Solution:**
1. Identify the actual dependency (which one is real?)
2. Rewrite one cell's SCOPE.json to break the cycle, or
3. Merge Cell B first, then rebase Cell C, then merge Cell C

### "A merge has conflicts"

**If conflicts occur during merge:**
1. Stop the merge (don't force-push)
2. Leave comment on PR: "Merge conflict detected. Coordinator will rebase."
3. Pull the branch locally, rebase onto main, resolve conflicts, push
4. Re-run tests
5. Continue merge

**Prevention:** Run integration check in CI (rebase onto main, run tests) before marking "Ready for Merge"

### "I accidentally merged the wrong cell"

**If you realize before pushing:**
1. `git reset --soft HEAD~1` (undo the merge, keep the commit)
2. `git reset HEAD` (unstage the commit)
3. `git checkout main` (back to clean state)
4. Re-merge the correct cell

**If you already pushed:**
1. Create a revert commit: `git revert <merge-commit-hash>`
2. Push the revert
3. Notify the team
4. Re-merge the correct cell

---

## Capacity Management

**Rule of thumb:** 4 cells maximum concurrent.

- **1–2 cells:** Very safe, low risk
- **3 cells:** Comfortable, normal operation
- **4 cells:** Maximum. At capacity.
- **5+ cells:** Risk of conflicts and confusion. Do not start new cells.

If you're always at capacity:
- Some cells are finishing faster than expected (good)
- Or some cells are taking longer (investigate)
- Or you're starting cells too frequently (slow down)

Adjust your morning session decisions based on how long cells typically take.

---

## Time Tracking

Track session duration to stay within 20–30 min per session:

```
Morning Session:
  - Blocked cells: 5 min
  - Ready PRs: 10 min
  - Check capacity: 2 min
  - Start new cells: 5 min
  - Update labels: 3 min
  Total: 25 min ✓

Evening Session:
  - CI review: 5 min
  - Merge queue: 15 min
  - Tomorrow's SCOPE: 5 min
  - Reprioritize: 3 min
  - Update docs: 2 min
  Total: 30 min ✓
```

If a session consistently takes >40 min, something is wrong:
- Cells are too complex? Break them smaller.
- Blockers too frequent? Improve SCOPE.json process.
- Merges taking too long? Improve CI or merge tooling.

---

## Week-Level Review

Every Friday, spend 10 minutes to:

1. **Review retrospectives** from cells that merged this week
2. **Identify patterns:** Any repeated blockers? Scope violations?
3. **Update templates** based on learnings
4. **Adjust process** if needed (e.g., longer scope manifests, more CI checks)
5. **Team sync:** Brief update to team on what's working and what needs improvement

Example Friday log:

```markdown
## Friday Review - 2026-02-28

**Cells completed:** 6 (gnubg-hints, backgammon-core, backgammon-ai, emerald-docker, emerald-compose, claims-email)

**Retrospective patterns:**
- 3 cells violated scope (shared types) → Improved forbiddenPaths template
- 2 cells took longer than estimated → Medium and Large features taking 3–4 days
- 0 merge conflicts → Excellent dependency handling

**Improvements made:**
- Updated SCOPE-nodots-backgammon.template.json with shared types pattern
- Added note to agent-prompt: "If you think SCOPE is wrong, write BLOCKER.md"

**Next week plan:** More Medium features, continue capacity at 3–4 cells
```

---

## When to Escalate

Leave coordinator role and escalate to team if:

- Two cells have genuine, unresolvable conflicting dependencies
- Agent hits a blocker you cannot resolve (architectural, missing context)
- Multiple cells failing tests after merge
- Systematic scope violations (rethink SCOPE.json process)
- CI/CD infrastructure breaking (investigate before continuing cells)

**Escalation process:**
1. Document the issue clearly (context, what you tried, why you're stuck)
2. File GitHub issue with `escalation` label
3. Share with team
4. Pause new cell starts until resolved
5. Resume with adjustments once unblocked

---

## Remember

- **You are not directing code.** Agents make implementation decisions.
- **You are not interrupted.** Agents work to completion or stopping conditions.
- **You manage boundaries.** Scope, dependencies, merge sequencing.
- **Two sessions per day.** Morning (unblock, start) + Evening (merge, plan).
- **Async coordination.** Agents work while you're not looking. You batch-review in sessions.

This is sustainable for 4 concurrent cells indefinitely.

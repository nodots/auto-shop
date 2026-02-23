# Merge Procedure

Step-by-step guide for merging completed feature cells to main during the evening coordinator session.

## Pre-Merge Checklist

Before merging **any** cell, verify:

- [ ] GitHub PR has `[READY]` prefix in title
- [ ] All CI checks passing (green checkmarks)
- [ ] HANDOFF.md is complete and clear
- [ ] No newer dependencies have been merged that might affect this cell
- [ ] All `blockedBy` dependencies are already merged to main
- [ ] No merge conflicts will occur (CI integration check should verify this)

If any of these are not true, **do not merge**. Instead:
- Leave feedback on the PR
- Mark as not ready
- Wait for the issue to be resolved

---

## The Merge Sequence

Merges happen **in dependency order**. Always merge cells with no dependencies first, then cells that depend on them.

**Example:**
```
Cell A: no dependencies          → Merge #1
Cell B: depends on A             → Merge #2 (after A is merged)
Cell C: depends on B             → Merge #3 (after B is merged)
Cell D: no dependencies          → Merge #4 (can merge anytime, no conflicts with A–C)
```

---

## Merge Steps (Copy-Paste Friendly)

**Setup:**
```bash
# Move to the repo
cd /path/to/repo

# Ensure clean working directory
git status
# Should show: "On branch main" and "nothing to commit, working tree clean"

# If not clean, abort merge and investigate
```

**Step 1: Fetch latest from remote**
```bash
git fetch origin
```

**Step 2: Rebase feature branch onto main**
```bash
git checkout feat/feature-name
git rebase origin/main
```

If rebase conflicts occur:
- Resolve conflicts in your editor
- `git add <conflicted-files>`
- `git rebase --continue`

If rebase fails:
- `git rebase --abort`
- Return to coordinator workflow, investigate
- May need to manually coordinate with agent

**Step 3: Run final tests**
```bash
npm test
npm run build
npm run lint
```

All must pass. If any fail:
- Abort merge
- Return to coordinator: mark PR as not ready, leave feedback

**Step 4: Merge to main (squash for features)**
```bash
git checkout main
git pull origin main
git merge --squash feat/feature-name
```

`--squash` combines all commits on the feature branch into one. This keeps main history clean.

**For contract changes**, use merge commit instead:
```bash
git merge --no-ff feat/contract-name
# (preserves full history for contracts)
```

**Step 5: Create the merge commit message**

A good merge message includes:
- `[MERGED]` prefix
- Feature name
- PR number
- One-line description

**Example:**
```
[MERGED] gnubg-hints integration — PR #10

Implemented GNUBG hints lookup and display in move history.
- Added GnubgHintsProvider hook
- Integrated with MoveHistory component
- All tests passing (15 new tests)
```

**Commit:**
```bash
git commit -m "$(cat << 'EOF'
[MERGED] Feature name — PR #123

One-line description of what was implemented.
EOF
)"
```

**Step 6: Tag the commit**
```bash
git tag -a feat/feature-name -m "Merged feature-name"
```

Tags serve as markers. Makes it easy to find when a feature was merged.

**Step 7: Push to origin**
```bash
git push origin main
git push origin feat/feature-name
```

The second command pushes the tag.

**Step 8: Verify the merge**

Check GitHub:
- PR should auto-close
- Commit should appear on main branch
- CI should run on main (should pass)

**Step 9: Teardown the environment**
```bash
./scripts/teardown-feature-env.sh feature-slug
```

This:
- Drops the PostgreSQL schema (`feat_feature_slug`)
- Removes `.env.local` if it was created
- Cleans up any other feature-specific resources

Verify cleanup:
```bash
# Check that database schema is dropped
psql -d your_database -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'feat_%';"
# Should NOT show feat_feature_slug
```

**Step 10: Close the PR and update merge queue**

If not auto-closed:
```bash
gh pr close <PR-number>
```

Update `MERGE_QUEUE.md`:
1. Remove cell from "Ready for Merge" section
2. Add to "Merged" section with:
   - Merge date/time
   - Commit hash
   - Brief status (success, any notes)

Example:
```markdown
## Merged (This week)

1. feat/gnubg-hints — Merged 2026-02-23 18:05 UTC (commit bf47dfb) ✓
2. feat/backgammon-core — Merged 2026-02-23 18:10 UTC (commit 3a8c9d2) ✓
```

---

## Handling Merge Failures

### Rebase Conflicts

If `git rebase origin/main` has conflicts:

```bash
# Files in conflict will be marked with <<<< ==== >>>>
git status  # Shows conflicted files

# Open each file and resolve conflicts manually
# (Usually straightforward — choose your version or merge both)

git add <conflicted-files>
git rebase --continue
```

If resolution is complex, consult the agent or team.

### Test Failures After Rebase

If tests fail after rebasing but passed before:

This means main has changes that conflict with this feature.

**Options:**
1. **Rebase the feature branch** (agent does this) and re-run tests
2. **Defer the merge** until the conflicting main change is understood
3. **Pair on resolution** with the agent

**Do not force-merge failing tests.**

### Teardown Failures

If `teardown-feature-env.sh` fails:

```bash
# Manual cleanup
psql -d your_database -c "DROP SCHEMA feat_feature_slug CASCADE;"
rm -f .env.local.feat_feature_slug  # If exists
```

Then investigate why the script failed.

---

## Common Mistakes to Avoid

### ❌ Don't: Force-push after merging
```bash
git push origin main --force  # NEVER DO THIS
```

Once merged, leave it. If you need to undo, create a revert commit.

### ❌ Don't: Merge without running tests
```bash
git merge --squash feat/feature-name
git push origin main  # Tests never ran!
```

Always run `npm test` locally before pushing.

### ❌ Don't: Merge out of order
```bash
# Cell B depends on Cell A, but you merge B first
git merge --squash feat/b  # WRONG
```

Always check `dependsOn` in SCOPE.json. Merge dependencies first.

### ❌ Don't: Forget to teardown
```bash
git push origin main
# (forget to teardown)
# Now database schema is orphaned
```

Teardown is part of the merge procedure. Don't skip it.

### ✅ Do: Double-check before merging

```bash
# Before final merge, verify
git log origin/main..HEAD  # What commits are being merged?
git diff origin/main      # What code changes?

# If it looks right, proceed. If not, stop and investigate.
```

---

## Merge as a Service

To make this faster, consider:

1. **Git alias** for common merge commands
   ```bash
   git config --global alias.merge-feature '!git fetch origin && git checkout main && git pull origin main && git merge --squash'
   ```

2. **Merge script** that does all steps
   ```bash
   bin/auto-shop queue next  # Merges next cell in queue (if implemented)
   ```

3. **GitHub Merge Queue** (GitHub feature)
   - Set up branch protection to require merge queue
   - GitHub auto-merges when all checks pass
   - But you lose control over order, so not recommended for dependency-aware merging

---

## Record Keeping

After each merge, record in MERGE_QUEUE.md or coordinator log:

```markdown
Merge #23 — 2026-02-23 18:05 UTC

**Cell:** feat/gnubg-hints
**PR:** #10
**Commits:** 1 (squashed)
**Duration:** 4 minutes
**Status:** ✓ Success

**Tests run:**
  - npm test: 15 tests, all passing
  - npm run build: OK
  - npm run lint: OK

**Teardown:** ✓ Schema feat_gnubg_hints dropped

**Next ready:** feat/backgammon-core (depends on gnubg-hints, now unblocked)
```

This log helps debug issues and track velocity.

---

## Rollback (In Case of Disaster)

If a merged feature breaks production or main branch:

**Immediate action:**
```bash
git revert <merge-commit-hash>
git push origin main
```

This creates a **revert commit** (doesn't undo history, just adds a "undo" commit). Much safer than `git reset --hard`.

**Then:**
1. Notify team
2. Investigate the root cause
3. Agent fixes the issue on the feature branch
4. Re-merge with fixes

**Do NOT:** Use `git reset --hard` unless explicitly authorized. It rewrites history and can lose work.

---

## Summary Checklist

Before every merge:
- [ ] All CI checks passing
- [ ] Dependencies merged (if any)
- [ ] Tests passing locally
- [ ] HANDOFF.md complete
- [ ] MERGE_QUEUE.md prepared

During merge:
- [ ] Rebase without conflicts
- [ ] Final test run passes
- [ ] Merge commit message is clear
- [ ] Tag created
- [ ] Push successful

After merge:
- [ ] PR closed
- [ ] Environment teardown complete
- [ ] MERGE_QUEUE.md updated
- [ ] Log entry created

Typical merge duration: 3–5 minutes per cell

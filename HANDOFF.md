# Handoff: Cell 1 Repository Correction
Date: 2026-02-23
Status: complete

## What Was Done

Corrected Cell 1 targeting from nodots-backgammon to gnubg-hints (separate repo).

### Reversed (nodots-backgammon)
- Deleted `feat/pr-calculation-gnubg` branch (local + remote)
- Reverted husky commit `fa4942f5` on main, pushed as `e87593ed`
- Closed issue #282 with explanation

### Installed (gnubg-hints)
- husky + minimatch added to `gnubg-node-addon/package.json` devDependencies
- `prepare` script: `cd .. && husky gnubg-node-addon/.husky` (handles subdirectory layout)
- Pre-commit hook at `gnubg-node-addon/.husky/pre-commit` runs enforce-scope.js
- Hook sets `NODE_PATH=gnubg-node-addon/node_modules` so require('minimatch') resolves from git root
- enforce-scope.js copied to `gnubg-node-addon/scripts/`
- All committed and pushed to gnubg-hints main (`fbcd4c1`)

### Created (gnubg-hints)
- `feat/pr-calculation-gnubg` branch from main
- SCOPE.json at repo root with gnubg-hints-relative paths
- Committed and pushed (`781f08c`)

### Created (GitHub)
- Issue nodots/gnubg-hints#13 — Cell 1 feature-cell issue

### Updated (auto-shop)
- `docs/active-cells.md` — Cell 1 section rewritten with correct repo, paths, agent prompt
- Memory updated

## What Remains

1. **Launch Cell 1 agent session** — The branch, SCOPE.json, and issue are ready. Use the agent prompt from `docs/active-cells.md` Cell 1 section. Root the session at `/Users/kenr/Code/nodots-backgammon/packages/gnubg-hints/`.

2. **Commit auto-shop changes** — `docs/active-cells.md` has local edits not yet committed to auto-shop.

3. **gnubg-hints main has an unpushed commit** — `6dba30b fix(encoding): apply Golden Rule for board position encoding` was already ahead of origin before this session. It got pushed as part of the batch (`fbcd4c1` includes it). This is resolved.

4. **gnubg-hints stashed changes** — There's a stash from `feat/4.6.4-RC` branch (`git stash list` to check). The stash contains a modified `gnubg-node-addon/src/types.ts`. Switch back to that branch and `git stash pop` if needed.

## Key Decisions Made

- **Husky subdirectory approach:** Rather than creating a second `package.json` at the gnubg-hints root, husky was installed in `gnubg-node-addon/` with `prepare` navigating up to the git root. This keeps all Node tooling in one place.
- **NODE_PATH in pre-commit hook:** Required because git runs hooks from the repo root, but `node_modules` is in `gnubg-node-addon/`. Setting `NODE_PATH` lets Node resolve `minimatch` without changing enforce-scope.js.

## How to Resume

```bash
# Check stash from previous branch work
cd /Users/kenr/Code/nodots-backgammon/packages/gnubg-hints
git stash list

# Verify Cell 1 branch is ready
git checkout feat/pr-calculation-gnubg
cat SCOPE.json

# Launch agent session using prompt from:
# /Users/kenr/Code/auto-shop/docs/active-cells.md (Cell 1 section)

# Commit auto-shop doc changes
cd /Users/kenr/Code/auto-shop
git diff docs/active-cells.md
```

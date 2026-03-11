# Handoff: Reduce Auto Shop merge noise

Date: 2026-03-11
Status: complete
Branch: feat/reduce-auto-shop-merge-noise

## What Was Done

- Added a shared artifact resolver that prefers branch-scoped files under `.auto-shop/cells/<branch>/`
- Updated scope enforcement, handoff checks, CLI branch creation, CI, and Claude setup to use the resolver
- Preserved compatibility with legacy branches that still use root-level `SCOPE.json`, `HANDOFF.md`, or `BLOCKER.md`
- Removed stale root-level `SCOPE.json` and `HANDOFF.md` from `main` so future branches stop inheriting branch-local metadata
- Updated the main workflow docs to point at the new branch-scoped paths

## Key Decisions

- Keep backward compatibility in code, but remove legacy artifacts from `main` so new work uses the namespaced path by default
- Use `.auto-shop/cells/<branch>/...` so files stay human-readable and branch-specific without custom git merge drivers

## Files Modified

- `.auto-shop/cells/feat/reduce-auto-shop-merge-noise/SCOPE.json`
- `.auto-shop/cells/feat/reduce-auto-shop-merge-noise/HANDOFF.md`
- `.github/workflows/feature-ci.yml`
- `README.md`
- `CLAUDE.md`
- `bin/auto-shop`
- `docs/merge-procedure.md`
- `docs/quickstart.md`
- `scripts/enforce-scope.js`
- `scripts/hooks/check-handoff-on-complete.sh`
- `scripts/hooks/check-handoff-on-stop.sh`
- `scripts/hooks/enforce-scope-pretooluse.js`
- `scripts/hooks/resolve-cell-artifact.js`
- `scripts/setup-claude-infra.sh`
- `templates/README.md`

## Test Status

- Verified new branches resolve `.auto-shop/cells/<branch>/SCOPE.json`
- Verified handoff hooks now point to branch-scoped paths
- Verified legacy branches with root-level `SCOPE.json` still resolve correctly

## Notes

- Existing feature branches do not need to migrate immediately; the resolver still honors root-level artifacts if they are already present.

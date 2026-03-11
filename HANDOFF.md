# Handoff: Workflow-first UI on main

Date: 2026-03-11
Status: in progress
Branch: main

## Summary

- The workflow-first coordinator UI is now the authoritative local UI direction.
- The old bay/shop-floor UI has been removed from the main app entry path.
- Dispatch remains isolated in per-issue worktrees under `.scheduler/worktrees/...`.

## Current Focus

- Merge the workflow UI and dispatch/dashboard fixes onto `main`.
- Run the local stack from the main checkout instead of the runtime worktree.
- Keep GitHub label state and dashboard workflow state aligned.

## Verification

- `gui/client` production build should pass after the merge is finalized.
- `gui/server` TypeScript build should pass after the merge is finalized.

## Notes

- `restart-stack.sh` still reflects the older runtime-worktree model and should be updated separately.

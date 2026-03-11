# Handoff: Workflow board status cleanup

Date: 2026-03-11
Status: in progress
Branch: feat/ui-workflow-foundation

## Summary

The current branch is a broader workflow UI rewrite under `gui/`. Today's focused fix was to stop the board from implying that `stale` and `active` are peer statuses. `in-progress` remains the workflow state; inactivity is now treated as an attention signal only.

## What Changed Today

- Updated `gui/client/src/workflowHealth.ts`
  - Renamed the inactivity threshold constant to `NO_MOVEMENT_ATTENTION_MS`
  - Reworded the warning signal from generic stale language to `At Risk`
  - Changed the stale reason text to `No movement in the last 2h`
- Updated `gui/client/src/pages/Workflow.tsx`
  - Fixed `attentionCount` so it only counts `isAttention === true`
  - Changed the project summary chip text from `active need attention` to `in-progress at risk`
  - Stopped rendering the extra health chip/details for healthy in-progress items

## Important Finding

There was a real logic bug on the board: `attentionCount` was counting every in-progress issue because `getIssueHealth()` always returns an object for in-progress work, including healthy items. That is fixed now.

## Verification Done

- `npm run build --workspace=client` from `gui/` passes

## Local Run Blocker

The local app can start, but the workflow API requires `GITHUB_TOKEN` when `/api/workflow` is requested.

Relevant code:

- `gui/server/src/lib/workflow.ts`
  - `getOctokit()` throws `GITHUB_TOKEN environment variable is not set`

This variable was not present in the shell environment when checked with `printenv`.

## Tomorrow's First Steps

1. Export `GITHUB_TOKEN` in the shell used to launch the server.
2. Start the app from `gui/` with `npm run dev`.
3. Verify the workflow board against live data:
   - Healthy `in-progress` items should not show an extra warning badge
   - Only genuinely risky `in-progress` items should show `At Risk`
   - Project summary counts should reflect only risky items
4. If the UX still feels ambiguous, consider removing the positive `On Track` branch entirely from `getIssueHealth()` and returning `null` for healthy items.

## Notes

- `HANDOFF.md` previously described an older March 7 "GUI bootstrap complete" state and was stale relative to this branch.
- The worktree contains many existing in-progress GUI changes outside today's fix. Do not treat this handoff as a full branch summary.

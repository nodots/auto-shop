# Handoff: Exclude epics from the main workflow board by default

Date: 2026-03-11
Status: complete
Branch: feat/exclude-epics-from-the-main-workflow-board-by-default
Issue: https://github.com/nodots/auto-shop/issues/38

## What Was Done

- Verified that ShopFloor.tsx already excludes `epic`-labeled issues by default via `hideEpics` state (default: `true`) and the `excludeLabels` query parameter
- Verified that project counts and "Jobs Ready" metric derive from filtered repair order data, so they correctly exclude epics when hidden
- Verified that the "Hide epics" toggle in the Waiting Lot section allows re-enabling epic visibility
- Extracted `parseExcludeLabels` and `filterByExcludedLabels` into a dedicated `repairOrderFilters.ts` module for testability
- Refactored `repairOrders.ts` route to use the extracted functions (no behavior change)
- Added vitest to the server package
- Added 12 unit tests covering label parsing, case-insensitive matching, multi-label exclusion, and edge cases

## Key Decisions

- The epic filtering was already implemented in ShopFloor.tsx (default hidden, toggle to show). Rather than duplicating or restructuring, the work focused on making the filtering logic testable and adding coverage as specified in the issue scope.
- Extracted filtering into a pure-function module rather than testing through the Express route, which would require mocking Octokit and the database.

## Files Modified

| File | Change |
|------|--------|
| `gui/server/src/repairOrderFilters.ts` | New module with `parseExcludeLabels` and `filterByExcludedLabels` functions plus the `RepairOrder` type |
| `gui/server/src/routes/repairOrders.ts` | Import and use extracted functions instead of inline logic; re-export `RepairOrder` type from the shared module |
| `gui/server/src/__tests__/repairOrderFilters.test.ts` | 12 unit tests for the filtering behavior |
| `gui/server/package.json` | Added vitest devDependency and `test` script |

## Test Status

- 12 tests pass (vitest)
- Server TypeScript compiles cleanly
- Client TypeScript compiles cleanly

## Notes

- The DispatchBoard (scheduler) has its own waiting lot that fetches issues from the scheduler daemon. Epic exclusion there is a separate concern not covered by this issue.

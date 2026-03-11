# Handoff: Exclude epics from the main workflow board by default

Date: 2026-03-11
Status: complete
Branch: feat/exclude-epics-from-the-main-workflow-board-by-default
Issue: https://github.com/nodots/auto-shop/issues/38

## What Was Done

- Added `excludeLabels` query parameter to the `/api/repair-orders` endpoint, accepting a comma-separated list of label names to exclude
- Server-side filtering removes issues whose labels match any excluded label (case-insensitive)
- Added "Hide epics" toggle (Switch) to the ShopFloor Waiting Lot header, defaulting to on
- The React Query key includes the `hideEpics` state so toggling triggers a fresh fetch
- Updated `fetchRepairOrders` in the client API to pass `excludeLabels` when applicable
- Bay Board counts and the "Jobs Ready" metric automatically reflect the filtered data since they derive from the same query

## Key Decisions

- Filtering is done server-side (after GitHub API fetch but before response) rather than client-side, so counts are consistent without extra logic
- The `excludeLabels` param is generic (comma-separated label list) rather than a hard-coded `?hideEpics=true` flag, making it reusable for other label-based filters
- The toggle defaults to on (epics hidden) per the issue requirements

## Files Modified

| File | Change |
|------|--------|
| `gui/server/src/routes/repairOrders.ts` | Parse `excludeLabels` query param and filter issues before response |
| `gui/client/src/serviceDeskApi.ts` | Add `excludeLabels` option to `fetchRepairOrders` params |
| `gui/client/src/pages/ShopFloor.tsx` | Add `hideEpics` state (default true), toggle Switch in Waiting Lot, pass `excludeLabels` to query |

## Test Status

- Server TypeScript compiles cleanly (`tsc --noEmit`)
- Client TypeScript compiles cleanly (`tsc --noEmit`)
- Client production build succeeds (`vite build`)
- No test framework configured in the project

## Notes

- The server caches GitHub API responses for 5 minutes. Toggling "Hide epics" triggers a new API call to the Express server, but the GitHub data may come from cache. The filtering happens after cache retrieval, so the toggle is responsive even with cached data.

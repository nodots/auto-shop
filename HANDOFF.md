# Handoff: Add web GUI for coordinator workflow management

Date: 2026-03-07
Status: complete
Branch: claude/add-web-gui-coordinator-Kyizj
Issue: https://github.com/nodots/auto-shop/issues/29

## What Was Done

- Created `gui/` directory with Express + TypeScript API server and React + TypeScript (Vite) client
- **Server** (`gui/server/`):
  - Express API on port 3400 with CORS support
  - PostgreSQL schema: `projects`, `packages`, `cells`, `cell_status_history`, `merge_queue` tables
  - Routes: `/api/projects` (list, sync from projects.json, raw read), `/api/cells` (CRUD, status transitions, filtering), `/api/dashboard` (aggregated data), `/api/merge-queue` (ordered queue with reordering), `/api/git` (read files from branches via `git show`, list feature branches), `/api/health`
  - Graceful degradation when database is unavailable
  - Serves built client in production mode
- **Client** (`gui/client/`):
  - Vite dev server on port 5473 with API proxy to Express
  - Dashboard page: capacity gauge (0-4 active cells), status counts with links, blocked cell alerts, ready PRs list, recent activity timeline
  - Cells list page: filterable by status, sortable table
  - Cell detail page: scope/blocker/handoff/history tabs, status transition buttons with optional notes, delete (teardown)
  - Cell creation form: auto-generates branch name from feature, project selector from projects.json
  - Projects page: displays all projects from projects.json with packages, sync-to-DB button
  - Merge queue page: ordered list with up/down reordering and remove buttons
  - Tailwind CSS styling, responsive layout
  - TanStack React Query for data fetching with cache invalidation

## Key Decisions

- **All code under `gui/`**: No modifications to existing files, as specified in the issue
- **Filesystem + GitHub remain source of truth**: DB is a cache/sync layer; `/api/projects/raw` reads directly from `projects.json`
- **No @dnd-kit or @monaco-editor**: Used simpler up/down buttons for queue reordering and `<pre>` for scope JSON display to keep the initial implementation focused. These can be added in Phase 4-5.
- **No @octokit/rest integration yet**: Listed as a dependency in the issue but not wired up in Phase 1. The git routes use `git show` for local branch inspection.
- **Graceful DB degradation**: Server starts even without PostgreSQL, logging a warning. API routes that need the DB will return errors, but `/api/projects/raw` and `/api/git/*` work without DB.

## Files Modified

All new files under `gui/` — no existing files were modified.

| Path | Purpose |
|------|---------|
| `gui/.gitignore` | Ignore node_modules, dist, tsbuildinfo |
| `gui/server/package.json` | Server dependencies and scripts |
| `gui/server/tsconfig.json` | TypeScript config for server |
| `gui/server/src/index.ts` | Express app entry point |
| `gui/server/src/db.ts` | PostgreSQL pool and schema initialization |
| `gui/server/src/routes/projects.ts` | Project list, sync, and raw read routes |
| `gui/server/src/routes/cells.ts` | Cell CRUD and status transitions |
| `gui/server/src/routes/dashboard.ts` | Aggregated dashboard data |
| `gui/server/src/routes/mergeQueue.ts` | Merge queue management |
| `gui/server/src/routes/git.ts` | Git file read and branch listing |
| `gui/client/package.json` | Client dependencies and scripts |
| `gui/client/tsconfig.json` | TypeScript config for client |
| `gui/client/vite.config.ts` | Vite config with API proxy |
| `gui/client/tailwind.config.js` | Tailwind CSS config |
| `gui/client/postcss.config.js` | PostCSS config for Tailwind |
| `gui/client/index.html` | HTML entry point |
| `gui/client/src/main.tsx` | React app entry with routing |
| `gui/client/src/index.css` | Tailwind directives |
| `gui/client/src/api.ts` | API client with TypeScript types |
| `gui/client/src/components/Layout.tsx` | App shell with navigation |
| `gui/client/src/components/StatusBadge.tsx` | Colored status badge component |
| `gui/client/src/pages/Dashboard.tsx` | Dashboard with capacity, alerts, activity |
| `gui/client/src/pages/CellsList.tsx` | Filterable cells table |
| `gui/client/src/pages/CellDetail.tsx` | Cell detail with tabs and transitions |
| `gui/client/src/pages/CellCreate.tsx` | Cell creation form |
| `gui/client/src/pages/Projects.tsx` | Project registry display |
| `gui/client/src/pages/MergeQueue.tsx` | Ordered merge queue |

## Test Status

- Server TypeScript compiles cleanly (`tsc --noEmit`)
- Client TypeScript compiles cleanly (`tsc --noEmit`)
- Client production build succeeds (`vite build`)
- No test framework configured (project is documentation/coordination — no existing test infrastructure)

## Notes

- The issue specifies 5 implementation phases. This PR covers Phase 1 (Foundation) and Phase 2-3 core features (cell detail, creation, status transitions). Phases 4-5 (drag-and-drop, Monaco editor, GitHub API integration, session checklists, mobile polish) can be follow-up work.
- To run locally: `cd gui/server && npm run dev` and `cd gui/client && npm run dev`. Requires PostgreSQL with a `auto_shop_gui` database (or set `DATABASE_URL`).

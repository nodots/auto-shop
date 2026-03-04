# Handoff: ELO Ratings + Cross-Repo Workflow
Date: 2026-03-03
Status: blocked

## What Was Done

### auto-shop (main, pushed)

1. **New: `docs/cross-repo-features.md`** — documents the pattern for features spanning types -> core -> api: same branch name, dependency-order build/PR/merge, migration handling.
2. **Updated: `docs/merge-procedure.md`** — fixed stale branch flow table (nodots-backgammon targets `feat/4.6.4-RC`, not `development`; removed gnubg-hints row). Added cross-reference to cross-repo doc.
3. **Updated: `CLAUDE.md`** — added cross-repo doc to the documentation map.

### nodots-backgammon (feat/elo-ratings branches, pushed, PRs open)

ELO rating system implemented across three packages:

**types** (PR [#53](https://github.com/nodots/nodots-backgammon-types/pull/53)):
- New `src/elo.ts`: `EloConfig`, `EloCalculationResult`, `EloRating`, `DEFAULT_ELO_CONFIG`
- Barrel export added to `src/index.ts`
- Builds cleanly

**core** (PR [#104](https://github.com/nodots/nodots-backgammon-core/pull/104)):
- New `src/Services/EloCalculator.ts`: `expectedScore`, `getKFactor`, `calculate`, `prToElo`
- New `src/Services/__tests__/EloCalculator.test.ts`: 19 tests, all passing
- Barrel export added to `src/Services/index.ts`
- Builds cleanly

**api** (PR [#52](https://github.com/nodots/nodots-backgammon-api/pull/52)):
- 3 ELO columns added to UsersTable (`eloRating`, `eloGamesPlayed`, `eloUpdatedAt`)
- New `EloHistoryTable` with schema, operations, barrel exports
- New `EloRouter` with 4 GET endpoints (user rating, history, leaderboard, game results)
- `calculateAndStoreElo` function — auto-fires on game completion (fire-and-forget)
- Router mounted on both main and test routers
- Robot ELO seeding via `EloCalculator.prToElo(averagePR)` in `seed-robots.ts`
- Drizzle migration: `0002_aromatic_the_hunter.sql`
- Fixed: `.env.example` updated from v4.5 to v4.6
- Fixed: `game.winner` polymorphism (can be string or object from JSONB)
- Builds cleanly

### Verification completed

- Migration applied to local dev DB (3 columns on users, elo_history table with indexes/FKs)
- Robot ELO ratings verified correct (Grandmaster 2100 down to nbg-bot-v1 1100)
- All 4 ELO endpoints return correct data
- `calculateAndStoreElo` tested on a completed game: correctly saves history, updates human rating, skips robot update, idempotent on re-run
- Core tests: 19/19 pass
- All three packages build cleanly on Node 20
- Test ELO data cleaned up from dev DB after verification

### Branch state fixes applied

All three `feat/elo-ratings` branches were reset from `development` (stale) to `feat/4.6.4-RC` (correct base) before implementing.

## Current Blockers

### Client cannot log in locally

The web client at http://localhost:5437/ loads and fetches resources (200s/304s in network tab) but Auth0 login fails. This is NOT caused by ELO changes. Investigation found:

- Client `.env` is a symlink to `.env.development` — this file was missing (gitignored, local-only). Created it from `.env.example`.
- `.env.example` has `VITE_AUTH0_CLIENT_SECRET=your-client-secret` (placeholder). This may need the real secret, or Auth0 SPA config may need `http://localhost:5437` added as an allowed callback URL in the Auth0 dashboard.
- The Auth0 error page ("Oops, something went wrong") appeared on `nodots-backgammon-dev.us.auth0.com/authorize` — this is an Auth0-side configuration issue.
- API `.env.development` had stale `API_VERSION_PATH=/api/v4.5` — corrected to `/api/v4.6`.

**Action needed:** Check Auth0 dashboard for `nodots-backgammon-dev` application:
1. Allowed Callback URLs — must include `http://localhost:5437`
2. Allowed Logout URLs — must include `http://localhost:5437`
3. Allowed Web Origins — must include `http://localhost:5437`

### ELO PRs not yet merged

Merge order (strict):
1. types PR#53
2. core PR#104
3. api PR#52

All target `feat/4.6.4-RC`. Do not merge out of order.

## Files Modified (nodots-backgammon)

| Package | File | Action |
|---------|------|--------|
| types | `src/elo.ts` | New |
| types | `src/index.ts` | Edit — barrel export |
| core | `src/Services/EloCalculator.ts` | New |
| core | `src/Services/__tests__/EloCalculator.test.ts` | New |
| core | `src/Services/index.ts` | Edit — barrel export |
| api | `src/db/Users/schema.ts` | Edit — 3 ELO columns |
| api | `src/db/EloHistory/schema.ts` | New |
| api | `src/db/EloHistory/operations.ts` | New |
| api | `src/db/EloHistory/index.ts` | New |
| api | `src/db/schema.ts` | Edit — EloHistory export |
| api | `src/routes/elo.ts` | New |
| api | `src/routes/games.ts` | Edit — ELO hook on completion |
| api | `src/index.ts` | Edit — mount EloRouter |
| api | `src/utils/seed-robots.ts` | Edit — seed robot ELO |
| api | `.env.example` | Edit — v4.5 to v4.6 |
| api | `drizzle/0002_aromatic_the_hunter.sql` | New |
| api | `drizzle/meta/_journal.json` | Edit |
| api | `drizzle/meta/0002_snapshot.json` | Edit |

## Files Modified (auto-shop)

| File | Action |
|------|--------|
| `docs/cross-repo-features.md` | New |
| `docs/merge-procedure.md` | Edit — branch flow table, cross-repo reference |
| `CLAUDE.md` | Edit — doc map entry |

## Local Environment State

- `packages/api/.env` — created from `.env.example` (v4.6), gitignored
- `packages/api/.env.development` — corrected to v4.6, gitignored
- `packages/client/.env.development` — created from `.env.example`, gitignored (symlinked from `.env`)
- Migration `0002_aromatic_the_hunter.sql` applied to `nodots_backgammon_dev` DB
- Test ELO data cleaned up (elo_history emptied, e2e-tests user rating reset to 1500)

## How to Resume

### Fix Auth0 (required for client testing)
1. Log into Auth0 dashboard at https://manage.auth0.com
2. Find the `nodots-backgammon-dev` application
3. Add `http://localhost:5437` to Allowed Callback URLs, Logout URLs, and Web Origins
4. Save

### Test locally
```bash
nvm use 20
cd packages/api && node -r ts-node/register/transpile-only src/index.ts &
cd ../client && npx vite &
# Open http://localhost:5437, log in, play a game to completion
# Verify: curl http://localhost:3000/api/v4.6/elo/leaderboard | python3 -m json.tool
```

### Merge PRs (after client testing passes)
Merge in strict order against `feat/4.6.4-RC`:
1. types PR#53
2. core PR#104
3. api PR#52

See `docs/cross-repo-features.md` for the full procedure.

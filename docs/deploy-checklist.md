# Deploy Checklist: nodots-backgammon on Railway

Target: Get nodots-backgammon (API + Client) running on Railway with Railway PostgreSQL, auto-shop cell infrastructure, then launch Cell 1 (gnubg-hints PR calculation).

---

## Decisions Made

- **API Dockerfile**: Rewrite to workspace-root pattern matching the client Dockerfile
- **gnubg-hints in Docker**: API uses gnubg-hints at runtime — include native build deps (current npm package uses stubs, no .bd files needed yet; Cell 1 will add real gnubg integration)
- **Database**: Railway PostgreSQL (same-network, no cross-provider latency)
- **Preview environments**: Skip for now — production deploy only, add previews later
- **API version**: `/api/v4.6`

---

## Phase 0: Prerequisites

- [ ] Railway CLI authenticated (`railway whoami` → kenr@nodots.com)
- [ ] GitHub CLI authenticated (`gh auth status`)
- [ ] Access to Auth0 dashboard (nodots-backgammon tenant)
- [ ] nodots-backgammon repo cloned and on main

---

## Phase 1: Rewrite API Dockerfile

The current API Dockerfile uses `node:18-alpine` and installs from `packages/api/` only. It needs the full workspace context to resolve `file:` dependencies, plus native build tools for gnubg-hints.

- [ ] Update `packages/api/Dockerfile` to:
  - Use `node:20-alpine` (match client)
  - Install `python3 make g++` for node-gyp (gnubg-hints native addon)
  - Copy all packages from workspace root
  - Strip husky prepare scripts before install
  - Install full workspace (gnubg-hints install script runs node-gyp rebuild)
  - Build in order: types → core → ai → api-utils → api
  - Run `npm run start:prod` (which runs migrations then starts)
- [ ] Test locally: `docker build -f packages/api/Dockerfile .` from workspace root
- [ ] Commit and push

---

## Phase 2: Railway Services

Railway project `nodots-backgammon-api` exists but has no services.

### PostgreSQL Service

- [ ] In Railway dashboard, add a PostgreSQL plugin/service to the project
- [ ] Note the `DATABASE_URL` Railway generates (available as `${{Postgres.DATABASE_URL}}`)

### API Service

- [ ] Create a new service in the `nodots-backgammon-api` project
- [ ] Connect it to the `nodots/nodots-backgammon` GitHub repo
- [ ] Set Dockerfile path: `packages/api/Dockerfile`
- [ ] Leave root directory blank (workspace root)
- [ ] Set deploy branch: `main`

**API environment variables:**

- [ ] `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (Railway variable reference)
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `3000`
- [ ] `AUTH0_DOMAIN` = `dev-8ykjldydiqcf2hqu.us.auth0.com`
- [ ] `AUTH0_CLIENT_ID` — from Auth0 dashboard
- [ ] `AUTH0_CLIENT_SECRET` — from Auth0 dashboard
- [ ] `AUTH0_AUDIENCE` = `nodots-backgammon-api`
- [ ] `JWT_SECRET` — generate a secure value
- [ ] `ROBOT_USER_ID` = `767347c0-6a20-4998-8649-4b8bc56192c6`
- [ ] `ROBOT_MOVE_DELAY_MS` = `2000`
- [ ] `API_VERSION_PATH` = `/api/v4.6`

### Client Service

- [ ] Create a second service in the same Railway project
- [ ] Connect it to the same `nodots/nodots-backgammon` GitHub repo
- [ ] Set Dockerfile path: `packages/client/Dockerfile`
- [ ] Leave root directory blank (workspace root)
- [ ] Set deploy branch: `main`

**Client environment variables (build-time, VITE_ prefix):**

- [ ] `VITE_AUTH0_DOMAIN` = `dev-8ykjldydiqcf2hqu.us.auth0.com`
- [ ] `VITE_AUTH0_CLIENT_ID` — web client ID from Auth0
- [ ] `VITE_AUTH0_AUDIENCE` = `nodots-backgammon-api`
- [ ] `VITE_API_URL` = `https://${{api.RAILWAY_PUBLIC_DOMAIN}}`
- [ ] `VITE_REST_PATH` = `/api`
- [ ] `VITE_API_VERSION` = `v4.6`
- [ ] `VITE_WS_URL` = `wss://${{api.RAILWAY_PUBLIC_DOMAIN}}/ws`

### Auth0 Configuration

- [ ] Add the Railway API public URL to Auth0 allowed callback URLs
- [ ] Add the Railway Client public URL to Auth0 allowed callback URLs
- [ ] Add the Railway Client public URL to Auth0 allowed logout URLs
- [ ] Add the Railway Client public URL to Auth0 allowed web origins

---

## Phase 3: Database Migration

Migrate data from Render PostgreSQL to Railway PostgreSQL.

- [ ] Export schema and data from Render: `pg_dump $RENDER_DATABASE_URL > backup.sql`
- [ ] Import into Railway: `psql $RAILWAY_DATABASE_URL < backup.sql`
- [ ] Verify row counts match on key tables
- [ ] Or: skip data migration if starting fresh — Drizzle migrations will create schema on first `start:prod`

---

## Phase 4: Deploy and Verify

### API verification

- [ ] Railway deploy succeeds (check build logs)
- [ ] gnubg-hints native addon compiled in build stage
- [ ] Drizzle migrations run on startup (`railway:migrate` in `start:prod`)
- [ ] API health endpoint responds: `curl https://<api-url>/api/v4.6/health`
- [ ] Auth0 token validation works (test with a real token)
- [ ] WebSocket endpoint accessible at `wss://<api-url>/ws`

### Client verification

- [ ] Railway deploy succeeds
- [ ] Client loads at the Railway-generated URL
- [ ] Auth0 login flow works (redirect → callback → authenticated)
- [ ] Client connects to API (network tab shows successful API calls)
- [ ] WebSocket connection established

### Cross-service verification

- [ ] Client `VITE_API_URL` resolves to the API service URL via Railway variable reference
- [ ] CORS allows the client origin
- [ ] Full login → create game → play a move flow works end-to-end

---

## Phase 5: Auto-Shop Cell Infrastructure

### gnubg-hints (already done)

- [x] `.claude/` hooks and agent committed to main
- [x] `feat/pr-calculation-gnubg` rebased onto main
- [x] Hooks verified (PreToolUse, TaskCompleted, Stop)

### nodots-backgammon

- [ ] Run: `auto-shop infra setup /Users/kenr/Code/nodots-backgammon nodots-backgammon`
- [ ] Edit `.claude/agents/cell-worker-nodots-backgammon.md` with project-specific context:
  - Monorepo structure (packages/types, core, ai, api, client, etc.)
  - Build: `npm run build` (runs `scripts/build-all.sh`)
  - Test: `npm test --workspaces`
  - Lint: `npm run lint --workspaces`
  - TypeScript strict mode, Node 20, npm workspaces
- [ ] Commit `.claude/` to nodots-backgammon main
- [ ] Push to origin

---

## Phase 6: Launch Cell 1

### Verify branch state

- [ ] `feat/pr-calculation-gnubg` exists on gnubg-hints with SCOPE.json
- [ ] Branch is rebased onto latest main (includes .claude/ infrastructure)
- [ ] gnubg-hints issue #13 open and labeled

### Launch agent session

- [ ] Open Claude Code in `/Users/kenr/Code/nodots-backgammon/packages/gnubg-hints/`
- [ ] Switch to `feat/pr-calculation-gnubg`
- [ ] Invoke `cell-worker-gnubg` agent or paste the agent prompt from `docs/active-cells.md`
- [ ] Verify PreToolUse hook fires on first edit (check that it allows in-scope files)

### Monitor

- [ ] Agent is working within SCOPE.json boundaries
- [ ] No scope violations in hook output
- [ ] When agent finishes: HANDOFF.md or BLOCKER.md exists
- [ ] If complete: draft PR opened with `[READY]:` prefix

---

## Phase 7: Post-Deploy Cleanup

- [ ] Update `docs/active-cells.md` with Railway URLs
- [ ] Add Railway service URLs to issue #13 comment
- [ ] Update `docs/railway-integration.md` to reflect Railway PG instead of Render
- [ ] Close auto-shop issue #8 (Railway) if fully configured
- [ ] Record Railway service URLs and project details in auto-shop MEMORY.md

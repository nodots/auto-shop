# Deploy Checklist: nodots-backgammon on Railway

Target: Get nodots-backgammon (API + Client) running on Railway with auto-shop cell infrastructure, then launch Cell 1 (gnubg-hints PR calculation).

---

## Phase 0: Prerequisites

- [ ] Railway CLI authenticated (`railway whoami` → kenr@nodots.com)
- [ ] GitHub CLI authenticated (`gh auth status`)
- [ ] Access to Auth0 dashboard (nodots-backgammon tenant)
- [ ] Render PostgreSQL connection string available
- [ ] nodots-backgammon repo cloned and on main

---

## Phase 1: Railway Services

Railway project `nodots-backgammon-api` exists but has no services.

### API Service

- [ ] In Railway dashboard, create a new service in the `nodots-backgammon-api` project
- [ ] Connect it to the `nodots/nodots-backgammon` GitHub repo
- [ ] Set Dockerfile path: `packages/api/Dockerfile`
- [ ] Leave root directory blank (workspace root)
- [ ] Set deploy branch: `main`

**API environment variables:**

- [ ] `DATABASE_URL` — Render PostgreSQL connection string
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

---

## Phase 2: Fix the API Dockerfile

The current API Dockerfile uses `node:18-alpine` and runs `npm ci` from the package root — but it needs the full workspace context (same approach as the client Dockerfile) to resolve `file:` dependencies on sibling packages. And gnubg-hints requires native compilation.

- [ ] Update `packages/api/Dockerfile` to build from workspace root (copy all packages, install workspace)
- [ ] Handle gnubg-hints native addon build (needs `python3`, `make`, `g++` in the build stage)
- [ ] Ensure build order: types → api-utils → core → ai → api
- [ ] Upgrade to `node:20-alpine` to match client Dockerfile
- [ ] Test `docker build -f packages/api/Dockerfile .` from workspace root locally
- [ ] Commit and push the Dockerfile update

---

## Phase 3: Deploy and Verify

### API verification

- [ ] Railway deploy succeeds (check build logs)
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

## Phase 4: Preview Environments

- [ ] In Railway project settings, enable "Create preview deployments from pull requests"
- [ ] Set trigger: "Pull Request opened"
- [ ] Verify preview env vars inherit from production
- [ ] Override `VITE_API_URL` in preview to use `${{api.RAILWAY_PUBLIC_DOMAIN}}` (should auto-resolve per environment)

### Test preview environments

- [ ] Create a test branch and PR
- [ ] Confirm Railway spins up preview API + Client
- [ ] Verify preview Client talks to preview API (not production)
- [ ] Close PR and confirm preview is destroyed

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
- [ ] Update `docs/railway-integration.md` checklist items to reflect actual state
- [ ] Close auto-shop issue #8 (Railway) if fully configured

---

## Known Issues / Decisions Needed

1. **API Dockerfile needs a rewrite.** Current Dockerfile installs from `packages/api/` only — does not have workspace context. The client Dockerfile already does this correctly; follow that pattern.

2. **gnubg-hints native addon in Docker.** The API depends on gnubg-hints which builds a C/C++ N-API addon via node-gyp. The Docker build stage needs `python3`, `make`, `g++` (alpine: `build-base python3`). The gnubg evaluation engine `.bd` files may also need to be included.

3. **Database: Render vs Railway.** Current plan uses Render PostgreSQL. Railway also offers PostgreSQL. Decide whether to keep Render or migrate. Using Render means Railway → Render network latency.

4. **Auth0 callback URLs.** Railway preview environments generate dynamic URLs. Auth0 needs wildcard or per-preview callback URLs configured. Check if Auth0 supports wildcard patterns for callback URLs.

5. **API version mismatch.** `.env.example` shows `API_VERSION_PATH=/api/v4.0` but `railway-integration.md` shows `/api/v4.6`. Confirm correct version.

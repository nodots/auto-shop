# Deploy Checklist: nodots-backgammon on Railway

Starting from scratch. New Railway project, Railway PostgreSQL, API + Client services.

All steps use the Railway CLI unless marked **[Dashboard]**.

## What already exists

- Both Dockerfiles are written and committed (`packages/api/Dockerfile`, `packages/client/Dockerfile`)
- Both `railway.json` files are committed
- Railway CLI is authenticated (`railway whoami` → kenr@nodots.com)
- An old empty project `nodots-backgammon-api` exists on Railway (delete it)

## Auth0 tenants

There are two Auth0 tenants. Pick one for Railway.

| Tenant | Domain                              | Client uses        |
| ------ | ----------------------------------- | ------------------ |
| Dev    | `dev-8ykjldydiqcf2hqu.us.auth0.com` | `.env.development` |
| Prod   | `nodots-backgammon.us.auth0.com`    | `.env.production`  |

The dev tenant API client ID is `qdkexB56guy3NFhWL3hH1vqB2zqDMwtk`. The prod tenant client IDs are in the Auth0 dashboard.

---

## Phase 1: Delete old project, create new one

- [ ] **[Dashboard]** Delete the empty `nodots-backgammon-api` project (no CLI delete command)
- [ ] Create the new project:
  ```bash
  railway init --name nodots-backgammon
  ```
- [ ] Link the local directory to the project:
  ```bash
  railway link --project nodots-backgammon
  ```

---

## Phase 2: Add PostgreSQL

- [ ] Add a Postgres database to the project:
  ```bash
  railway add --database postgres
  ```
- [ ] Note: other services reference this as `${{Postgres.DATABASE_URL}}` — Railway resolves the actual connection string at deploy time. You never need to copy/paste the raw URL.

---

## Phase 3: Create API service

- [ ] Create the service linked to the GitHub repo:
  ```bash
  railway add --service api --repo nodots/nodots-backgammon
  ```
- [ ] **[Dashboard]** Settings → Build → Dockerfile path: `packages/api/Dockerfile`, Root directory: leave blank (no CLI flag for Dockerfile path)
- [ ] Generate a public domain:
  ```bash
  railway domain --service api
  ```
- [ ] Set environment variables:
  ```bash
  railway variables --service api \
    --set "DATABASE_URL=\${{Postgres.DATABASE_URL}}" \
    --set "NODE_ENV=production" \
    --set "PORT=3000" \
    --set "AUTH0_DOMAIN=<from Auth0 dashboard — see tenant table above>" \
    --set "AUTH0_CLIENT_ID=<from Auth0 dashboard>" \
    --set "AUTH0_CLIENT_SECRET=<from Auth0 dashboard>" \
    --set "AUTH0_AUDIENCE=<match the API identifier in Auth0>" \
    --set "JWT_SECRET=$(openssl rand -hex 32)" \
    --set "ROBOT_USER_ID=767347c0-6a20-4998-8649-4b8bc56192c6" \
    --set "ROBOT_MOVE_DELAY_MS=2000" \
    --set "API_VERSION_PATH=/api/v4.6" \
    --set "CORS_ALLOWED_ORIGINS=<client public URL once known>"
  ```

---

## Phase 4: Create Client service

- [ ] Create the service linked to the GitHub repo:
  ```bash
  railway add --service client --repo nodots/nodots-backgammon
  ```
- [ ] **[Dashboard]** Settings → Build → Dockerfile path: `packages/client/Dockerfile`, Root directory: leave blank
- [ ] Generate a public domain:
  ```bash
  railway domain --service client
  ```
- [ ] Set environment variables (build-time — baked into the Vite build, changing them requires a redeploy):
  ```bash
  railway variables --service client \
    --set "VITE_AUTH0_DOMAIN=<must match API's AUTH0_DOMAIN>" \
    --set "VITE_AUTH0_CLIENT_ID=<web app client ID from Auth0 — different from API client ID>" \
    --set "VITE_AUTH0_AUDIENCE=<must match API's AUTH0_AUDIENCE>" \
    --set "VITE_API_URL=https://\${{api.RAILWAY_PUBLIC_DOMAIN}}" \
    --set "VITE_REST_PATH=/api" \
    --set "VITE_API_VERSION=v4.6" \
    --set "VITE_WS_URL=wss://\${{api.RAILWAY_PUBLIC_DOMAIN}}/ws"
  ```

---

## Phase 5: Update CORS

Once both services have public domains:

- [ ] Set the API's CORS origin to the client's domain:
  ```bash
  railway variables --service api \
    --set "CORS_ALLOWED_ORIGINS=https://<client-domain>"
  ```

---

## Phase 6: Auth0 configuration

**[Dashboard]** — all steps are in the Auth0 dashboard for whichever tenant you chose:

- [ ] Allowed Callback URLs: add the client's Railway URL (e.g. `https://client-production-xxxx.up.railway.app/callback`)
- [ ] Allowed Logout URLs: add the client's Railway URL
- [ ] Allowed Web Origins: add the client's Railway URL
- [ ] Allowed Origins (CORS): add the client's Railway URL

---

## Phase 7: Database

Two options:

### Option A: Fresh start (Drizzle creates schema)

- [ ] Do nothing. The API's `start:prod` script runs `railway:migrate` which runs Drizzle migrations on startup. First deploy creates all tables.

### Option B: Migrate from Render

- [ ] `pg_dump $RENDER_DATABASE_URL > backup.sql`
- [ ] Get Railway database connection string from Railway dashboard (raw, not the variable reference)
- [ ] `psql $RAILWAY_DATABASE_URL < backup.sql`
- [ ] Verify row counts on key tables

---

## Phase 8: Deploy and verify

### API

- [ ] Trigger a deploy (or it auto-deploys from main)
- [ ] Watch build logs:
  ```bash
  railway logs --service api --build
  ```
- [ ] Watch deploy logs:
  ```bash
  railway logs --service api --deployment
  ```
- [ ] gnubg-hints native addon must compile (check build logs)
- [ ] Drizzle migrations must run (check deploy logs)
- [ ] Test health:
  ```bash
  curl https://<api-domain>/api/v4.6/health
  ```
- [ ] Test WebSocket: `wscat -c wss://<api-domain>/ws` (or browser devtools)

### Client

- [ ] Confirm deploy succeeds (nginx serving static files)
- [ ] Open client URL in browser — app loads
- [ ] Auth0 login flow works (redirect → callback → session)
- [ ] Network tab shows API calls hitting the Railway API domain
- [ ] WebSocket connects

### End-to-end

- [ ] Log in → create a game → make a move
- [ ] Robot player responds (uses `ROBOT_USER_ID`)

---

## After it works

- [ ] Record the Railway project name, API URL, and Client URL in auto-shop MEMORY.md
- [ ] Close auto-shop issue #8
- [ ] Update `docs/railway-integration.md` with actual URLs

# Railway Integration: Preview Environments for AI Dev Cells

**Objective:** Each feature cell (one branch, one AI agent) gets its own isolated Railway preview environment with both API and Client services, so multiple cells can work concurrently without conflicts.

**Status:** Configured for nodots-backgammon

---

## Architecture

### Workspace Root Approach

Railway is linked to the `nodots-backgammon` monorepo root. Both services build from the workspace root because they depend on sibling packages via `file:` references:

```
nodots-backgammon/              <-- Railway project root
├── packages/
│   ├── api/
│   │   ├── Dockerfile          <-- Builds from workspace root context
│   │   └── railway.json
│   ├── client/
│   │   ├── Dockerfile          <-- Builds from workspace root context
│   │   └── railway.json
│   ├── types/                  <-- file: dependency of both
│   ├── api-utils/              <-- file: dependency of both
│   ├── core/                   <-- file: dependency of API
│   ├── ai/                     <-- file: dependency of API
│   └── gnubg-hints/            <-- file: dependency of API (native addon)
└── package.json                <-- npm workspaces root
```

Both Dockerfiles use the workspace root as build context, copy all packages, install the full workspace, then build only the dependency chain each service needs.

### How Preview Environments Map to Feature Cells

| Feature Cell | Branch | Railway Preview |
|---|---|---|
| Cell A: gnubg-hints | `feat/gnubg-hints` | API-A + Client-A (unique URLs) |
| Cell B: backgammon-core | `feat/backgammon-core` | API-B + Client-B (unique URLs) |
| Cell C: backgammon-ai | `feat/backgammon-ai` | API-C + Client-C (unique URLs) |

Each PR triggers an isolated preview with its own API and Client instances. Cells do not share infrastructure.

---

## Railway Project Setup

### Step 1: Initialize the Project

```bash
cd /Users/kenr/Code/nodots-backgammon
railway init --name nodots-backgammon
```

Connect to the `nodots-backgammon` GitHub repo in the Railway dashboard.

### Step 2: Configure API Service

The API service uses the existing `packages/api/Dockerfile` and `packages/api/railway.json`.

**Railway service settings:**
- Dockerfile path: `packages/api/Dockerfile`
- Root directory: (workspace root, leave blank)

**Environment variables (set in Railway dashboard):**

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://...@dpg-...` | Render PostgreSQL connection string |
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | Railway auto-assigns, but API defaults to this |
| `AUTH0_DOMAIN` | `nodots-backgammon.us.auth0.com` | Production Auth0 tenant |
| `AUTH0_CLIENT_ID` | (from Auth0 dashboard) | |
| `AUTH0_AUDIENCE` | `https://api.nodots.com` | |
| `JWT_SECRET` | (secure value) | |
| `ROBOT_USER_ID` | `767347c0-6a20-4998-8649-4b8bc56192c6` | |
| `ROBOT_MOVE_DELAY_MS` | `2000` | |
| `API_VERSION_PATH` | `/api/v4.6` | |

### Step 3: Configure Client Service

The client service uses `packages/client/Dockerfile` and `packages/client/railway.json`.

**Railway service settings:**
- Dockerfile path: `packages/client/Dockerfile`
- Root directory: (workspace root, leave blank)

**Environment variables (set in Railway dashboard):**

These are build-time args for Vite. They must be available during the Docker build stage, not just at runtime. Set them in Railway and they will be available in the build environment.

| Variable | Value | Notes |
|---|---|---|
| `VITE_AUTH0_DOMAIN` | `nodots-backgammon.us.auth0.com` | Must match API Auth0 config |
| `VITE_AUTH0_CLIENT_ID` | (from Auth0 dashboard) | Web client ID |
| `VITE_AUTH0_AUDIENCE` | `https://api.nodots.com` | Must match API audience |
| `VITE_API_URL` | `https://<api-service-url>` | Railway-generated API URL |
| `VITE_REST_PATH` | `/api` | |
| `VITE_API_VERSION` | `v4.6` | |
| `VITE_WS_URL` | `wss://<api-service-url>/ws` | WebSocket URL |

For preview environments, Railway generates unique URLs per service. The Client's `VITE_API_URL` must point to the preview API's URL, not the production API.

### Step 4: Enable Preview Environments

In Railway dashboard:

1. Go to project **Settings**
2. Find **Environments** section
3. Toggle **Create preview deployments from pull requests** to **ON**
4. Trigger: **Pull Request opened**

Each PR now gets:
- Its own API instance with a unique Railway-generated URL
- Its own Client instance with a unique Railway-generated URL
- Complete isolation from other cells and production

### Step 5: Configure Preview Environment Variables

Preview environments inherit variables from the production environment by default. Override these per-preview:

- `VITE_API_URL` must point to the preview API's URL (not production)
- `VITE_WS_URL` must point to the preview API's WebSocket URL
- `DATABASE_URL` can share the Render database (different schema per feature, or shared)

Railway provides `${{<service>.RAILWAY_PUBLIC_DOMAIN}}` variable references to link services within the same environment. Use this for `VITE_API_URL`:

```
VITE_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
VITE_WS_URL=wss://${{api.RAILWAY_PUBLIC_DOMAIN}}/ws
```

---

## Dockerfiles

### API Dockerfile (`packages/api/Dockerfile`)

Single-stage build. Installs full workspace, builds native gnubg-hints addon, builds dependency chain (types -> core -> api-utils -> ai -> api), then runs `npm run start:prod` which executes Drizzle migrations on startup.

### Client Dockerfile (`packages/client/Dockerfile`)

Two-stage build:
1. **Build stage** (node:20-alpine): Installs full workspace, builds dependency chain (types -> api-utils -> client via vite), produces static assets in `dist/`
2. **Serve stage** (nginx:alpine): Copies built assets, configures SPA fallback routing, serves on port 80

The client is a static SPA. All environment variables prefixed with `VITE_` are baked in at build time by Vite. Changing them requires a rebuild.

---

## Coordinator Workflow: Launching a Cell with Preview

When starting a new feature cell that needs a preview environment:

1. Create the feature branch and SCOPE.json as usual
2. Push the branch and open a PR against `main`
3. Railway automatically creates the preview environment
4. Wait for both services to deploy (check Railway dashboard)
5. Get the preview Client URL from Railway
6. Include the preview URL in the agent prompt:

```
## Preview Environment
Your feature branch has a live preview at: https://<preview-client-url>
API endpoint: https://<preview-api-url>
```

### Agent Prompt Addition

Add this to the standard agent prompt when a preview environment is available:

```
## Preview Environment
This feature cell has an isolated Railway preview deployment.
- Client: https://<railway-preview-client-url>
- API: https://<railway-preview-api-url>

Use these URLs to verify your changes in a production-like environment.
Do not modify Railway configuration or environment variables.
```

---

## Testing the Setup

### Create a Test Feature Branch

```bash
cd /Users/kenr/Code/nodots-backgammon
git checkout -b feat/railway-test
echo "# Railway preview test" >> README.md
git add README.md
git commit -m "Test Railway preview environment"
git push -u origin feat/railway-test
```

### Open a PR

```bash
gh pr create --title "Test Railway preview" --body "Testing preview environment creation"
```

### Verify

1. Railway dashboard shows a new preview environment
2. Both API and Client services deploy
3. API connects to Render database
4. Client loads and connects to the preview API
5. Close the PR -> Railway destroys the preview environment

---

## Troubleshooting

### Preview Deployment Not Created

1. Verify preview deployments are enabled in Railway settings
2. Check GitHub webhook connection in Railway
3. Verify Railway has access to the `nodots-backgammon` repo

### Build Fails

1. Check Railway build logs for the failing service
2. Common issue: esbuild platform mismatch (the Dockerfiles handle this with a fallback install)
3. Common issue: missing build dependency in the workspace

### Client Shows Blank Page

1. Check that `VITE_API_URL` is set correctly for the preview
2. Check that `VITE_AUTH0_*` variables are set
3. Remember: Vite vars are build-time, not runtime. Changing them in Railway requires a redeploy.

### API Cannot Connect to Database

1. Verify `DATABASE_URL` is set in Railway environment variables
2. The Render database must allow connections from Railway's IP range
3. Check Railway deploy logs for migration errors

### Client Cannot Reach Preview API

1. Verify `VITE_API_URL` points to the preview API URL, not production
2. Use Railway's variable references: `https://${{api.RAILWAY_PUBLIC_DOMAIN}}`
3. Check CORS configuration in the API allows the preview Client origin

---

## Checklist

- [ ] Railway project created and linked to nodots-backgammon repo
- [ ] API service configured with Dockerfile path and env vars
- [ ] Client service configured with Dockerfile path and env vars
- [ ] Preview deployments enabled
- [ ] Preview env vars use `${{api.RAILWAY_PUBLIC_DOMAIN}}` for service linking
- [ ] Test PR opened and preview environment verified
- [ ] Test PR closed and preview environment destroyed

---

## References

- Railway Docs: https://docs.railway.app
- Preview Environments: https://docs.railway.app/guides/preview-environments
- Service Variables: https://docs.railway.app/guides/variables

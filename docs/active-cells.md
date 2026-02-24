# Active Cells — Feb 23, 2026

## Execution Order

```
Cell 1: gnubg-hints       ──┐
Cell 2: backgammon-core   ──┤ sequential (must run in order)
Cell 3: backgammon-ai     ──┘
Cell 4: project-emerald   ── parallel (start anytime)
Cell 5: a2z email         ── parallel (start anytime)
```

Start cells 4 and 5 immediately. Start cell 1 immediately. Do NOT start cell 2 until cell 1's PR is merged. Do NOT start cell 3 until cell 2's PR is merged.

---

## Cell 1 — gnubg-hints: PR Calculation at gnubg Layer

> gnubg-hints is a **separate repository** (`nodots/gnubg-hints`), not a package within nodots-backgammon.
> It is cloned at `/Users/kenr/Code/nodots-backgammon/packages/gnubg-hints/` but has its own `.git`, branches, and remote.
> The agent session should root at that directory.
> GitHub issue: [nodots/gnubg-hints#13](https://github.com/nodots/gnubg-hints/issues/13)

### SCOPE.json
```json
{
  "feature": "pr-calculation-gnubg",
  "project": "gnubg-hints",
  "branch": "feat/pr-calculation-gnubg",
  "createdAt": "2026-02-23",
  "allowedPaths": [
    "gnubg-node-addon/src/**",
    "gnubg-node-addon/include/**",
    "gnubg-node-addon/test/**",
    "gnubg-node-addon/lib/**"
  ],
  "forbiddenPaths": [
    "gnubg-node-addon/binding.gyp",
    "gnubg-node-addon/tsconfig.json",
    "gnubg-node-addon/package.json",
    "gnubg-node-addon/package-lock.json",
    ".github/**"
  ],
  "dependsOn": [],
  "blockedBy": [],
  "estimatedScope": "Add PR calculation exposure through the N-API layer — new functions only, no changes to existing gnubg evaluation interface"
}
```

> Paths in SCOPE.json are relative to the gnubg-hints repo root, not nodots-backgammon.

### Agent Prompt
```
You are an AI developer working on the gnubg-hints project.

## Your Assignment
Feature: Expose PR (Performance Rating) calculation through the gnubg N-API layer
Project: gnubg-hints (repo: nodots/gnubg-hints)
Branch: feat/pr-calculation-gnubg

## Before You Start
1. Read SCOPE.json at the repo root — it defines exactly what you are and are not allowed to touch
2. Explore the existing N-API bindings in gnubg-node-addon/ to understand the current pattern for exposing gnubg functions to Node.js

## Context
gnubg-hints wraps the GNU Backgammon evaluation engine via N-API, exposing analysis functions to TypeScript. The Node.js addon code lives in `gnubg-node-addon/`. You need to expose PR calculation from gnubg through the same N-API pattern already used for move evaluation. The PR values will be consumed by backgammon-core and backgammon-ai in the nodots-backgammon project — keep the output shape simple and well-typed.

## What to Build
- Identify the relevant gnubg PR calculation function(s)
- Expose them via N-API following the existing binding pattern in gnubg-node-addon/
- Export TypeScript type definitions for the new function(s)
- Write tests covering the new bindings
- Do not modify any existing bindings — additions only

## Boundaries & Stopping Conditions
You are constrained to the paths in SCOPE.json allowedPaths. Before modifying any file, verify it matches an allowed glob. If it does not, stop.

Stop and write a clear description to BLOCKER.md if:
- You need to modify binding.gyp or package.json to complete the feature
- You cannot identify the correct gnubg function for PR calculation
- Build fails after two distinct fix attempts
- You face an architectural decision with no clear answer
- The existing N-API pattern is insufficient and a new approach is needed

When complete (bindings working, types exported, tests pass, build succeeds):
1. Write HANDOFF.md
2. Open a draft PR titled [READY]: PR calculation exposure in gnubg-hints
3. Stop

## Technical Context
- N-API native addon for Node.js
- TypeScript definitions alongside bindings in gnubg-node-addon/
- Build with node-gyp (from gnubg-node-addon/)
- Run tests with: cd gnubg-node-addon && npm test

Do not ask for confirmation before starting. Begin by exploring the existing binding structure.
```

---

## Cell 2 — backgammon-core: PR Calculation in Core Logic

> ⏳ Do not start until Cell 1 is merged to main.

### SCOPE.json
```json
{
  "feature": "pr-calculation-core",
  "project": "nodots-backgammon",
  "branch": "feat/pr-calculation-core",
  "createdAt": "2026-02-21",
  "allowedPaths": [
    "src/**",
    "__tests__/**",
    "test/**"
  ],
  "forbiddenPaths": [
    "contracts/**",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.*.json",
    ".github/**"
  ],
  "dependsOn": ["feat/pr-calculation-gnubg"],
  "blockedBy": [],
  "estimatedScope": "Integrate PR calculation from gnubg-hints into core game logic layer, expose clean TypeScript API for upstream consumption"
}
```

### Agent Prompt
```
You are an AI developer working on the Nodots backgammon ecosystem.

## Your Assignment
Feature: Integrate PR calculation into backgammon-core
Project: nodots-backgammon
Package: backgammon-core
Branch: feat/pr-calculation-core

## Before You Start
1. Read SCOPE.json — it defines exactly what you are and are not allowed to touch
2. Read HANDOFF.md if it exists
3. Review the gnubg-hints package to understand the PR calculation API that was just exposed — it has been updated and merged to main; pull latest before starting

## Context
backgammon-core sits between gnubg-hints (raw gnubg bindings) and backgammon-ai (analysis and strategy). You need to integrate the PR calculation functions now available in gnubg-hints into core's game logic, exposing a clean TypeScript API that backgammon-ai can consume. Follow the existing patterns in core for how gnubg-hints results are consumed and wrapped.

## What to Build
- Integrate the new PR calculation functions from gnubg-hints
- Expose a clean, well-typed PR calculation API from backgammon-core
- Handle both human and robot player contexts (the distinction will matter in backgammon-ai)
- Write unit tests
- Do not change existing public API signatures — additions only

## Boundaries & Stopping Conditions
You are constrained to the paths in SCOPE.json allowedPaths. Before modifying any file, verify it matches an allowed glob. If it does not, stop.

Stop and write a clear description to BLOCKER.md if:
- You need to modify package.json or tsconfig.json
- The gnubg-hints PR API is insufficient for what core needs — describe the gap
- Tests fail after two distinct fix attempts
- You face an architectural decision with no clear answer

When complete (types clean, tests pass, TS compiles, lint passes):
1. Write HANDOFF.md — note the exact shape of the PR API you exposed for backgammon-ai
2. Open a draft PR titled [READY]: PR calculation integration in backgammon-core
3. Stop

## Technical Context
- TypeScript strict mode
- Node 20
- Run tests with: npm test
- Run typecheck with: npx tsc --noEmit
- Run lint with: npm run lint

Do not ask for confirmation before starting.
```

---

## Cell 3 — backgammon-ai: PR Calibration for Humans and Robots

> ⏳ Do not start until Cell 2 is merged to main.

### SCOPE.json
```json
{
  "feature": "pr-calibration-ai",
  "project": "nodots-backgammon",
  "branch": "feat/pr-calibration-ai",
  "createdAt": "2026-02-21",
  "allowedPaths": [
    "src/**",
    "__tests__/**",
    "test/**"
  ],
  "forbiddenPaths": [
    "contracts/**",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.*.json",
    ".github/**"
  ],
  "dependsOn": ["feat/pr-calculation-core"],
  "blockedBy": [],
  "estimatedScope": "Refine and calibrate PR calculations separately for human and robot players using the new core PR API"
}
```

### Agent Prompt
```
You are an AI developer working on the Nodots backgammon ecosystem.

## Your Assignment
Feature: Refine and calibrate PR calculations for human and robot players
Project: nodots-backgammon
Package: backgammon-ai
Branch: feat/pr-calibration-ai

## Before You Start
1. Read SCOPE.json
2. Read HANDOFF.md if it exists
3. Pull latest main — backgammon-core now exposes a PR calculation API; review it before writing any code. The HANDOFF.md from the core cell documents the exact API shape.

## Context
backgammon-ai is the analysis and strategy layer of the Nodots ecosystem, built on top of backgammon-core. It includes a plugin system for swappable analyzers (GnubgMoveAnalyzer, NodotsAIMoveAnalyzer, RandomMoveAnalyzer, etc.) and operates at approximately 2200 FIBS rating strength.

PR (Performance Rating) calculations need to be refined and calibrated differently for human players vs robot/AI players — the statistical distributions and normalization are different. You are implementing that differentiation here.

## What to Build
- Consume the PR calculation API from backgammon-core
- Implement separate calibration logic for human players and robot players
- Integrate with the existing analyzer plugin system where appropriate
- Ensure PR values are meaningful and consistent across game types
- Write tests with representative cases for both human and robot scenarios

## Boundaries & Stopping Conditions
You are constrained to the paths in SCOPE.json allowedPaths. Before modifying any file, verify it matches an allowed glob. If it does not, stop.

Stop and write a clear description to BLOCKER.md if:
- The backgammon-core PR API is insufficient — describe exactly what is missing
- You need to modify package.json or config files
- Tests fail after two distinct fix attempts
- The calibration approach requires domain knowledge you don't have — describe the decision needed

When complete:
1. Write HANDOFF.md
2. Open a draft PR titled [READY]: PR calibration for humans and robots in backgammon-ai
3. Stop

## Technical Context
- TypeScript strict mode
- Node 20
- Plugin system for swappable analyzers — follow existing patterns
- Run tests with: npm test
- Run typecheck with: npx tsc --noEmit
- Run lint with: npm run lint

Do not ask for confirmation before starting.
```

---

## Cell 4 — Project Emerald: Docker-Deployable Client Instances

> ✅ Start immediately — no dependencies.

### SCOPE.json
```json
{
  "feature": "docker-client-instances",
  "project": "project-emerald",
  "branch": "feat/docker-client-instances",
  "createdAt": "2026-02-21",
  "allowedPaths": [
    "src/**",
    "docker/**",
    "Dockerfile",
    "Dockerfile.*",
    "docker-compose*.yml",
    "tests/**",
    "*.md"
  ],
  "forbiddenPaths": [
    "contracts/**",
    "*.csproj",
    "*.sln",
    "global.json",
    ".github/**"
  ],
  "dependsOn": [],
  "blockedBy": [],
  "estimatedScope": "Create Emerald client instances that can be built as Docker images and run with simulated inputs for testing"
}
```

> ⚠️ Adjust `allowedPaths` to match your actual Emerald repo structure before starting.

### Agent Prompt
```
You are an AI developer working on Project Emerald.

## Your Assignment
Feature: Docker-deployable Emerald client instances with simulated inputs
Project: project-emerald
Branch: feat/docker-client-instances

## Before You Start
1. Read SCOPE.json
2. Read HANDOFF.md if it exists
3. Explore the existing codebase structure before writing any code

## Context
Project Emerald is a .NET 7 application. You need to create client instances that can be:
- Built as Docker images
- Deployed and run as containers
- Configured to operate with simulated inputs (rather than real external inputs) for testing purposes

The goal is to enable isolated testing of client instances without requiring live external dependencies.

## What to Build
- Dockerfile(s) for building Emerald client instances
- Simulated input mechanism — a configurable input provider that replaces real inputs with test data during Docker runs
- docker-compose configuration for spinning up one or more client instances locally
- README or runbook documenting how to build, run, and configure instances
- The simulated input data should be configurable via environment variables or a mounted config file

## Design Principles
- Simulated mode should be toggled by an environment variable (e.g., EMERALD_INPUT_MODE=simulated)
- Real input providers should be untouched — simulated is an additive layer
- Docker images should be lean — use multi-stage builds
- Follow existing .NET 7 patterns in the codebase

## Boundaries & Stopping Conditions
You are constrained to the paths in SCOPE.json allowedPaths. Before modifying any file, verify it matches an allowed glob. If it does not, stop.

Stop and write a clear description to BLOCKER.md if:
- You need to modify .csproj, .sln, or global.json files
- The existing architecture makes additive simulated input impractical — describe why
- Docker build fails after two distinct fix attempts
- You face a design decision about simulated input shape that requires domain knowledge

When complete (Docker builds successfully, simulated inputs work, instances run as containers):
1. Write HANDOFF.md
2. Open a draft PR titled [READY]: Docker client instances with simulated inputs
3. Stop

## Technical Context
- .NET 7
- Docker multi-stage builds preferred
- Environment variable configuration for simulated mode
- Build image: dotnet/sdk:7.0
- Runtime image: dotnet/aspnet:7.0

Do not ask for confirmation before starting.
```

---

## Cell 5 — A2Z Freight Claims: Microsoft/Azure Email Support

> ✅ Start immediately — no dependencies.

### SCOPE.json
```json
{
  "feature": "microsoft-azure-email",
  "project": "a2z-freight-claims",
  "branch": "feat/microsoft-azure-email",
  "createdAt": "2026-02-21",
  "allowedPaths": [
    "src/email/**",
    "src/providers/**",
    "src/integrations/**",
    "src/config/**",
    "__tests__/**",
    "test/**"
  ],
  "forbiddenPaths": [
    "contracts/**",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.*.json",
    ".github/**",
    "src/auth/**"
  ],
  "dependsOn": [],
  "blockedBy": [],
  "estimatedScope": "Add Microsoft/Azure email provider at full feature parity with existing Gmail integration — OAuth, send, receive, attachments"
}
```

> ⚠️ Adjust `allowedPaths` to match the actual directory structure where email integration lives in the A2Z repo.

### Agent Prompt
```
You are an AI developer working on the A2Z Freight Claims platform.

## Your Assignment
Feature: Microsoft/Azure email provider at feature parity with Gmail
Project: a2z-freight-claims
Branch: feat/microsoft-azure-email

## Before You Start
1. Read SCOPE.json
2. Read HANDOFF.md if it exists
3. Before writing any code, read the existing Gmail integration in full — your Microsoft implementation must match it at the provider interface level exactly

## Context
A2Z Freight Claims is a TypeScript/Node.js/React/PostgreSQL application. It currently supports two email providers:
1. Gmail — full OAuth integration
2. Pure SMTP — basic provider

You are adding Microsoft/Azure email (Microsoft Graph API / Azure Communication Services) at the same level as Gmail — full feature parity. The existing provider pattern must be followed so that Microsoft email is a drop-in option alongside Gmail, not a special case.

## What to Build
- Microsoft/Azure email provider implementing the same interface as the Gmail provider
- OAuth flow for Microsoft (Microsoft identity platform / MSAL)
- Send email
- Receive/read email
- Attachment support
- Provider selection via configuration (environment variable or database setting)
- Tests mirroring the Gmail integration test coverage
- Any necessary database migration for storing Microsoft OAuth tokens (follow the existing pattern for Gmail token storage)

## Feature Parity Checklist
Before opening your PR, verify the Microsoft provider supports everything Gmail does:
- [ ] OAuth authorization flow
- [ ] Token storage and refresh
- [ ] Send email with attachments
- [ ] Read/receive email
- [ ] Webhook or polling for new email
- [ ] Error handling matching Gmail provider patterns
- [ ] Provider switchable per user or per configuration

## Boundaries & Stopping Conditions
You are constrained to the paths in SCOPE.json allowedPaths. Before modifying any file, verify it matches an allowed glob. If it does not, stop.

Stop and write a clear description to BLOCKER.md if:
- You need to modify package.json (new npm package required — list what and why)
- A database migration is needed and you are unsure of the existing migration pattern
- The Gmail provider interface is not clean enough to implement against — describe the gap
- OAuth flow requires infrastructure changes outside your scope
- Tests fail after two distinct fix attempts

When complete (provider implemented, tests pass, TS compiles, lint passes):
1. Write HANDOFF.md — note any environment variables the coordinator needs to configure
2. Open a draft PR titled [READY]: Microsoft/Azure email provider
3. Stop

## Technical Context
- TypeScript strict mode
- Node 20, Express
- PostgreSQL (follow existing migration patterns)
- Microsoft Graph API or Azure Communication Services for email
- MSAL (Microsoft Authentication Library) for OAuth
- Run tests with: npm test
- Run typecheck with: npx tsc --noEmit
- Run lint with: npm run lint

Do not ask for confirmation before starting.
```

---

## Coordinator Checklist Before Launching Each Cell

For each cell, before starting the agent:

- [ ] Create the feature branch from latest main
- [ ] Commit `SCOPE.json` to the branch
- [ ] Verify `allowedPaths` match actual repo directory structure
- [ ] Copy the agent prompt into a new Cursor chat session
- [ ] Note the Cursor session reference in your tracking system
- [ ] Set the cell status to `active`

## Current Cell Status

| Cell | Repo | Status | Depends On |
|---|---|---|---|
| 1 | gnubg-hints (`nodots/gnubg-hints`) | queued | — |
| 2 | backgammon-core | queued | Cell 1 merged |
| 3 | backgammon-ai | queued | Cell 2 merged |
| 4 | project-emerald | queued | — |
| 5 | a2z-freight-claims | queued | — |

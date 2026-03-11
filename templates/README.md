# Templates Directory

Standard, reusable templates for feature cells and coordination work.

## Files

### SCOPE.json.template
**When to use:** Starting a new feature cell

The scope manifest defines what files an agent can and cannot modify. Copy this template, fill in the placeholders, and commit it as `.auto-shop/cells/<branch>/SCOPE.json` on the feature branch.

**Key sections:**
- `feature`: Feature name (e.g., "keyboard-navigation")
- `project`: Project name (e.g., "nodots-backgammon")
- `branch`: Git branch name (should match actual branch)
- `allowedPaths`: Glob patterns of files the agent can modify (as narrow as possible)
- `forbiddenPaths`: Files the agent must not touch (always include contracts/, shared types, config files)
- `dependsOn`: Other feature branches this cell must wait for
- `blockedBy`: Populated at runtime when agent hits a blocker
- `estimatedScope`: Small/Medium/Large description

**Rules:**
- `allowedPaths` uses glob patterns: `src/features/foo/**`, `test/foo/**`, etc.
- Always forbid: `contracts/**`, `package.json`, `tsconfig.json`, `.github/**`, shared type files
- Keep allowedPaths narrow — agents appreciate clear boundaries
- Use glob patterns consistently (e.g., `foo/**` not `foo/*`)

**Example:**
```json
{
  "feature": "gnubg-hints",
  "project": "nodots-backgammon",
  "branch": "feat/gnubg-hints",
  "createdAt": "2026-02-23",
  "allowedPaths": [
    "src/features/gnubg-hints/**",
    "test/features/gnubg-hints/**"
  ],
  "forbiddenPaths": [
    "contracts/**",
    "src/types/shared/**",
    "package.json",
    "package-lock.json",
    "tsconfig.json"
  ],
  "dependsOn": [],
  "blockedBy": [],
  "estimatedScope": "Small — GNUBG hints integration"
}
```

### agent-prompt.template.md
**When to use:** Starting an agent session in Cursor or similar IDE

Copy this template, fill in the sections marked `[PLACEHOLDER]`, and use it as the system prompt for the agent session.

**Sections:**
- **Assignment**: Feature, project, branch
- **Before You Start**: Read SCOPE.json, read HANDOFF.md (if resuming), explore codebase
- **Boundaries & Stopping Conditions**: When to stop and write BLOCKER.md
- **Completion Checklist**: Tests pass, TypeScript compiles, lint passes, HANDOFF.md written, PR opened
- **Technical Context**: Project-specific build/test/lint commands

**Important notes:**
- Agents are NOT interrupted. They work to completion or a stopping condition.
- Stopping conditions are mandatory. Agent must not guess or make decisions unilaterally.
- If feature is complete: write HANDOFF.md, open [READY] PR, and stop
- If blocked: write BLOCKER.md and stop

### BLOCKER.md.template
**When to use:** Agent hits a stopping condition

Agent fills this out when they encounter something outside their scope. Coordinator reviews and unblocks.

**Sections:**
- **What I Was Trying to Do**: Task description
- **Why I'm Blocked**: Blocking issue
- **What I Need From the Coordinator**: Specific request (SCOPE.json change? contract change cell? dependency update?)
- **Options Considered**: Alternative approaches tried
- **Work Completed Before Blocking**: Progress to date

### HANDOFF.md.template
**When to use:** Feature cell is complete or paused

Agent fills this out when feature is done or hitting a stopping condition. Coordinator uses this to understand what was done and how to proceed.

**Sections:**
- **What Was Done**: Summary of implementation
- **What Remains**: If incomplete, what's left
- **Key Decisions Made**: Architectural choices and reasoning
- **Files Modified**: List of changed files and why
- **Test Status**: Which tests pass/fail
- **Current Blockers**: If paused, blocker description
- **How to Resume**: Instructions for next session

### MERGE_QUEUE.md.template
**When to use:** Managing the merge sequence

Living document at the repository root. Updated during evening coordinator session to track which cells are ready to merge, in what order, and with what dependencies.

**Sections:**
- **Ready for Merge**: Cells that can merge immediately
- **Waiting**: Cells blocked on dependencies
- **In Progress**: Cells still being worked on
- **Merged**: Completed cells (for history)

**Example:**
```markdown
# Merge Queue

**Updated:** 2026-02-23 18:00 UTC
**Coordinator:** kenr

## Ready for Merge
1. feat/gnubg-hints (no deps) → PR #10
2. feat/backgammon-core (depends on #1) → PR #11

## Waiting
3. feat/backgammon-ai (depends on #2) → PR #12
```

## Project-Specific Templates

### SCOPE-nodots-backgammon.template.json
Pre-filled SCOPE.json template for nodots-backgammon project.

**Structure:**
- Features go in `src/features/{name}/`
- Tests in `test/features/{name}/`
- Shared types in `src/types/shared/` (forbidden)

**Typical allowedPaths:**
```json
[
  "src/features/{feature-name}/**",
  "test/features/{feature-name}/**"
]
```

### SCOPE-a2z-freight-claims.template.json
Pre-filled SCOPE.json template for a2z-freight-claims.

**Structure:**
- TBD based on project structure

## How to Use

1. **Starting a feature cell:**
   ```bash
   mkdir -p .auto-shop/cells/feat/feature-name
   cp templates/SCOPE.json .auto-shop/cells/feat/feature-name/SCOPE.json
   # Edit the copied SCOPE.json with feature-specific paths
   git add .auto-shop/cells/feat/feature-name/SCOPE.json && git commit -m "Add SCOPE.json for feat/feature-name"
   ```

2. **Starting an agent session:**
   ```bash
   cp templates/agent-prompt.template.md AGENT_PROMPT.md
   # Fill in placeholders for [project name], [feature], etc.
   # Use AGENT_PROMPT.md as system prompt in Cursor/Claude Code session
   ```

3. **When blocked:**
   ```bash
   cp templates/BLOCKER.md.template BLOCKER.md
   # Agent fills in details and commits
   git add BLOCKER.md && git commit -m "Hit blocker in feat/feature-name"
   ```

4. **When complete:**
   ```bash
   cp templates/HANDOFF.md.template HANDOFF.md
   # Agent fills in details
   git add HANDOFF.md && git commit -m "Feature complete: feat/feature-name"
   # Agent opens PR with [READY] prefix
   ```

## Common Patterns by Project

### nodots-backgammon
- **Dependencies within scope:** Common (gnubg → core → ai)
- **Shared types:** Centralized in `src/types/shared/`
- **Strategy:** Keep allowedPaths narrow per feature

### a2z-freight-claims
- **Dependencies within scope:** Moderate (email, claims, integrations)
- **Shared types:** TBD
- **Strategy:** TBD

## Tips for Writing Good SCOPE.json

1. **Be Specific**: Use exact package/feature names, not wildcards
   - ✓ `src/features/keyboard-nav/**`
   - ✗ `src/**`

2. **Include Tests**: Feature tests should be in allowedPaths
   - `test/features/keyboard-nav/**`

3. **Don't Over-Forbid**: Only forbid what must be protected
   - ✓ `contracts/**` (always)
   - ✗ `src/**` (too broad)

4. **Document Dependencies**: If feature depends on another cell, list in `dependsOn`
   - `"dependsOn": ["feat/shared-types"]`

5. **Consider Configuration**: Config changes often require wider scope
   - If agent needs `.env`, add it to allowedPaths
   - If agent needs config file, document why and mark as blocker if forbidden

## Updating Templates

After each cell completion, review retrospectives and update templates based on common friction points:

- Did scope violations happen repeatedly?
- Were stopping conditions clear?
- Did templates match actual project structure?

Update templates in this directory and commit with message: `[TEMPLATE] Update templates based on retrospectives`

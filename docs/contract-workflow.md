# Contract Change Workflow

How to request, approve, and execute changes to shared interfaces (contracts).

---

## Core Principle

**Contracts are frozen documents.** Shared interfaces between packages do not change as side effects of feature work. Contract changes are explicit, tracked work with their own cells.

This prevents silent API changes that break other concurrent cells.

---

## Process Overview

```
Agent discovers need for contract change
           ↓
Agent writes BLOCKER.md with proposed interface
           ↓
Coordinator reads BLOCKER.md
           ↓
Coordinator creates contract/change-name branch + SCOPE.json
           ↓
Contract change is implemented & merged to main
           ↓
Agent's original feature branch rebases onto main
           ↓
Agent resumes work with new contract available
```

---

## Step 1: Agent Requests Contract Change

### Agent's Actions

When an agent discovers they need to change a shared interface:

1. **Do NOT modify contracts/** directly

2. **Write BLOCKER.md** in the feature branch:

```markdown
# Blocker: Contract Change Needed

## Current Interface

```typescript
// contracts/shared-types.ts
export interface GameState {
  board: Board;
  history: Move[];
}
```

## Proposed Interface

```typescript
// contracts/shared-types.ts
export interface GameState {
  board: Board;
  history: Move[];
  metadata: GameMetadata;  // NEW
}

export interface GameMetadata {
  createdAt: Date;
  playerNames: [string, string];
}
```

## Rationale

Cell 2 (backgammon-ai) needs to access player metadata. Cannot implement AI features without this information.

## Affected Packages

- nodots-backgammon (where GameState is used)
- backgammon-ai (where AI needs GameMetadata)

## Dependent Cells Requiring Rebase After

- (This is first cell, so none yet. But future cells that use GameState.)

## Options Considered

1. Store metadata separately → But defeats purpose of unified GameState
2. Pass metadata as parameter → But AI doesn't have access to parameters
3. Modify GameState contract → CHOSEN (cleaner API)
```

3. **Commit BLOCKER.md:**

```bash
git add BLOCKER.md
git commit -m "Hit blocker: contract change needed for GameMetadata"
```

4. **Stop and wait.** Do not try to work around the blocker.

---

## Step 2: Coordinator Reviews and Creates Contract Change Cell

### Coordinator's Actions

When you see a BLOCKER.md requesting a contract change:

1. **Read the blocker carefully** — Understand the proposed interface change

2. **Determine if change is legitimate:**
   - Does it make sense architecturally?
   - Is it backwards-compatible (if possible)?
   - Will it benefit other cells or just this one?
   - Are there alternatives?

3. **If approved:**

   a. **Create contract change branch:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b contract/add-game-metadata
   ```

   b. **Create SCOPE.json** for the contract change:
   ```json
   {
     "feature": "contract-add-game-metadata",
     "project": "shared-contracts",
     "branch": "contract/add-game-metadata",
     "createdAt": "2026-02-23",
     "allowedPaths": [
       "contracts/**"
     ],
     "forbiddenPaths": [
       "src/**",
       "test/**",
       "package.json",
       "tsconfig.json"
     ],
     "dependsOn": [],
     "blockedBy": [],
     "estimatedScope": "Small — add GameMetadata interface"
   }
   ```

   c. **Implement the contract change:**
   ```typescript
   // contracts/shared-types.ts
   export interface GameMetadata {
     createdAt: Date;
     playerNames: [string, string];
   }

   export interface GameState {
     board: Board;
     history: Move[];
     metadata: GameMetadata;  // NEW
   }
   ```

   d. **Commit:**
   ```bash
   git add contracts/
   git commit -m "Contract: Add GameMetadata interface"
   ```

   e. **Update CHANGELOG.md:**
   ```markdown
   # contracts/CHANGELOG.md

   ## 2026-02-23

   ### Added
   - GameMetadata interface for game context
   - metadata field to GameState (required)

   ### Migration
   ```typescript
   // Old
   const state: GameState = { board, history };

   // New
   const state: GameState = {
     board,
     history,
     metadata: {
       createdAt: new Date(),
       playerNames: ['Alice', 'Bob']
     }
   };
   ```

   - Affects: backgammon-core, backgammon-ai
   - Merged: 2026-02-23 18:00 UTC
   ```

   f. **Push and open PR:**
   ```bash
   git push -u origin contract/add-game-metadata
   gh pr create --title "[CONTRACT] Add GameMetadata interface" \
     --body "Extracted from blocker in feat/backgammon-ai.

See BLOCKER.md on that branch for rationale and details."
   ```

   g. **Review and merge immediately** (contract changes are high priority):
   ```bash
   # Review the PR (should only modify contracts/)
   gh pr merge <PR-NUMBER> --merge
   ```

4. **If rejected:** Leave comment on the BLOCKER.md explaining why and alternative approach

---

## Step 3: Agent's Feature Branch Rebases

### Coordinator's Actions (Continued)

After contract change is merged to main:

1. **Notify the agent** on the blocked cell issue:
   ```
   "Unblocked. Contract change merged (PR #XYZ).
   Rebase your branch onto main and resume work."
   ```

2. **Change cell status:**
   - Remove `cell:blocked` label
   - Add `cell:active` label

### Agent's Actions

When unblocked:

1. **Rebase onto main:**
   ```bash
   git fetch origin main
   git rebase origin/main
   ```

2. **Verify the contract is now available:**
   ```typescript
   // Should compile without errors
   import { GameState, GameMetadata } from './contracts/shared-types';
   ```

3. **Resume work** using the new contract interface

4. **Continue to completion** as normal

---

## Step 4: Merge Both Changes

### Timeline

```
2026-02-23 14:00 — Agent hits blocker (feat/backgammon-ai)
2026-02-23 14:30 — Coordinator creates contract change (contract/add-game-metadata)
2026-02-23 14:45 — Contract change PR created
2026-02-23 15:00 — Contract change merged to main
2026-02-23 15:15 — Agent rebases, resumes work
2026-02-23 18:00 — Evening: Agent completes, opens [READY] PR
2026-02-23 18:30 — Coordinator merges contract PR (already done)
2026-02-23 18:35 — Coordinator merges agent's feature PR
```

**Merge order is critical:** Contract changes merge FIRST, then dependent cells merge after rebasing.

---

## Contract Change Patterns

### Pattern 1: Adding a New Interface

**Scenario:** Cell needs a new type that doesn't exist yet

```typescript
// contracts/new-type.ts (NEW FILE)
export interface MyNewType {
  field1: string;
  field2: number;
}
```

**SCOPE.json allows:** `contracts/**`
**PR title:** `[CONTRACT] Add MyNewType interface`

### Pattern 2: Extending an Existing Interface

**Scenario:** Cell needs to add a field to an existing interface

```typescript
// contracts/shared-types.ts
export interface GameState {
  // ... existing fields
  newField: string;  // NEW
}
```

**PR title:** `[CONTRACT] Add newField to GameState`
**CHANGELOG:** Document the new field and migration path

### Pattern 3: Removing Deprecated Interface

**Scenario:** Old interface is no longer used

```typescript
// contracts/shared-types.ts
// REMOVED: export interface OldInterface { ... }

// Replacement:
export interface NewInterface { ... }
```

**Breaking change:** All dependent cells must update
**Requires:** All cells modified and merged before this PR merges, OR this PR rebases dependencies

### Pattern 4: Changing Method Signature

**Scenario:** Shared utility signature needs to change

```typescript
// contracts/shared-utils.ts

// Old
export function doSomething(input: OldType): OldResult { ... }

// New
export function doSomething(input: NewType): NewResult { ... }
```

**Breaking change:** All cells using this utility must update
**Alternative:** Create new function, deprecate old one gradually

---

## Pre-Merge Checklist for Contract Changes

Before merging a contract change:

- [ ] SCOPE.json has `allowedPaths: ["contracts/**"]` only
- [ ] No other files modified (only contracts/)
- [ ] contracts/CHANGELOG.md updated
- [ ] All examples/migrations documented
- [ ] PR title has `[CONTRACT]` prefix
- [ ] Pre-commit hook allows only contracts/ modifications
- [ ] ci-lint/tests pass (should only validate JSON if any)
- [ ] At least one coordinator has reviewed
- [ ] Affected cells identified (in PR comments)

---

## Handling Contract Conflicts

### If a contract change breaks an existing cell

**Scenario:** You merge contract change, but it breaks existing code

**Steps:**
1. Create revert commit: `git revert <contract-commit>`
2. Push revert to main
3. Find the cell that's affected
4. Coordinate with agent to fix compatibility
5. Re-merge contract change OR keep reverted and discuss better approach

### If two cells request conflicting contract changes

**Scenario:** Cell A wants GameState with field X, Cell B wants GameState without field X

**Resolution:**
1. Determine which is more important
2. Implement that contract change
3. Have the other cell work around it or adjust SCOPE.json
4. Or: Split the interface (GameStateWithX and GameStateMinimal)

---

## Documentation Handoff

### For Agent Requesting Contract Change

In your BLOCKER.md:
- Current interface (code block)
- Proposed interface (code block)
- Rationale (why it's needed)
- Affected packages (list)
- Migration path (if breaking change)

### For Coordinator Approving Contract Change

Update CHANGELOG.md with:
- Date merged
- What changed
- Migration examples
- Which cells depend on this

### For Next Agent Using Contract

In your HANDOFF.md:
- Document if you used the new contract
- Any surprises or improvements?

---

## Testing Contract Changes

### Before Merge

Verify the contract compiles and doesn't break existing imports:

```bash
# Typechecker should pass
npx tsc --noEmit

# If other cells are in this repo, verify they still compile
npm run build
```

### After Merge

Dependent cells should:
1. `git rebase origin/main`
2. Import and use the new contract
3. `npm test` to verify
4. Resume work

---

## Anti-Patterns: What NOT to Do

### ❌ Don't: Sneak contract changes into feature branches

```bash
# WRONG: Modifying contracts on a feature branch
git checkout feat/my-feature
# ... modify contracts/...
git commit -m "Fix GameState"  # Pre-commit hook rejects this
```

**Why:** Pre-commit hook prevents it. SCOPE.json forbids contracts on feature branches.

**Right way:** Use contract change cell with proper SCOPE.json.

### ❌ Don't: Update multiple contracts in one PR

**One change per PR.** If you need multiple related changes, do them in sequence:

```bash
1. contract/add-type-1 → merged
2. contract/add-type-2 (depends on type 1) → merged
3. contract/add-type-3 (depends on types 1 & 2) → merged
```

### ❌ Don't: Merge contract changes during active feature work

**Contract changes can only merge when:**
1. All dependent cells have been notified
2. All dependent cells can rebase successfully
3. It's a coordinator-controlled operation (evening merge session)

**Bad:** Merging contract change at 2 PM when 4 agents are working
**Good:** Merging contract change at 3 PM, unblocking agents at 3:15 PM, agents resume at 4 PM

---

## Quarterly Review of Contracts

Every quarter, review which contracts are stable and which are in flux:

```markdown
## Q1 2026 Contract Review

### Stable Contracts
- GameState (used by 5 cells, no changes)
- BoardPosition (used by 4 cells, no changes)

### Evolving Contracts
- PlayerStats (changed 3 times in Q1, used by 2 cells)
- Recommendation: Stabilize API before Q2

### Deprecated Contracts
- OldGameFormat (replaced by GameState in Jan, remove in Q2)

### Recommendations
- Add more detail to GameMetadata
- Split GameState for read-only cases
```

---

## Reference

**Related documents:**
- `contracts/README.md` — Contract freezing principles
- `contracts/CHANGELOG.md` — History of all changes
- `docs/merge-procedure.md` — How to merge contracts
- `templates/agent-prompt.template.md` — Stopping conditions for agents
- `.github/ISSUE_TEMPLATE/contract-change.md` — Issue template

---

**Last updated:** 2026-02-23

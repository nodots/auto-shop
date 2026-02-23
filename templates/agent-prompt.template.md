# Agent Assignment: [FEATURE NAME]

You are an AI developer working on **[PROJECT NAME]**.

## Your Assignment

- **Feature:** [Feature name and one-line description]
- **Project:** [Project name]
- **Branch:** `[feat/feature-name]`
- **Scope Manifest:** `SCOPE.json` at repository root

## Before You Start (Required Reading)

1. **Read `SCOPE.json` carefully.** It defines exactly which files you can and cannot modify. You are responsible for respecting it.
   - `allowedPaths`: Files you CAN modify
   - `forbiddenPaths`: Files you must NOT modify
   - If a file is not covered by `allowedPaths`, you cannot modify it

2. **If `HANDOFF.md` exists**, read it. It tells you what was done in a previous session and how to resume.

3. **Explore the codebase** before writing code. Understand:
   - Directory structure
   - Existing patterns (naming, architecture, testing)
   - Build and test commands (see Technical Context below)

## Boundaries & Stopping Conditions

**You are constrained to the paths listed in `SCOPE.json` allowedPaths.** Before modifying any file, check: Does it match an `allowedPaths` glob? If not, you cannot modify it.

### Stop and Write to BLOCKER.md If:

- You need to modify a file outside `allowedPaths`
- You need to change anything in `contracts/**` (shared interfaces)
- You need to modify `package.json` or other config files
- Tests fail after two distinct fix attempts (describe attempts in BLOCKER.md)
- You are uncertain which of two valid approaches to take and the decision has meaningful architectural implications
- You discover the scope manifest (`SCOPE.json`) appears incomplete or incorrect
- You encounter a dependency that has not yet been completed

### When the Feature is Complete:

**Acceptance Criteria (all must be true):**
1. All acceptance criteria from the GitHub issue are met
2. All tests pass
3. TypeScript compiles with no errors (if applicable)
4. Linter passes (if applicable)

**Next Steps (in order):**
1. Write `HANDOFF.md` summarizing:
   - What was implemented
   - Key decisions made
   - Any unresolved issues
   - Instructions for the next session (if needed)

2. Open a draft PR with this title format:
   ```
   [READY]: Feature name — brief description
   ```

3. **Stop and wait.** Do not make further changes after opening the PR. The coordinator will review and handle merging.

### Example Completion

```
## HANDOFF.md (you write this)

# Handoff: [Feature Name]
Date: 2026-02-23
Status: complete

## What Was Done
- Implemented keyboard navigation in MoveHistory component
- Added useKeyboard hook
- All tests passing

## Key Decisions
- Used existing useKeyboard pattern for consistency
- No new state shape required

## Files Modified
- src/components/MoveHistory/index.tsx
- src/components/MoveHistory/useNavigation.ts
- test/components/MoveHistory/__tests__/navigation.test.ts

## Test Status
All tests passing (15 tests)

## How to Resume
Not applicable — feature is complete.
```

---

## Technical Context

### Project: [PROJECT NAME]

**Build command:**
```bash
[npm run build | yarn build | other]
```

**Test command:**
```bash
[npm test | yarn test | other]
```

**Lint command:**
```bash
[npm run lint | yarn lint | other]
```

**Development server:**
```bash
[npm run dev | yarn dev | other]
```

**Additional setup:**
- [Database setup if needed]
- [Environment variables if needed]
- [Other relevant setup]

### Key Patterns in This Project

- **File naming:** [e.g., PascalCase for components, camelCase for utilities]
- **Imports:** [e.g., absolute imports from src/, relative for local]
- **Testing:** [e.g., Jest with React Testing Library, custom fixtures]
- **Architecture:** [e.g., feature-based, layered, custom]

### Useful Commands

```bash
# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- [test-file-name]

# Build for production
npm run build

# Check type errors
npx tsc --noEmit

# Lint and fix
npm run lint -- --fix
```

---

## Important Reminders

- **Do not ask for permission.** Work to completion or a stopping condition. The coordinator is not available on-demand.
- **Stopping conditions are mandatory.** If you're unsure whether to proceed, stop and write BLOCKER.md.
- **SCOPE.json is the source of truth.** If you think the scope is wrong, write BLOCKER.md explaining why; don't modify it yourself.
- **Pre-commit hook enforces scope.** If you try to commit a file outside allowedPaths, the hook will reject it. This is intentional — it means you've hit a scope boundary.

---

## Getting Help

If you get stuck:

1. **Review existing tests** to understand patterns
2. **Check git history** for similar features
3. **Read comments in the code** for context
4. **If still stuck:** Write BLOCKER.md and stop. The coordinator will help.

---

**Ready to start?** Begin with:

1. Verify `SCOPE.json` exists and makes sense for this feature
2. Run `npm test` to ensure everything builds
3. Explore `allowedPaths` directories to understand structure
4. Read any relevant documentation in `docs/` or code comments
5. Start implementing the feature

Good luck!

# SCOPE.json Design Guide

How to write good SCOPE.json manifests that prevent conflicts and scope creep.

---

## Principles

1. **Narrow is better than broad** — Agents appreciate clear boundaries
2. **Explicit over implicit** — List exactly what's allowed, not wildcards
3. **Protect shared code** — Always forbid contracts/, shared types, config
4. **Document the why** — Comments in SCOPE.json explain intent

---

## Decision Tree

Use this tree to design SCOPE.json for any feature.

### Q1: What type of work is this?

- **New feature** → Go to Q2
- **Bug fix** → Go to Q3
- **Refactor** → Go to Q4
- **Documentation** → Go to Q5

### Q2: Is it a new feature?

**Typical new feature:**
```json
"allowedPaths": [
  "src/features/{feature-name}/**",
  "test/features/{feature-name}/**"
]
```

**Does it touch multiple packages?**
- No → Continue with typical
- Yes → Should this be one cell or two?
  - Related changes → Expand allowedPaths to both packages
  - Independent changes → Split into two cells (dependencies)

**Does it need shared types?**
- No → Continue
- Yes → File issue for contract change FIRST, then add contract to blockedBy

**Does it need config changes?**
- No → Continue
- Yes → Add to forbiddenPaths, mark as potential blocker

**Final scope:**
```json
{
  "feature": "feature-name",
  "project": "project-name",
  "branch": "feat/feature-name",
  "allowedPaths": [
    "src/features/feature-name/**",
    "test/features/feature-name/**"
  ],
  "forbiddenPaths": [
    "contracts/**",
    "src/types/shared/**",
    "package.json",
    "package-lock.json",
    ".env*"
  ],
  "dependsOn": [],
  "blockedBy": [],
  "estimatedScope": "Small — feature name"
}
```

### Q3: Is this a bug fix?

**For small bugs:**
```json
"allowedPaths": [
  "src/components/BuggyComponent.tsx",
  "test/components/BuggyComponent.test.tsx"
]
```

**For wider bugs (spanning multiple files):**
```json
"allowedPaths": [
  "src/utils/buggy-utility-name/**",
  "test/utils/buggy-utility-name.test.ts"
]
```

**Does the fix require refactoring?**
- No → Keep scope narrow
- Yes → Expand scope to cover refactor area

**Final scope:**
```json
{
  "feature": "fix-bug-name",
  "allowedPaths": [
    "src/path/to/buggy/component/**",
    "test/path/to/buggy/component/**"
  ],
  "forbiddenPaths": ["contracts/**", ...],
  "estimatedScope": "Small — bug fix"
}
```

### Q4: Is this a refactor?

**Small refactor (one file/component):**
```json
"allowedPaths": [
  "src/components/ComponentName.tsx",
  "test/components/ComponentName.test.tsx"
]
```

**Large refactor (multiple files):**
```json
"allowedPaths": [
  "src/utils/old-utility-name/**",
  "test/utils/old-utility-name/**"
]
```

**Does refactor change public API?**
- No → Continue
- Yes → Requires contract change (file blocker issue)

**Typical refactor scope:**
```json
{
  "feature": "refactor-component-name",
  "allowedPaths": [
    "src/components/ComponentName/**",
    "test/components/ComponentName/**"
  ],
  "forbiddenPaths": ["contracts/**", ...],
  "estimatedScope": "Medium — refactor for clarity/performance"
}
```

### Q5: Is this documentation?

**Documentation changes:**
```json
"allowedPaths": [
  "docs/**",
  "src/**/*.md"  // Inline code docs
]
```

**Important:** Keep docs-only changes separate. Don't mix with code changes.

```json
{
  "feature": "docs-feature-name",
  "allowedPaths": [
    "docs/**"
  ],
  "forbiddenPaths": ["src/**", "test/**", ...],
  "estimatedScope": "Small — documentation"
}
```

---

## Common Patterns

### Pattern 1: Feature with Subfolders

**Feature:** Keyboard navigation for MoveHistory

```json
"allowedPaths": [
  "src/components/MoveHistory/**",
  "src/hooks/useMoveHistoryKeyboard.ts",
  "test/components/MoveHistory/**",
  "test/hooks/useMoveHistoryKeyboard.test.ts"
]
```

**Why:** Keeps related code and tests together. `**` captures subfolders.

### Pattern 2: Feature with Multiple Concerns

**Feature:** Authentication system (login + signup + password reset)

**Option A: One cell (if related)**
```json
"allowedPaths": [
  "src/features/auth/**",
  "test/features/auth/**"
]
```

**Option B: Three cells (if independent)**
- Cell 1: `src/features/auth/login/**`
- Cell 2: `src/features/auth/signup/**` (depends on Cell 1 for shared components)
- Cell 3: `src/features/auth/password-reset/**` (depends on Cell 1)

### Pattern 4: Utilities Shared Between Two Features

**Feature:** Utility that's needed by Feature A and Feature B

```json
"allowedPaths": [
  "src/utils/new-utility-name.ts",
  "src/features/feature-a/**",
  "src/features/feature-b/**",
  "test/**"
]
```

**OR (if utilities are substantial):**

Create contract:
1. Create `contracts/shared-utilities.ts`
2. Export new utilities
3. Both Feature A and B depend on contract change

### Pattern 5: Fixing a Shared Utility

**Issue:** Shared utility is broken, but it's in contracts

```json
// Can't allow src/utils/ if it's in contracts/
// Instead: Create contract-change cell

"feature": "contract-fix-shared-utility",
"allowedPaths": ["contracts/**"],
"forbiddenPaths": ["src/**", "test/**"]
```

---

## Forbid List (What to Always Forbid)

**Always include these in forbiddenPaths:**

```json
"forbiddenPaths": [
  "contracts/**",              // Shared interfaces
  "src/types/shared/**",       // Shared types
  "package.json",              // Package dependencies
  "package-lock.json",         // Lock files
  "tsconfig.json",             // TypeScript config
  "tsconfig.*.json",           // Project-specific configs
  ".github/**",                // CI/CD workflows
  ".env*",                     // Environment secrets
  "docker-compose.yml",        // Infrastructure
  "Dockerfile",                // Infrastructure
  ".husky/**",                 // Git hooks
  ".gitignore",                // Git config
  "README.md",                 // Root readme (not feature-specific)
  "LICENSE",                   // License
  "yarn.lock"                  // Lock files
]
```

**May forbid (project-specific):**
```json
"src/index.ts",               // Main entry point
"src/App.tsx",                // Root component
"webpack.config.js",          // Build config (if not per-package)
"jest.config.js",             // Test config
".env.example"                // Config documentation
```

---

## Scope Size Estimation

### Small (1–2 days)
- Single component or utility
- No new dependencies
- No cross-feature interactions
- Example: "Add keyboard shortcut to dialog"

```json
{
  "feature": "dialog-keyboard-shortcuts",
  "allowedPaths": [
    "src/components/Dialog/**",
    "test/components/Dialog/**"
  ],
  "estimatedScope": "Small — keyboard shortcuts only"
}
```

### Medium (2–4 days)
- Multiple components or one small package
- Some internal dependencies
- Touches 2–3 areas of the codebase
- Example: "Add email provider integration"

```json
{
  "feature": "email-integration",
  "allowedPaths": [
    "src/services/email/**",
    "src/components/EmailSettings/**",
    "test/**"
  ],
  "estimatedScope": "Medium — email service and settings UI"
}
```

### Large (4+ days)
- Multiple packages or major subsystem
- Complex interactions
- Touches many areas
- Example: "Complete authentication system"

```json
{
  "feature": "auth-system",
  "allowedPaths": [
    "src/features/auth/**",
    "src/services/auth/**",
    "test/**"
  ],
  "estimatedScope": "Large — complete authentication"
}
```

**Rule of thumb:** If a cell takes >4 days, consider breaking it into smaller cells with dependencies.

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Too-Broad allowedPaths

**Bad:**
```json
"allowedPaths": ["src/**"]  // Can modify anything!
```

**Why it's bad:** Defeats the purpose of scope enforcement. Agent can accidentally break shared code.

**Good:**
```json
"allowedPaths": ["src/features/feature-name/**"]
```

### ❌ Mistake 2: Forgetting to Forbid Shared Resources

**Bad:**
```json
{
  "allowedPaths": ["src/components/**"],
  "forbiddenPaths": []  // Forgot contracts!
}
```

**Why it's bad:** Agent could modify shared types or contracts, breaking other cells.

**Good:**
```json
{
  "allowedPaths": ["src/components/FeatureName/**"],
  "forbiddenPaths": [
    "contracts/**",
    "src/types/shared/**",
    "package.json",
    "tsconfig.json"
  ]
}
```

### ❌ Mistake 3: Requiring a Contract Change But Not Mentioning It

**Bad:**
```json
{
  "feature": "new-api-integration",
  "allowedPaths": ["src/services/api/**"],
  "blockedBy": []  // But this needs a new type in contracts!
}
```

**Why it's bad:** Agent hits blocker immediately. Could have been pre-planned.

**Good:**
```json
{
  "feature": "new-api-integration",
  "allowedPaths": ["src/services/api/**"],
  "dependsOn": ["contracts/new-api-types"],  // Explicit dependency
  "blockedBy": ["contracts/new-api-types"]   // Mark as pre-blocker
}
```

### ❌ Mistake 4: Mixing Unrelated Changes

**Bad:**
```json
{
  "feature": "big-refactor",
  "allowedPaths": [
    "src/components/**",
    "src/utils/**",
    "src/services/**"
  ]
}
```

**Why it's bad:** Scope is too broad. Tempts agent to make unrelated changes.

**Good:** Split into multiple cells
- Cell 1: Refactor components
- Cell 2: Refactor utils (depends on Cell 1 if there are shared dependencies)
- Cell 3: Refactor services (depends on Cell 1 if needed)

---

## Updating SCOPE.json Mid-Cell

**Can the agent modify SCOPE.json?**

**Yes, but carefully:**

1. Agent discovers the scope was incomplete
2. Agent writes BLOCKER.md explaining why
3. Coordinator reviews and approves the change
4. Agent updates SCOPE.json
5. Agent resumes work

**The rule:** Scope should be correct upfront, but minor tweaks are okay. Major changes = create new issue or split the cell.

---

## Project-Specific Guidelines

### nodots-backgammon (Multi-Repo)

nodots-backgammon is composed of 8 packages, each in its own git repository. Features typically touch multiple packages. The auto-shop CLI handles this via the `packages` field in `projects.json`.

**Why multi-repo:**
- 6 public npm packages need independent versioning and publishing
- gnubg-hints is GPL-3.0 (must be isolated from MIT-licensed code)
- gnubg-hints has a native C/C++ build (node-gyp) — fundamentally different build process
- Separate repos allow independent CI, release cadence, and access control

**Package map:**

| Package | Repo | Public | License |
|---------|------|--------|---------|
| types | nodots/nodots-backgammon-types | Yes | MIT |
| core | nodots/nodots-backgammon-core | Yes | MIT |
| ai | nodots/nodots-backgammon-ai | Yes | MIT |
| api-utils | nodots/nodots-backgammon-api-utils | Yes | MIT |
| cli | nodots/nodots-backgammon-cli | Yes | MIT |
| gnubg-hints | nodots/gnubg-hints | Yes | GPL-3.0 |
| api | nodots/nodots-backgammon-api | No | MIT |
| client | nodots/nodots-backgammon-client | No | MIT |

**Creating a cell:**

```bash
# All packages (most features touch most packages)
auto-shop cell create my-feature --project=nodots-backgammon

# Specific packages only
auto-shop cell create my-feature --project=nodots-backgammon --packages=types,core,api
```

This creates a `feat/my-feature` branch and SCOPE.json in each selected package repo. All SCOPE.json files share the same `featureGroup` value, linking them as one logical unit of work.

**Per-package SCOPE.json:**

Because each package is its own repo, `src/**` is appropriate granularity — the repo boundary itself provides containment. The template uses:

```json
"allowedPaths": ["src/**", "__tests__/**", "test/**", "docs/**"]
```

**gnubg-hints special case:**

gnubg-hints has a different directory layout (code lives under `gnubg-node-addon/`). Its `scopeOverrides` in `projects.json` replace the default paths:

```json
"allowedPaths": [
  "gnubg-node-addon/src/**",
  "gnubg-node-addon/include/**",
  "gnubg-node-addon/test/**",
  "gnubg-node-addon/lib/**"
]
```

gnubg-hints inherits the project-level `featureTarget: "development"` like all other packages.

**Feature groups and coordinated merges:**

When a feature spans multiple packages, merge in dependency order:
1. types (depended on by everything)
2. core (depends on types)
3. ai, api-utils, cli (depend on core)
4. gnubg-hints (independent)
5. api (depends on core, ai, api-utils)
6. client (depends on types)

Each package's SCOPE.json has a `featureGroup` field linking it to the same feature.

**Viewing the package map:**

```bash
auto-shop project show nodots-backgammon
```

### a2z-freight-claims

**Standard structure:** [TBD — update after first cells]

---

## Testing Your Scope

After writing SCOPE.json, test it:

```bash
# Try to commit an in-scope file (should succeed)
echo "test" > src/features/feature-name/test.ts
git add src/features/feature-name/test.ts
git commit -m "Test in-scope commit"  # Should succeed

# Try to commit an out-of-scope file (should fail)
echo "test" >> package.json
git add package.json
git commit -m "Test out-of-scope commit"  # Should fail
# Error: ❌ Scope violation — files outside SCOPE.json allowedPaths

# Reset the bad commit
git reset HEAD package.json && git checkout -- package.json
```

If pre-commit hook accepts out-of-scope files, the hook is broken. Debug with:
```bash
node scripts/enforce-scope.js  # Run manually to see errors
```

---

## Summary Checklist

Before committing SCOPE.json:

- [ ] allowedPaths is specific (not `src/**`)
- [ ] forbiddenPaths includes contracts/, shared types, config
- [ ] Feature name matches branch name
- [ ] Dependencies listed in dependsOn (if any)
- [ ] Blockers documented in blockedBy (if known)
- [ ] estimatedScope is realistic
- [ ] Manually tested scope enforcement
- [ ] Fellow coordinator reviewed (optional, but good)

---

**Need help?** See `templates/README.md` for templates and examples.

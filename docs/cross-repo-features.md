# Cross-Repo Feature Workflow

Guide for features that span multiple packages with separate git repositories.

## When This Applies

nodots-backgammon packages live in separate repos but share a dependency chain:

```
types -> core -> api
         core -> ai
```

A feature like "ELO ratings" touches types, core, and api. Each repo gets its own branch, PR, and merge — but they must be coordinated.

## Principles

1. **Same branch name across all repos** — makes the relationship obvious
2. **Same base branch across all repos** — currently `feat/4.6.4-RC` for nodots-backgammon
3. **Build and commit in dependency order** — types first, core second, api last
4. **PRs document merge order explicitly** — each PR states which PRs must merge before it
5. **Merge in dependency order** — never merge a downstream PR before its upstream dependency

## Step-by-Step

### 1. Create branches

Same name, same base, all repos:

```bash
for pkg in types core api; do
  cd packages/$pkg
  git checkout -B feat/feature-name feat/4.6.4-RC
  cd ../..
done
```

### 2. Implement in dependency order

Build and verify each package before moving to the next:

```
types:  write code -> npm run build -> commit
core:   write code -> npm run build -> npm test -> commit
api:    write code -> npm run build -> commit
```

Each package uses `file:../types` (or `file:../core`) references, so the freshly built `dist/` from upstream is picked up automatically.

### 3. Push all branches

```bash
for pkg in types core api; do
  cd packages/$pkg
  git push origin feat/feature-name
  cd ../..
done
```

### 4. Open PRs in dependency order

Each PR targets the same base branch and documents the chain:

| Order | Repo | PR body includes |
|-------|------|-----------------|
| 1 | types | "No dependencies. Merge first." |
| 2 | core | "Depends on types PR#N. Merge second." |
| 3 | api | "Depends on types PR#N and core PR#M. Merge last." |

### 5. Merge in dependency order

Follow [merge-procedure.md](merge-procedure.md) for each, but strictly in order:

1. Merge types PR -> rebuild types
2. Merge core PR -> rebuild core, run tests
3. Merge api PR -> rebuild api, run migration

After each upstream merge, the downstream branch may need a rebase if the base branch moved.

### 6. Post-merge verification

After all PRs are merged, verify the full chain builds:

```bash
cd packages/types && npm run build
cd ../core && npm run build && npm test
cd ../api && npm run build
```

## Handling Schema Migrations

When the API package includes a drizzle migration:

1. Generate the migration on the feature branch: `npx drizzle-kit generate`
2. Commit the migration SQL and snapshot files
3. After merge, run `npx drizzle-kit migrate` against the target database
4. Verify the migration applied cleanly

Regenerate the migration if the base branch schema changed during development (stale snapshot drift).

## PR Template for Cross-Repo Features

Include this section in every PR body:

```markdown
## Cross-repo merge chain
- [ ] types PR#N (merge first)
- [ ] core PR#M (merge second, depends on types)
- [ ] api PR#P (merge last, depends on both)
```

## Common Mistakes

### Wrong base branch

Each repo may have a different default branch. For nodots-backgammon packages, the base is `feat/4.6.4-RC` (not `development`, not `main`). Always verify before creating branches.

### Building out of order

If you implement api before types is built, the `file:../types` reference will resolve to stale `dist/` output. Always build upstream first.

### Merging out of order

If core merges before types, core's CI will fail because it imports types that don't exist on the base branch yet. Always merge upstream first.

### Forgetting to regenerate migrations

If the base branch gained schema changes between when you started and when you merge, the drizzle migration may include unrelated ALTERs or conflict with existing migrations. Regenerate before merge if the base moved.

## Tracking Cross-Repo Features

In `MERGE_QUEUE.md`, group related PRs:

```markdown
## Ready for Merge

### ELO Ratings (cross-repo, merge in order)
1. nodots-backgammon-types PR#53 — types
2. nodots-backgammon-core PR#104 — calculator + tests
3. nodots-backgammon-api PR#52 — schema, routes, hooks
```

## Reference: ELO Ratings (First Cross-Repo Feature)

Executed 2026-03-03. Three PRs, three repos, one feature:

| Package | PR | What changed |
|---------|-----|-------------|
| types | [#53](https://github.com/nodots/nodots-backgammon-types/pull/53) | `EloConfig`, `EloCalculationResult`, `EloRating` types |
| core | [#104](https://github.com/nodots/nodots-backgammon-core/pull/104) | `EloCalculator` class + 19 tests |
| api | [#52](https://github.com/nodots/nodots-backgammon-api/pull/52) | Schema, operations, route, game hook, robot seeding, migration |

This feature established the cross-repo workflow pattern documented above.

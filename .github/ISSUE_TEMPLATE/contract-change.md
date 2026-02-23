---
name: Contract Change
about: Modify a shared interface in contracts/
labels: cell:contract-change,phase-3
---

## Contract(s) Being Changed
<!-- Which file(s) in contracts/ are affected? -->

## Current Interface
```typescript
// Copy the current interface/export here
```

## Proposed Interface
```typescript
// What should it be changed to and why?
```

## Rationale
<!-- Why is this contract change needed? -->
<!-- Which feature cells requested this? -->

## Affected Packages
<!-- Which packages/features depend on this contract? -->
- [ ]
- [ ]
- [ ]

## Dependent Cells Requiring Rebase
<!-- After this contract change merges, which cells need to rebase and resume? -->
- Issue #
- Issue #

## Implementation Plan
- [ ] Contract change branch created (`contract/change-name`)
- [ ] SCOPE.json written (allowedPaths: ["contracts/**"])
- [ ] Contract file(s) updated
- [ ] Existing tests/usages updated if needed
- [ ] tests pass
- [ ] TypeScript compiles
- [ ] PR opened
- [ ] PR merged to main
- [ ] Dependent cells notified and rebased

## Pre-Merge Checklist
- [ ] SCOPE.json has allowedPaths: ["contracts/**"] only
- [ ] forbiddenPaths excludes src/, test/, etc.
- [ ] No other files modified (only contracts/)
- [ ] Contracts are properly exported in contracts/index.ts
- [ ] CHANGELOG.md updated with this change
- [ ] All dependent cells have been identified

## Notes
<!-- Any special handling or considerations? -->

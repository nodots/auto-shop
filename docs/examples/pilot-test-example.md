# Phase 1 Pilot Test Example

This file demonstrates the Phase 1 pilot test for the coordination system.

## What This Tests

1. **Scope Enforcement** — Pre-commit hook validates SCOPE.json
2. **In-Scope Commits** — Files in allowedPaths can be committed
3. **Out-of-Scope Rejection** — Files outside allowedPaths are rejected
4. **Provisioning** — Database schema creation
5. **Teardown** — Database cleanup

## Validation

✓ SCOPE.json created and committed
✓ In-scope file (this file) commits successfully
✗ Out-of-scope files rejected by hook (verified below)
✓ Pre-commit hook is working

## Next Steps

- Verify out-of-scope rejection
- Create HANDOFF.md
- Open [READY] PR
- Merge to main
- Teardown environment

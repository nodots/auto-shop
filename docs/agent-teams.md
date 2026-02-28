# Agent Teams Within Cells

## Overview

Auto-shop cells and Agent Teams solve different coordination problems:

- **Auto-shop cells**: Cross-repo, cross-session coordination. One feature, one branch, one agent, strict scope boundaries. The coordinator manages boundaries between cells.
- **Agent Teams**: Within-session parallelism. Multiple subagents within a single cell working on different subtasks concurrently.

These are complementary. A cell worker can use Agent Teams internally to parallelize work within its scoped boundaries.

## When to Use Agent Teams Within a Cell

Agent Teams are useful when a cell's work has independent subtasks that can run concurrently:

- **Implementation + Testing**: One teammate writes code while another writes tests for already-completed components
- **Multi-file scaffolding**: Parallel creation of independent source files that don't depend on each other
- **Research + Implementation**: One teammate explores the codebase while another begins work on a well-understood portion

Agent Teams are not useful when:

- The cell's work is inherently sequential (each step depends on the previous)
- The cell's scope is narrow enough that parallelism adds overhead without benefit
- The subtasks touch overlapping files (risk of conflicts)

## Scope Enforcement

The PreToolUse hook enforces SCOPE.json for all tool calls regardless of which teammate makes them. Every teammate in the session is bound by the same `allowedPaths` and `forbiddenPaths`. There is no way for a teammate to bypass scope enforcement.

## Example: Cell 2 (backgammon-core) with Internal Teams

A cell worker for backgammon-core PR calculation could spawn two teammates:

1. **Implementer**: Writes the PR calculation integration in `src/`
2. **Tester**: Writes test cases in `test/` based on the PR API shape documented in Cell 1's HANDOFF.md

Both teammates are constrained to Cell 2's `allowedPaths`. The tester can begin writing test stubs and fixtures while the implementer works on the integration code.

## Configuration

Agent Teams are configured in the cell-worker subagent file's YAML frontmatter or invoked dynamically during the session. No additional auto-shop configuration is needed — the existing SCOPE.json and PreToolUse hook handle enforcement.

## Limitations

- Agent Teams operate within a single session. They do not persist across sessions.
- All teammates share the same context window. Large codebases may leave less room for parallel context.
- Teammates cannot communicate with agents in other cells. Cross-cell coordination goes through the coordinator via BLOCKER.md and HANDOFF.md.

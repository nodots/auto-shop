# Agent Templates

This directory contains subagent definition files for use with Claude Code.

## Files

### cell-worker.md

Generic cell worker template. Copy this to a target repo's `.claude/agents/` directory and customize with project-specific context (build commands, directory layout, patterns).

### Usage

1. Copy `cell-worker.md` to your target repo:
   ```bash
   mkdir -p /path/to/repo/.claude/agents/
   cp cell-worker.md /path/to/repo/.claude/agents/cell-worker-<project>.md
   ```

2. Edit the copy to add project-specific sections:
   - Repository layout (key directories and their purpose)
   - Build and test commands
   - Project-specific patterns and conventions

3. Commit the agent file to `main` (it is infrastructure, not feature code)

## Relationship to agent-prompt.template.md

The older `templates/agent-prompt.template.md` is a copy-paste prompt template with placeholder brackets (`[PROJECT NAME]`, `[branch name]`, etc.) that must be filled in manually for each agent session.

The subagent files in this directory are first-class Claude Code agents. They:
- Are discoverable by Claude Code automatically when placed in `.claude/agents/`
- Read `SCOPE.json` dynamically at runtime — no manual placeholder filling
- Can specify model, tools, and hooks in YAML frontmatter
- Are versionable and committable to the target repo

Prefer subagent files for new cells. The old template remains available for non-Claude-Code environments.

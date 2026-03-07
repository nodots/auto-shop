# Implement GitHub Issue

You are implementing a GitHub issue. Work autonomously until the issue is fully resolved or you hit a blocker you cannot resolve yourself.

## Issue

**URL:** [ISSUE_URL]
**Repository:** [REPO]

Read the issue. The title, body, labels, and comments are your requirements. If the issue references other issues or PRs, read those too.

## Setup

1. If `.claude/project.json` exists, read it and use its `repo` field for all GitHub operations (`gh` commands, PR creation). Otherwise, verify you are in the correct repository: run `git remote -v` and confirm the remote contains `[REPO_NAME]`. If neither matches, clone `https://github.com/[REPO].git` and work from there.
2. Read the issue: run `gh issue view [ISSUE_NUMBER] --repo [REPO]`. If `gh` is not available, fall back to `curl -s -H "Authorization: token $GH_TOKEN" https://api.github.com/repos/[REPO]/issues/[ISSUE_NUMBER]`.
3. Read the project's CLAUDE.md if one exists
4. If `HANDOFF.md` exists at the repo root, read it — you are resuming a previous session
5. Understand the repo: directory structure, language, framework, build system, test framework
6. Check out or create the appropriate feature branch (see Branch Strategy below)
7. Identify the files relevant to the issue before writing any code

## Branch Strategy

- If a feature branch for this issue already exists, check it out
- If not, create one from the base branch specified below
- **Repository:** [REPO]
- **Base branch:** [BASE_BRANCH]
- **Branch name:** `feat/[SHORT_DESCRIPTION]`

## Work Loop

Repeat until done or blocked:

1. **Plan** — Identify the smallest change that moves toward completion
2. **Implement** — Write the code
3. **Verify** — Run tests, type checks, and linter after each meaningful change
4. **Commit** — Make small, focused commits with clear messages as you go

Do not batch all changes into a single commit at the end. Commit after each logical unit of work.

## Verify Commands

Run these after each meaningful change. Adapt to whatever the project actually uses.

```
[BUILD_COMMAND]
[TEST_COMMAND]
[LINT_COMMAND]
```

If any command is not applicable, skip it. If you do not know the commands, look at `package.json`, `Makefile`, `pyproject.toml`, or equivalent to discover them.

## Stopping Conditions

**Stop and write `BLOCKER.md` if:**

- You need to change a shared interface or contract that other code depends on, and you are unsure whether it is safe
- Tests fail after two genuine fix attempts (not the same fix twice)
- You need credentials, secrets, API keys, or access you do not have
- The issue requirements are ambiguous and the ambiguity affects your implementation direction
- You discover a prerequisite that must be completed first (another issue, a migration, an infrastructure change)
- You are about to make a change with significant blast radius (database schema, CI config, deployment config) and the issue did not explicitly request it

**Do not stop for:**

- Needing to read more code — just read it
- Needing to install dependencies — install them
- Needing to create new files or directories — create them
- Needing to refactor code within scope to make the feature work — do it
- Test failures you understand how to fix — fix them

## BLOCKER.md Format

```markdown
# Blocker: [issue title]

Date: [today]
Branch: [current branch]

## What I Was Trying to Do

[Specific task within the issue]

## Why I'm Blocked

[Precise description of the blocker]

## What I Need

[Specific action required to unblock — not vague]

## Options I Considered

[Approaches attempted or evaluated, and why each did not work]

## Work Completed

[Summary of progress, including commits made]
```

## Completion Protocol

When the issue is fully implemented:

1. Run the full verify suite one final time
2. Write `HANDOFF.md`:

```markdown
# Handoff: [issue title]

Date: [today]
Status: complete
Branch: [branch name]
Issue: [issue URL]

## What Was Done

[Bullet list of changes]

## Key Decisions

[Choices made and reasoning, especially where multiple approaches existed]

## Files Modified

[List with brief explanation of each change]

## Test Status

[Pass/fail summary, new tests added]

## Notes

[Anything the reviewer should pay attention to]
```

3. Push the branch
4. Open a PR against [BASE_BRANCH] with:
   - `gh pr create --repo [REPO] --base [BASE_BRANCH] --title "..." --body "..."`
   - Title referencing the issue (e.g., `feat: add ELO rating calculation (#42)`)
   - Body containing the "What Was Done" and "Key Decisions" sections from HANDOFF.md
   - `Closes #[ISSUE_NUMBER]` in the body
5. Stop. Do not make further changes after opening the PR.

## Rules

- Do not ask for confirmation before starting. Begin immediately.
- Do not modify files unrelated to the issue. Fix only what the issue asks for.
- Do not add features, refactoring, or "improvements" beyond what the issue specifies.
- If the issue is vague, implement the most conservative reasonable interpretation rather than guessing at expanded scope.
- Follow existing code patterns. Match the style of the surrounding code, not your preferences.
- Write tests for new behavior unless the project has no test infrastructure.
- If you discover a bug unrelated to this issue, note it in HANDOFF.md under Notes. Do not fix it.

You are auditing GitHub issues against the current codebase.

Target project: [PROJECT_NAME]
Target repo: [REPO]
Local path: [LOCAL_PATH]
Issue state: [ISSUE_STATE]
Issue limit: [ISSUE_LIMIT]

Task:
1. Use `gh issue list --repo [REPO] --state [ISSUE_STATE] --limit [ISSUE_LIMIT]` to collect candidate issues.
2. Open the issue bodies only for items that look actionable or likely stale.
3. Compare each candidate to the current code in `[LOCAL_PATH]`.
4. Summarize only what you can defend from code and issue text.

Output format:
- `Close`: issues that are already implemented or clearly obsolete.
- `Modify`: issues whose title/scope should be narrowed because part of the work is already done.
- `Leave Open`: issues that still appear valid.

Rules:
- Prefer `rg` for code search.
- Do not change code.
- Include concrete file references for every close/modify recommendation.
- Be explicit when evidence is partial or inferred.
- Keep the result concise and checklist-shaped.

Useful comparisons:
- Look for shipped routes, pages, services, schema, tests, and migrations.
- Distinguish backend-only completion from full issue completion.
- For epics/phases, prefer `Modify` if the core feature exists but polish or rollout remains.

# Retrospective Insights

Aggregated learnings from completed feature cells.

**Last updated:** 2026-02-23
**Cells analyzed:** [0 initially]

---

## Scope Violations

Track common scope violations to improve templates.

| Pattern | Frequency | Root Cause | Fix Applied |
|---------|-----------|-----------|------------|
| [Shared types modification] | 0 | — | — |
| [Config file changes] | 0 | — | — |
| [Package.json edits] | 0 | — | — |

**Improvement:** Once violations occur, document pattern and update `templates/SCOPE-{project}.json` to be more specific.

---

## Common Friction Points

Recurring issues that slow agents or confuse coordinators.

| Issue | Frequency | Severity | Solution |
|-------|-----------|----------|----------|
| [Pre-commit hook error messages unclear] | 0 | — | — |
| [Database provisioning failure] | 0 | — | — |
| [Stopping conditions ambiguous] | 0 | — | — |

**Improvement:** As patterns emerge, update:
- Agent prompt template (if about stopping conditions)
- Script error messages (if about tooling)
- Scope templates (if about boundaries)

---

## What Works Really Well

Positive patterns to preserve and reinforce.

| Pattern | Frequency | Why It Works |
|---------|-----------|------------|
| [Stopping conditions are clear] | 0 | — |
| [Scope enforcement is effective] | 0 | — |
| [Pre-commit hook prevents conflicts] | 0 | — |

---

## Blocker Frequency

Track blockers by type.

| Blocker Type | Count | Avg. Duration | Preventable? |
|--------------|-------|---------------|------------|
| Scope too narrow | 0 | — | Yes |
| Dependency not ready | 0 | — | Yes |
| Contract change needed | 0 | — | Yes |
| Architectural ambiguity | 0 | — | Partially |

**Analysis:** As data accumulates, identify which blockers are avoidable through better upfront work.

---

## Process Improvements Made

Changes implemented based on retrospectives.

### Round 1 (Post-Phase-1 Testing)
**Date:** [When cells #1-3 complete]

**Changes:**
- [Improvement 1: description and impact]
- [Improvement 2: description and impact]

**Metrics before/after:**
- Scope violations: [X] → [Y]
- Avg. duration: [A days] → [B days]
- Blocker frequency: [C per cell] → [D per cell]

---

## Project-Specific Observations

### nodots-backgammon

**Status:** [Not yet evaluated]

**Patterns observed:**
- [Observation 1]
- [Observation 2]

**Typical cell duration:** [X days]
**Typical scope size:** [Small/Medium/Large]
**Common dependencies:** [Types/utilities/features]

**Template adjustments needed:**
- [Update to SCOPE-nodots-backgammon.template.json]

### project-emerald

**Status:** [Not yet evaluated]

**Patterns observed:**
- [Observation 1]
- [Observation 2]

**Typical cell duration:** [X days]
**Typical scope size:** [Small/Medium/Large]
**Common dependencies:** [Rare/frequent]

**Template adjustments needed:**
- [Update to SCOPE-project-emerald.template.json]

### a2z-freight-claims

**Status:** [Not yet evaluated]

**Patterns observed:**
- [Observation 1]
- [Observation 2]

**Typical cell duration:** [X days]
**Typical scope size:** [Small/Medium/Large]
**Common dependencies:** [Rare/frequent]

**Template adjustments needed:**
- [Update to SCOPE-a2z-freight-claims.template.json]

---

## Coordinator Workflow Feedback

Feedback on the morning/evening session process.

**Session duration reality:**
- Target: 20–30 min per session
- Actual: [X–Y min]
- Variance reason: [If different, why?]

**Capacity insights:**
- Sustainable concurrent cells: 4
- Actual achieved: [N]
- Bottlenecks: [Where do things slow down?]

**Tool effectiveness:**
- Pre-commit hook: [Effective? Confusing?]
- Provisioning scripts: [Fast? Reliable?]
- GitHub automation: [Helpful? Missing?]

**Improvements to coordinator workflow:**
- [Change 1]
- [Change 2]

---

## Agent Session Patterns

How agents typically work and where they get stuck.

**Typical agent behavior:**
- Time to first commit: [X hours]
- Commits per day: [Y]
- Typical PR complexity: [# of commits, # of files]

**Stopping condition effectiveness:**
- Agents understand and follow: [%]
- Blockers from misunderstanding: [X]
- Blockers from genuine ambiguity: [Y]

**Support needed:**
- [Type of blocker that requires coordinator intervention]
- [Type of blocker that requires pair session]

---

## Template Quality

How well templates predict actual work.

### SCOPE.json Accuracy

| Project | Violations | False Positives | Needs Updating |
|---------|-----------|-----------------|----------------|
| nodots-backgammon | 0 | 0 | No |
| project-emerald | 0 | 0 | No |
| a2z-freight-claims | 0 | 0 | No |

**Improvement:** Update templates based on first few cells in each project.

### Agent Prompt Clarity

**Comprehensiveness score:** [Needs examples? Too long? Just right?]
**Clarity score:** [Stopping conditions clear? Technical context complete?]
**Suggested updates:** [Changes to agent-prompt.template.md]

### HANDOFF.md Template

**Sections used:** [Which sections do agents actually fill out?]
**Sections skipped:** [Which are less useful?]
**Suggested updates:** [Simplify? Add examples?]

---

## Merge Sequence Insights

How merges go in practice.

**Average merge duration:** [X minutes per cell]
**Conflict frequency:** [0 / X cells had conflicts]
**Dependency handling:** [Are dependencies respected? Any surprises?]

**Rebase issues:**
- Conflicts: [X]
- Test failures after rebase: [Y]
- Teardown failures: [Z]

**Improvements to merge-procedure.md:**
- [Suggestion 1]
- [Suggestion 2]

---

## Team Observations

Broader observations about how the system is working.

**Coordinator load:**
- Is 1 hour/day sustainable?
- Any days that exceeded 1 hour? When/why?
- Could it be automated further?

**Agent experience:**
- Do agents feel the scope boundaries are helpful or restrictive?
- Any feedback on stopping conditions?
- Favorite part of the system?

**Team velocity:**
- How many features completed per week?
- Trend: increasing / stable / decreasing?
- Bottlenecks to faster completion?

---

## Rollout Phase Feedback

Feedback specific to each phase.

### Phase 1: Foundation
**Status:** Complete
**Lessons learned:**
- [Lesson 1]
- [Lesson 2]

**Improvements for Phase 2:**
- [Improvement 1]

### Phase 2: Environment Isolation
**Status:** [Pending]
**Lessons learned:** [Will fill in after completing]

### Phase 3: Contract Freezing
**Status:** [Pending]
**Lessons learned:** [Will fill in after completing]

### Phase 4: CI & Merge Sequencing
**Status:** [Pending]
**Lessons learned:** [Will fill in after completing]

---

## Metrics Trends

Track key metrics over time to spot patterns.

```
Chart: Average Cell Duration (days)
  Week 1: [X]
  Week 2: [X]
  Week 3: [X]
  Trend: [Stable/Improving/Degrading]

Chart: Scope Violations per Cell
  Week 1: [X]
  Week 2: [X]
  Week 3: [X]
  Trend: [Decreasing/Stable]

Chart: Blocker Frequency
  Week 1: [X per cell]
  Week 2: [X per cell]
  Week 3: [X per cell]
  Trend: [Stable]
```

---

## Quarterly Review

Every 3 months, fill out a full retrospective review.

### Q1 2026 (Jan–Mar)

**Cells completed:** [X]
**Total features shipped:** [X]
**System uptime:** [% of time running smoothly]
**Team satisfaction:** [Survey scores]

**Biggest wins:**
- [Win 1]
- [Win 2]

**Biggest challenges:**
- [Challenge 1]
- [Challenge 2]

**Recommended changes for Q2:**
- [Change 1]
- [Change 2]

---

## Updating This Document

**How to add a new cell's retrospective:**

1. Complete a feature cell
2. Coordinator fills out `docs/retrospectives/{feature-name}.md`
3. Coordinator summarizes key points in THIS document
4. Identify any new patterns or improvements
5. Update templates or processes accordingly
6. Commit with message: `[RETRO] Add insights from {feature-name}`

**Frequency:** Update after every 3–5 cells complete, or monthly, whichever is sooner.

---

## Next Steps

1. Complete pilot cells (Phase 1 testing)
2. Fill out first retrospectives
3. Begin aggregating patterns in this document
4. Adjust templates and processes based on learnings
5. Document best practices as they emerge

---

**Ready for first cells?** See `docs/quickstart.md` to get started.

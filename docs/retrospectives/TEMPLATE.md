# Retrospective: [Feature Name]

**Cell:** `feat/[feature-name]`
**Coordinator:** [Your name]
**Issue:** #[GitHub issue number]
**Date Completed:** [Date]
**Duration:** [X days / Y hours]

---

## Quick Summary

[One-sentence summary of the feature and outcome]

---

## What Went Well

- [Thing that worked smoothly]
- [Thing that worked smoothly]
- [Tool or process that was helpful]

---

## What Was Hard / Friction Points

- [Pain point or difficulty]
- [Unexpected challenge]
- [Tool that could be better]

---

## Scope Accuracy

**Was SCOPE.json complete and correct?**

- [ ] Yes, didn't need to modify it
- [ ] Mostly correct, minor tweaks needed
- [ ] Several violations/overreach occurred
- [ ] Completely wrong (describe below)

**Details:**
```
If scope violations occurred, describe them:
- File/path: [reason why it needed to be modified]
- File/path: [reason why it needed to be modified]

If no violations, write: "No violations. Scope was accurate."
```

**Lesson for next time:**
[What should we change in templates/SCOPE-{project}.json or scope-design-guide.md?]

---

## Stopping Conditions

**Did the agent stop at the right times?**

- [ ] Yes, clear stopping points
- [ ] Mostly, but one surprise
- [ ] No, ambiguous when to stop
- [ ] N/A (no blockers occurred)

**Details:**
```
If agent hit a blocker, how was it resolved?
- Blocker: [description]
- Resolution: [how it was unblocked]

If no blockers, write: "No blockers. Agent understood scope and completed feature cleanly."
```

**Lesson for next time:**
[What should we clarify in agent-prompt.template.md?]

---

## Tool Feedback

### Pre-Commit Hook (enforce-scope.js)
**Easy to understand? Helpful?**

- [ ] Yes, clear and useful
- [ ] Mostly, but error messages could be better
- [ ] No, confusing or wrong

Comments:
```
Example: "Hook correctly rejected out-of-scope files. Error message was clear."
or
"Hook false-positive on glob pattern matching. Took time to debug."
```

### Provisioning Script (provision-feature-env.sh)
**Worked first try? Fast? Clear?**

- [ ] Yes, worked perfectly
- [ ] Mostly, minor issues
- [ ] Failed, needed manual fixes

Comments:
```
Example: "Script created schema in 2 seconds. Works great."
or
"Database connection failed. Had to manually create schema."
```

### Teardown Script (teardown-feature-env.sh)
**Clean? Complete? Reliable?**

- [ ] Yes, removed everything
- [ ] Mostly, left minor artifacts
- [ ] Failed or incomplete

Comments:
```
Example: "Perfectly cleaned up schema and .env files."
or
"Left orphaned schema. Had to manually drop."
```

### Issue Templates
**Were feature-cell template helpful?**

- [ ] Yes, clear and complete
- [ ] Mostly, a few fields were unclear
- [ ] No, not really helpful

Comments:
```
Example: "Template covered everything I needed."
or
"Didn't know what to put in 'Scope Summary' field."
```

### HANDOFF.md Template
**Clear what to write?**

- [ ] Yes, very clear
- [ ] Mostly, could use examples
- [ ] No, confusing

Comments:
```
Example: "Template sections made it obvious what to document."
or
"Wasn't sure how detailed to be in 'Files Modified' section."
```

---

## Timeline

**When did things happen?**

- **Branch created:** [Date]
- **SCOPE.json written:** [Date]
- **Agent session started:** [Date]
- **Feature completed:** [Date]
- **[READY] PR opened:** [Date]
- **PR approved/merged:** [Date]

**Total duration:** [X days / Y hours]

**Expected vs. actual:**
```
Was the feature completed in the estimated time?
- Expected scope: [small/medium/large]
- Actual duration: [X days]
- If variance: [why did it take longer/shorter?]
```

---

## Dependencies & Interactions

**Did this cell's dependencies affect the timeline?**

- [ ] No dependencies
- [ ] Dependencies completed on time
- [ ] Had to wait for a dependency
- [ ] Blocker on a dependency

Details:
```
Example: "Cell depended on feat/shared-types. Had to wait 1 day for that to merge."
```

**Did this cell block any other cells?**

- [ ] No, independent
- [ ] Yes: [which cells]

If yes, for how long? Did they resume quickly after merge?

---

## Blocker Analysis

**If blockers occurred:**

1. **Blocker 1: [Name]**
   - **When:** [Date/day]
   - **Cause:** [Root cause]
   - **Resolution:** [How it was unblocked]
   - **Time cost:** [Hours/days lost]
   - **Preventable?** Yes / No
   - **If yes, how?** [Better SCOPE.json? Earlier contract change?]

2. **Blocker 2: [Name]**
   - [Same fields as above]

---

## Code Quality

**How was the implementation quality?**

- [ ] Excellent
- [ ] Good
- [ ] Acceptable
- [ ] Needs improvement

**Any technical debt or shortcuts?**

```
Example: "Skipped some error handling to save time. Should be addressed in next iteration."
```

**Any architectural decisions that surprised you?**

```
Example: "Agent chose Redux over Context API. Decision was well-reasoned and fits the codebase."
```

---

## Process Observations

**What should we do more of?**

- [ ] Pre-written scope manifests (saves time in morning session)
- [ ] More detailed acceptance criteria (clarifies what's needed)
- [ ] Earlier contract change identification (avoids late blockers)
- [ ] [Other]

**What should we do less of?**

- [ ] Too-broad SCOPE.json (causes violations)
- [ ] Vague acceptance criteria (causes rework)
- [ ] Merging without all tests passing (causes regressions)
- [ ] [Other]

**What should we change?**

- [ ] [Process improvement 1]
- [ ] [Process improvement 2]
- [ ] [Template update]

---

## Learning for Next Cell

**Key takeaway from this cell:**

[One-sentence learning that applies to future cells]

**Example:** "Shared type changes need dedicated contract-change cells — don't let agent try to modify contracts."

---

## Files Created/Modified (for reference)

```
feat/feature-name modified:
- src/features/feature-name/component.tsx (new)
- src/features/feature-name/hook.ts (new)
- test/features/feature-name/component.test.tsx (new)
- docs/feature-name.md (new)

Total lines: +450, -0
Test coverage: +15 tests
```

---

## Follow-Up Actions

**Should we file any issues or improvements?**

- [ ] No, everything was smooth
- [ ] Yes:
  - Issue: [Improvement or bug found]
  - Issue: [Improvement or bug found]

---

## Coordinator Notes

[Any additional observations from the coordinator's perspective]

```
Example: "Agent was very efficient. Finished 1 day ahead of estimate.
          No scope violations. Clean merge. Great example of the system working as designed."
```

---

## Metrics (Optional)

If tracking metrics:

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Duration | X days | 3 days | ✓/✗ |
| Scope violations | 0 | 0 | ✓ |
| Blockers | 0 | 0 | ✓ |
| Test coverage | 100% | >90% | ✓ |
| Merge conflicts | 0 | 0 | ✓ |
| Merge duration | 5 min | <10 min | ✓ |

---

## Sign-Off

**Retrospective completed by:** [Name]
**Date:** [Date]
**Status:** ✓ Complete

---

## Next Steps

This retrospective is complete. Next:

1. File any improvement issues (if applicable)
2. Update templates based on learnings
3. Update `docs/retrospectives/INSIGHTS.md` with key patterns
4. Move on to next cell

---

**Questions?** See `docs/retrospectives/README.md` for guidance on filling out this template.

# GitHub Issues Created for AI Development Coordination System

**Date:** 2026-02-23
**Total Issues Created:** 18 (plus 1 epic)
**Status:** Ready for implementation

---

## Overview

A complete set of GitHub issues has been created to track the implementation of the AI-Driven Multi-Feature Development System as specified in `docs/ai-dev-scaling-plan.md`. These issues are organized into 5 phases:

- **Phase 1 (Week 1):** Foundation — Scope manifests, templates, basic tooling
- **Phase 2 (Week 2):** Environment isolation — Database, Railway, multi-cell testing
- **Phase 3 (Week 3):** Contract freezing — Shared interfaces, change workflows
- **Phase 4 (Week 4):** CI/CD & merge sequencing — Integration checks, merge queue
- **Ongoing:** Coordinator workflow, retrospectives, continuous improvement
- **Additional:** Documentation, quick start, video, CLI tool

---

## Issues by Phase

### EPIC (#2)
**[EPIC] Implement AI-Driven Multi-Feature Development System**

Meta-tracking issue that aggregates all work. Links to all phase issues, documents success metrics, and provides entry points for new coordinators.

---

## Phase 1: Foundation (Week 1)

### #3 Review and merge infrastructure from PR #1
**Status:** Queued | **Priority:** High (blocking)
- Review PR #1 scripts and workflows
- Verify `scripts/enforce-scope.js`, provisioning/teardown scripts
- Verify CI workflow
- Merge or document any modifications needed

### #4 Create GitHub labels for cell status tracking
**Status:** Queued | **Priority:** High
- Create cell status labels (queued, active, blocked, awaiting-review, merged, contract-change)
- Create phase labels (phase-1, phase-2, phase-3, phase-4)
- Create category labels (infrastructure, github-config, documentation, process, testing, tooling, improvement, ongoing, enhancement, epic)
- Verify all labels working correctly

### #5 Create GitHub issue templates
**Status:** Queued | **Priority:** High
- Create `.github/ISSUE_TEMPLATE/feature-cell.md`
- Create `.github/ISSUE_TEMPLATE/contract-change.md`
- Create `.github/ISSUE_TEMPLATE/blocker.md`
- Test templates with sample issues

### #6 Create templates/ directory with standard manifests
**Status:** Queued | **Priority:** Medium
- Create `templates/SCOPE.json.template`
- Create `templates/agent-prompt.template.md`
- Create `templates/BLOCKER.md.template`
- Create `templates/HANDOFF.md.template`
- Create `templates/MERGE_QUEUE.md.template`
- Create `templates/README.md` with usage guide

### #7 Test system with one end-to-end feature cell
**Status:** Queued | **Priority:** High (validation)
- Execute complete workflow: create branch → provision → write SCOPE.json → run agent → complete → write HANDOFF.md → open PR → merge → teardown
- Test pre-commit hook enforcement
- Document retrospective notes
- **Blocking:** Phase 2 cannot proceed until this succeeds

---

## Phase 2: Environment Isolation (Week 2)

### #8 Configure Railway preview environments
**Status:** Queued | **Priority:** Medium | **Depends on:** #7
- Enable preview environment deployments
- Configure FEATURE_SLUG extraction from branch name
- Set up database provisioning deploy hooks
- Create `docs/railway-setup.md`
- Test with one feature branch deployment

### #9 Test concurrent feature cells with environment isolation
**Status:** Queued | **Priority:** High (validation) | **Depends on:** #7, #8
- Run 2–3 concurrent cells simultaneously
- Verify database schema isolation (separate `feat_*` schemas)
- Verify Railway preview environment isolation
- Verify scope enforcement in each cell independently
- Verify no conflicts between concurrent cells
- Document retrospective
- **Blocking:** Phase 3 cannot proceed until this succeeds

---

## Phase 3: Contract Freezing (Week 3)

### #10 Create contracts/ directory and documentation
**Status:** Queued | **Priority:** High
- Create `contracts/` directory structure
- Create `contracts/README.md` with contract freezing guidelines
- Create `contracts/CHANGELOG.md` template
- Update CLAUDE.md with contract freezing section

### #11 Define and test contract change workflow
**Status:** Queued | **Priority:** Medium | **Depends on:** #10
- Create `docs/contract-workflow.md` with detailed procedures
- Execute mock contract change end-to-end
- Verify pre-commit hook enforces contract restrictions
- Verify dependent cells can resume after contract merge

---

## Phase 4: CI/CD & Merge Sequencing (Week 4)

### #12 Enhance CI pipeline with integration checks
**Status:** Queued | **Priority:** High
- Add SCOPE.json validation job to feature-ci.yml
- Add integration check job (rebase, build, test)
- Add scope enforcement validation
- Implement summary reporting to PRs
- Test with feature branch PR

### #13 Create and document merge queue system
**Status:** Queued | **Priority:** Medium
- Create MERGE_QUEUE.md template
- Create `docs/merge-procedure.md` with step-by-step procedures
- Update CLAUDE.md with merge sequencing section
- Test procedure with at least one real merge

### #14 Test multi-cell merge sequence
**Status:** Queued | **Priority:** High (validation) | **Depends on:** #12, #13
- Prepare 2–3 cells with dependencies
- Execute full merge sequence respecting dependencies
- Verify no conflicts despite sequential dependencies
- Document retrospective
- **Blocking:** System validation complete only after this succeeds

---

## Ongoing Issues

### #15 Establish coordinator daily workflow
**Status:** Queued | **Priority:** Medium
- Document morning session checklist (20–30 min)
- Document evening session checklist (20–30 min)
- Create GitHub project board for workflow
- Create `docs/coordinator-workflow.md`
- Update CLAUDE.md
- Follow workflow for one week, collect feedback

### #16 Create retrospective template and process
**Status:** Queued | **Priority:** Low
- Create `docs/retrospectives/TEMPLATE.md`
- Create `docs/retrospectives/INSIGHTS.md` for aggregating patterns
- Write first 3 retrospectives (from Phase 1/2 testing)
- Document process for ongoing use

### #17 Iterate on SCOPE.json templates based on real usage
**Status:** Queued | **Priority:** Low | **Depends on:** #7, #9, #14
- Analyze scope violations from completed cells
- Create project-specific SCOPE.json templates:
  - `templates/SCOPE-nodots-backgammon.template.json`
  - `templates/SCOPE-a2z-freight-claims.template.json`
- Create `docs/scope-design-guide.md` (decision tree)
- Update `templates/README.md` with patterns

---

## Additional Issues

### #18 Create quick start guide for new coordinators
**Status:** Queued | **Priority:** Low
- Create `docs/quickstart.md` (1500–2000 words)
- Cover: what is this, setup, first cell, daily workflow, troubleshooting
- Test with fresh reader
- Update README.md with link

### #19 Create video walkthrough of coordination system
**Status:** Queued | **Priority:** Low
- Record 10–15 minute screencast
- Show: morning session, agent working, blocker handling, completion, evening session
- Upload to YouTube/Vimeo/Loom
- Link from README.md, CLAUDE.md, quickstart.md

### #20 Create CLI tool for coordinator workflows
**Status:** Queued | **Priority:** Low
- Implement `auto-shop cell create <name>`
- Implement `auto-shop cell list`
- Implement `auto-shop cell teardown <name>`
- Implement `auto-shop queue show`
- Implement `auto-shop queue next`
- Implement `auto-shop help`
- Document in CLAUDE.md

---

## Implementation Order

**Week 1 (Phase 1):**
1. #3 Review infrastructure (blocking)
2. #4 Create labels
3. #5 Create issue templates
4. #4 Create templates directory
5. #7 Pilot test (validation)

**Week 2 (Phase 2):**
6. #8 Railway setup
7. #9 Concurrent testing (validation)

**Week 3 (Phase 3):**
8. #10 Contracts directory
9. #11 Contract workflow

**Week 4 (Phase 4):**
10. #12 CI enhancements
11. #13 Merge queue
12. #14 Multi-cell merge (validation)

**Ongoing:**
13. #15 Daily workflow
14. #16 Retrospectives
15. #17 Template iteration

**As time permits:**
16. #18 Quick start guide
17. #19 Video walkthrough
18. #20 CLI tool

---

## Success Criteria

The entire implementation is successful when:

- [ ] All Phase 1–4 issues completed
- [ ] All validation tests (#7, #9, #14) pass
- [ ] Successfully running 4 concurrent cells without conflicts
- [ ] Coordinator can manage queue in 2×30-minute sessions per day
- [ ] Zero scope violations (pre-commit hook catches all)
- [ ] Clean merge sequences with no conflicts
- [ ] Documentation complete and usable by new coordinators
- [ ] At least 3 cells completed end-to-end using the system

---

## Labels Available

All required labels have been created:

**Cell Status:** `cell:queued`, `cell:active`, `cell:blocked`, `cell:awaiting-review`, `cell:merged`, `cell:contract-change`

**Phases:** `phase-1`, `phase-2`, `phase-3`, `phase-4`

**Categories:** `epic`, `infrastructure`, `github-config`, `documentation`, `process`, `testing`, `tooling`, `improvement`, `ongoing`, `enhancement`

---

## Files to Create

Issues reference these files (to be created during implementation):

**Configuration & Automation:**
- `.github/ISSUE_TEMPLATE/feature-cell.md`
- `.github/ISSUE_TEMPLATE/contract-change.md`
- `.github/ISSUE_TEMPLATE/blocker.md`
- `.github/workflows/feature-ci.yml` (enhanced)

**Templates:**
- `templates/SCOPE.json.template`
- `templates/SCOPE-nodots-backgammon.template.json`
- `templates/SCOPE-a2z-freight-claims.template.json`
- `templates/agent-prompt.template.md`
- `templates/BLOCKER.md.template`
- `templates/HANDOFF.md.template`
- `templates/MERGE_QUEUE.md.template`
- `templates/README.md`

**Core Documents:**
- `MERGE_QUEUE.md` (living document at repo root)
- `contracts/README.md`
- `contracts/CHANGELOG.md`
- `contracts/.gitkeep`

**Documentation:**
- `docs/railway-setup.md`
- `docs/contract-workflow.md`
- `docs/coordinator-workflow.md`
- `docs/merge-procedure.md`
- `docs/scope-design-guide.md`
- `docs/quickstart.md`
- `docs/retrospectives/TEMPLATE.md`
- `docs/retrospectives/INSIGHTS.md`
- `docs/retrospectives/` (directory for individual retrospectives)

**CLI Tool:**
- `bin/auto-shop` (executable)
- `lib/auto-shop-*.js` (module files)

**Updates to Existing Files:**
- `README.md` (add quick start, video links)
- `CLAUDE.md` (add sections on templates, contracts, CLI, merge queue, coordinator workflow)

---

## Next Steps

1. **Review this document** with the team
2. **Approve the issue plan** — confirm phases, timeline, scope
3. **Start Phase 1** — Begin with issues #3 and #4 in parallel, then #5–#7
4. **Track progress** — Use GitHub project board or labels to track status
5. **After each validation test** (#7, #9, #14) — Review retrospectives before proceeding to next phase

---

## Questions for the Coordinator

- Should we adjust the 4-week timeline? (Can we do faster? Should we be more conservative?)
- Which projects should be the pilot cells in Issue #7? (Recommend Cell 1: gnubg-hints)
- Is Railway the right choice for preview environments, or should we evaluate alternatives?
- Should the CLI tool be optional, or mandatory before proceeding?

---

**Issues are live on GitHub at:** https://github.com/nodots/auto-shop/issues/

Check them out, start with #3, and follow the implementation order above.

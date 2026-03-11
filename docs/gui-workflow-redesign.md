# GUI Workflow Redesign

Date: 2026-03-11
Epic: #31

## Goal

Redesign the GUI around the coordinator's real workflow instead of the auto-shop metaphor.

The primary object in the interface is a GitHub issue. Auto Shop execution records exist to
support issue delivery, not to replace issue management.

## Primary Navigation

- Workflow: project-by-project board grouped by work state
- Active Work: execution-oriented view for in-progress and blocked work
- Delivery: review-ready work and merge/deploy sequencing
- Projects: project configuration and repository metadata

## Canonical Workflow States

These are the user-facing states the GUI should present:

| UI state | Meaning | Primary source |
| --- | --- | --- |
| Backlog | Work exists as a GitHub issue but has not been queued for execution | GitHub labels / absence of workflow labels |
| Ready | Defined and ready to start when capacity is available | `cell:queued` label or linked execution record with `queued` status |
| In Progress | Active implementation is underway | `cell:active` label or linked execution record with `active` status |
| Blocked | Work is stopped and needs coordinator action | `cell:blocked` label or linked execution record with `blocked` status |
| In Review | Implementation is complete and waiting for review | `cell:awaiting-review` label or linked execution record with `awaiting-review` status |
| Promotion | Work has merged into an intermediate branch on the project's promotion path | merged PR target branch |
| Shipping | Work has reached the last branch before `main`, or is explicitly approved for `main` on direct-to-main projects | merged PR target branch or manual approval queue |
| Done | Merged to `main` | merged PR target branch `main` |

## Source-of-Truth Rules

1. If a merged PR has reached `main`, the issue is Done.
2. If a merged PR has reached the last pre-`main` branch in `promotionPath`, the issue is Shipping.
3. If a merged PR has reached an earlier branch in `promotionPath`, the issue is Promotion.
4. On direct-to-`main` projects, Shipping is the manual approval step before merging to `main`.
5. If an issue is linked to an execution record, the execution record status wins over GitHub labels until branch-promotion evidence exists.
6. If there is no linked execution record, GitHub labels determine workflow state.
7. If no workflow labels are present, the issue is Backlog.

## Terminology Decisions

Primary UX should use workflow language:

- "Workflow" instead of "Shop Floor"
- "Active Work" instead of "Bays"
- "Delivery" instead of "Release Lane"
- "Execution" instead of "Bay"
- "Issue workspace" instead of "Bay detail"

The auto-shop metaphor may still appear in implementation details or historical schema names,
but it should not be the main language of navigation, state labels, or page titles.

## Page Responsibilities

### Workflow

- Show every tracked project
- Group issues by canonical workflow state
- Make queue health legible at a glance
- Provide direct actions to inspect, edit, and transition work

### Issue Workspace

- Show GitHub issue content and coordinator-editable metadata
- Show linked execution context, branch, PR, blocker, handoff, and status history
- Allow workflow transitions and issue edits from one place

### Active Work

- Surface ready, in-progress, and blocked execution records
- Show dispatch/runtime context without making it the primary workflow model

### Delivery

- Surface review-ready work, merge queue ordering, and recent completions
- Keep merge/deploy sequencing connected to the original issue and project

## Non-Goals

- Preserve metaphor-first routes or labels for compatibility
- Treat CLI copy/paste as the primary interface
- Require coordinators to mentally map between issue state and UI state

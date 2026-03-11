import type { ChipProps } from '@mui/material/Chip';
import type { WorkflowIssueSummary, WorkflowProjectSummary } from './serviceDeskApi';

export type WorkflowAction = {
  label: string;
  detail: string;
  color: ChipProps['color'];
};

function formatBranchTarget(issue: WorkflowIssueSummary) {
  return issue.shippingBranch || issue.mainBranch;
}

export function getIssueAction(issue: WorkflowIssueSummary): WorkflowAction {
  switch (issue.workflowState) {
    case 'backlog':
      return {
        label: 'Queue or Close',
        detail: 'Not yet queued for execution.',
        color: 'default',
      };
    case 'ready':
      return {
        label: 'Start Work',
        detail: issue.linkedExecution
          ? `Execution is queued on ${issue.linkedExecution.branch}.`
          : 'Create an execution record and branch.',
        color: 'primary',
      };
    case 'in-progress':
      return {
        label: issue.linkedPullRequest ? 'Move to Review' : 'Open PR',
        detail: issue.linkedPullRequest
          ? `PR #${issue.linkedPullRequest.number} exists; move the issue to review when ready.`
          : issue.linkedExecution
            ? `Active on ${issue.linkedExecution.branch}; no PR linked yet.`
            : 'Active work has no linked execution context.',
        color: 'info',
      };
    case 'blocked':
      return {
        label: 'Resolve Blocker',
        detail: issue.linkedExecution?.blocker || 'Work cannot continue until the blocker is cleared.',
        color: 'error',
      };
    case 'review':
      return {
        label: issue.shippingMode === 'approval' ? 'Approve for Main' : `Merge to ${formatBranchTarget(issue)}`,
        detail: issue.linkedPullRequest
          ? `PR #${issue.linkedPullRequest.number} is waiting for review.`
          : 'Review state has no PR linked yet.',
        color: 'warning',
      };
    case 'promotion':
      return {
        label: `Promote to ${formatBranchTarget(issue)}`,
        detail: issue.linkedPullRequest
          ? `Merged to ${issue.linkedPullRequest.baseRefName}; still needs the next branch promotion.`
          : 'Merged work has not reached the shipping branch yet.',
        color: 'secondary',
      };
    case 'shipping':
      return {
        label: `Merge to ${issue.mainBranch}`,
        detail:
          issue.shippingMode === 'approval'
            ? `Approved for manual merge to ${issue.mainBranch}.`
            : `Already on ${issue.shippingBranch}; next step is ${issue.mainBranch}.`,
        color: 'success',
      };
    case 'done':
      return {
        label: 'Complete',
        detail: `Merged to ${issue.mainBranch}.`,
        color: 'success',
      };
  }
}

export function getProjectActions(project: WorkflowProjectSummary) {
  const actions: WorkflowAction[] = [];

  if (project.states.blocked.length > 0) {
    actions.push({
      label: `Resolve ${project.states.blocked.length} Blocked`,
      detail: 'Blocked work is the highest priority because nothing else moves until it is cleared.',
      color: 'error',
    });
  }

  if (project.states.review.length > 0) {
    actions.push({
      label: `Review ${project.states.review.length}`,
      detail: 'These issues need review or approval before they can advance.',
      color: 'warning',
    });
  }

  if (project.states.promotion.length > 0) {
    actions.push({
      label: `Promote ${project.states.promotion.length}`,
      detail: 'These issues are merged, but not yet on the final pre-main branch.',
      color: 'secondary',
    });
  }

  if (project.states.shipping.length > 0) {
    actions.push({
      label: `Ship ${project.states.shipping.length}`,
      detail: 'These issues are at the last step before main and need final promotion or merge.',
      color: 'success',
    });
  }

  if (project.states.ready.length > 0) {
    actions.push({
      label: `Start ${project.states.ready.length}`,
      detail: 'These issues are ready to begin when capacity is available.',
      color: 'primary',
    });
  }

  if (project.states['in-progress'].length > 0) {
    actions.push({
      label: `Check ${project.states['in-progress'].length} Active`,
      detail: 'Active work should either add a PR, update handoff notes, or move to review.',
      color: 'info',
    });
  }

  return actions.slice(0, 3);
}

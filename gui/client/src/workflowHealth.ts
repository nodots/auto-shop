import type { ChipProps } from '@mui/material/Chip';
import type {
  SchedulerSession,
  WorkflowIssueDetail,
  WorkflowIssueSummary,
} from './serviceDeskApi';

const NO_MOVEMENT_ATTENTION_MS = 2 * 60 * 60 * 1000;

export type WorkflowHealth = {
  signals: Array<{
    label: string;
    color: ChipProps['color'];
  }>;
  lastMovementAt: string | null;
};

function latestIsoDate(values: Array<string | null | undefined>) {
  const filtered = values.filter(Boolean) as string[];
  if (filtered.length === 0) return null;

  return filtered.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

export function getIssueLastMovementAt(issue: WorkflowIssueSummary | WorkflowIssueDetail) {
  const historyDates = 'history' in issue ? issue.history.map((item) => item.changedAt) : [];
  const commentDates = 'commentsList' in issue ? issue.commentsList.map((item) => item.createdAt) : [];

  return latestIsoDate([
    issue.updatedAt,
    issue.linkedExecution?.updatedAt,
    ...historyDates,
    ...commentDates,
  ]);
}

export function getIssueHealth(
  issue: WorkflowIssueSummary | WorkflowIssueDetail,
  session?: SchedulerSession | null
): WorkflowHealth | null {
  if (issue.workflowState !== 'in-progress') {
    return null;
  }

  const lastMovementAt = getIssueLastMovementAt(issue);
  const noRecentMovement =
    lastMovementAt !== null && Date.now() - new Date(lastMovementAt).getTime() > NO_MOVEMENT_ATTENTION_MS;
  const signals: WorkflowHealth['signals'] = [];

  if (!session) {
    signals.push({ label: 'Runtime session missing', color: 'warning' });
  }
  if (!issue.linkedPullRequest) {
    signals.push({ label: 'PR not linked', color: 'warning' });
  }
  if (noRecentMovement) {
    signals.push({ label: 'No movement in the last 2h', color: 'warning' });
  }

  return {
    signals,
    lastMovementAt,
  };
}

import type { ChipProps } from '@mui/material/Chip';

export const WORKFLOW_STATES = [
  'backlog',
  'ready',
  'in-progress',
  'blocked',
  'review',
  'promotion',
  'shipping',
  'done',
] as const;

export type WorkflowState = (typeof WORKFLOW_STATES)[number];
export type MutableWorkflowState = Exclude<WorkflowState, 'promotion' | 'shipping'>;

export const workflowStateLabels: Record<WorkflowState, string> = {
  backlog: 'Backlog',
  ready: 'Ready',
  'in-progress': 'In Progress',
  blocked: 'Blocked',
  review: 'In Review',
  promotion: 'Promotion',
  shipping: 'Shipping',
  done: 'Done',
};

export const workflowStateDescriptions: Record<WorkflowState, string> = {
  backlog: 'Not yet queued for execution',
  ready: 'Defined and waiting for capacity',
  'in-progress': 'Execution is underway',
  blocked: 'Needs coordinator action',
  review: 'Ready for review',
  promotion: 'Merged into an intermediate branch',
  shipping: 'At the final pre-main step',
  done: 'Merged to main',
};

export const workflowStateColors: Record<WorkflowState, ChipProps['color']> = {
  backlog: 'default',
  ready: 'primary',
  'in-progress': 'info',
  blocked: 'error',
  review: 'warning',
  promotion: 'secondary',
  shipping: 'secondary',
  done: 'success',
};

export function executionStatusToWorkflowState(status: string): WorkflowState {
  const map: Record<string, WorkflowState> = {
    queued: 'ready',
    active: 'in-progress',
    blocked: 'blocked',
    'awaiting-review': 'review',
    merged: 'done',
  };

  return map[status] || 'backlog';
}

export function issueRefToPath(issueRef: string) {
  return `/issues/${encodeURIComponent(issueRef)}`;
}

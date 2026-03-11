import Chip from '@mui/material/Chip';
import type { WorkflowState } from '../workflow';
import { workflowStateColors, workflowStateLabels } from '../workflow';

export default function WorkflowStateBadge({ state }: { state: WorkflowState }) {
  return (
    <Chip
      label={workflowStateLabels[state]}
      color={workflowStateColors[state]}
      size="small"
      variant="outlined"
    />
  );
}

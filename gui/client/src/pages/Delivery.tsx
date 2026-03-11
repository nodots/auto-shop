import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  fetchMergeQueue,
  fetchWorkflowOverview,
  type WorkflowIssueSummary,
} from '../serviceDeskApi';
import WorkflowStateBadge from '../components/WorkflowStateBadge';
import { issueRefToPath } from '../workflow';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

function flatten(issues: WorkflowIssueSummary[][]) {
  return issues.flat().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export default function Delivery() {
  const workflowQuery = useQuery({
    queryKey: ['workflow-overview'],
    queryFn: () => fetchWorkflowOverview(),
  });
  const mergeQueueQuery = useQuery({
    queryKey: ['merge-queue'],
    queryFn: fetchMergeQueue,
  });

  if (workflowQuery.isLoading) return <CircularProgress />;
  if (workflowQuery.error) {
    return <Alert severity="error">{(workflowQuery.error as Error).message}</Alert>;
  }
  if (!workflowQuery.data) return null;

  const reviewIssues = flatten(workflowQuery.data.projects.map((project) => project.states.review));
  const promotionIssues = flatten(
    workflowQuery.data.projects.map((project) => project.states.promotion)
  );
  const shippingIssues = flatten(
    workflowQuery.data.projects.map((project) => project.states.shipping)
  );
  const doneIssues = flatten(workflowQuery.data.projects.map((project) => project.states.done)).slice(0, 10);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          Delivery
        </Typography>
        <Typography color="text.secondary">
          Review, branch promotion, final pre-main shipping, and recent completions.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: 'repeat(4, minmax(0, 1fr))' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <DeliverySection title="In Review" issues={reviewIssues} />
        <DeliverySection title="Promotion" issues={promotionIssues} />
        <DeliverySection title="Shipping" issues={shippingIssues} />
        <DeliverySection title="Done" issues={doneIssues} />
      </Box>

      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Merge Queue
        </Typography>
        {mergeQueueQuery.isLoading ? (
          <CircularProgress size={24} />
        ) : mergeQueueQuery.error ? (
          <Alert severity="info">Merge queue data is unavailable.</Alert>
        ) : !mergeQueueQuery.data || mergeQueueQuery.data.length === 0 ? (
          <Typography color="text.secondary">No items are queued for delivery.</Typography>
        ) : (
          <Stack spacing={1.25}>
            {mergeQueueQuery.data.map((item, index) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography fontWeight={700}>
                  {index + 1}. {item.feature}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.project} · {item.branch}
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}

function DeliverySection({ title, issues }: { title: string; issues: WorkflowIssueSummary[] }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
      <Stack spacing={1.5}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={800}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {issues.length}
          </Typography>
        </Box>

        {issues.length === 0 ? (
          <Typography color="text.secondary">No issues in this state.</Typography>
        ) : (
          issues.map((issue) => (
            <Paper key={issue.issueRef} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Typography fontWeight={700}>{issue.title}</Typography>
                  <WorkflowStateBadge state={issue.workflowState} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {issue.project} · {issue.repo}
                </Typography>
                <Button component={Link} to={issueRefToPath(issue.issueRef)} size="small" variant="outlined">
                  Open Workspace
                </Button>
              </Stack>
            </Paper>
          ))
        )}
      </Stack>
    </Paper>
  );
}

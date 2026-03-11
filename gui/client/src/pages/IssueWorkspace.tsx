import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createExecutionForIssue,
  fetchWorkflowIssue,
  updateWorkflowIssue,
  type WorkflowIssueDetail,
} from '../serviceDeskApi';
import WorkflowStateBadge from '../components/WorkflowStateBadge';
import {
  issueRefToPath,
  WORKFLOW_STATES,
  workflowStateLabels,
  type MutableWorkflowState,
  type WorkflowState,
} from '../workflow';
import { getIssueAction } from '../workflowActions';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';

const editableWorkflowStates = WORKFLOW_STATES.filter(
  (state): state is MutableWorkflowState => state !== 'promotion' && state !== 'shipping'
);

function prettyJson(value: object | null) {
  return value ? JSON.stringify(value, null, 2) : '';
}

function toEditableWorkflowState(state: WorkflowState): MutableWorkflowState {
  if (state === 'promotion' || state === 'shipping') {
    return 'review';
  }

  return state;
}

function getWorkflowGuidance(issue: WorkflowIssueDetail) {
  const action = getIssueAction(issue);

  switch (issue.workflowState) {
    case 'backlog':
      return {
        severity: 'info' as const,
        title: 'Not started',
        body: 'Queue this issue when the definition is complete and capacity is available.',
      };
    case 'ready':
      return {
        severity: 'info' as const,
        title: 'Ready to start',
        body: issue.linkedExecution
          ? `Execution exists on ${issue.linkedExecution.branch}. Start implementation by moving the issue to In Progress.`
          : 'Create an execution record to assign a branch and start the work.',
      };
    case 'in-progress':
      return {
        severity: 'info' as const,
        title: 'Implementation underway',
        body: `${action.detail} The next milestone is moving the issue to In Review.`,
      };
    case 'blocked':
      return {
        severity: 'warning' as const,
        title: 'Blocked',
        body: issue.linkedExecution?.blocker || 'Coordinator action is required before work can continue.',
      };
    case 'review':
      return {
        severity: 'info' as const,
        title: 'Waiting for review',
        body: issue.shippingMode === 'approval'
          ? `Review the PR, then mark it approved for manual merge to ${issue.mainBranch}.`
          : issue.shippingBranch
            ? `Review the PR, then merge it into ${issue.shippingBranch} to enter Shipping.`
            : 'Review the linked PR and decide whether it should move forward.',
      };
    case 'promotion':
      return {
        severity: 'info' as const,
        title: 'Promoted, not yet shipping',
        body:
          issue.shippingBranch && issue.linkedPullRequest
            ? `This work has reached ${issue.linkedPullRequest.baseRefName}. Promote it to ${issue.shippingBranch} before it counts as Shipping.`
            : 'This work is on the promotion path but has not reached the final pre-main branch yet.',
      };
    case 'shipping':
      return {
        severity: 'success' as const,
        title: 'At the final pre-main step',
        body: issue.shippingMode === 'approval'
          ? `This work is approved for manual merge to ${issue.mainBranch}.`
          : `This work has reached ${issue.shippingBranch}. The next step is merging it to ${issue.mainBranch}.`,
      };
    case 'done':
      return {
        severity: 'success' as const,
        title: 'Complete',
        body: `This work has reached ${issue.mainBranch}.`,
      };
  }
}

function getLastMovement(issue: WorkflowIssueDetail) {
  const historyItem = [...issue.history]
    .filter((item) => item.changedAt)
    .sort((a, b) => new Date(b.changedAt || 0).getTime() - new Date(a.changedAt || 0).getTime())[0];

  if (historyItem?.changedAt) {
    return {
      label: `${historyItem.fromStatus || 'none'} -> ${historyItem.toStatus}`,
      at: historyItem.changedAt,
      note: historyItem.note || 'Execution status changed.',
    };
  }

  const commentItem = [...issue.commentsList]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (commentItem) {
    return {
      label: `Comment by ${commentItem.author}`,
      at: commentItem.createdAt,
      note: commentItem.body,
    };
  }

  return null;
}

export default function IssueWorkspace() {
  const { issueRef: rawIssueRef } = useParams<{ issueRef: string }>();
  const queryClient = useQueryClient();
  const issueRef = decodeURIComponent(rawIssueRef || '');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [assignee, setAssignee] = useState('');
  const [workflowStateOverride, setWorkflowStateOverride] = useState<MutableWorkflowState | null>(null);
  const [comment, setComment] = useState('');
  const [blocker, setBlocker] = useState('');
  const [handoff, setHandoff] = useState('');
  const [githubPrUrl, setGithubPrUrl] = useState('');
  const [scopeText, setScopeText] = useState('');
  const [inShippingQueue, setInShippingQueue] = useState(false);
  const [feature, setFeature] = useState('');
  const [branch, setBranch] = useState('');
  const [formError, setFormError] = useState('');

  const issueQuery = useQuery({
    queryKey: ['workflow-issue', issueRef],
    queryFn: () => fetchWorkflowIssue(issueRef),
    enabled: Boolean(issueRef),
  });

  useEffect(() => {
    if (!issueQuery.data) return;
    setTitle(issueQuery.data.title);
    setBody(issueQuery.data.body);
    setAssignee(issueQuery.data.assignee || '');
    setWorkflowStateOverride(null);
    setComment('');
    setBlocker(issueQuery.data.linkedExecution?.blocker || '');
    setHandoff(issueQuery.data.linkedExecution?.handoff || '');
    setGithubPrUrl(issueQuery.data.linkedExecution?.githubPrUrl || '');
    setScopeText(prettyJson(issueQuery.data.linkedExecution?.scope || null));
    setInShippingQueue(issueQuery.data.inShippingQueue);
    setFeature(issueQuery.data.title);
    setBranch(
      `feat/${issueQuery.data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`
    );
    setFormError('');
  }, [issueQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const issueData = issueQuery.data;
      if (!issueData) {
        throw new Error('Issue data is not loaded yet');
      }

      let scope: object | null | undefined = undefined;

      if (scopeText.trim()) {
        try {
          scope = JSON.parse(scopeText);
        } catch {
          throw new Error('Scope JSON is invalid');
        }
      } else if (issueData.linkedExecution) {
        scope = null;
      }

      return updateWorkflowIssue(issueRef, {
        title,
        body,
        assignee: assignee.trim() || null,
        workflowState: workflowStateOverride ?? undefined,
        comment: comment.trim() || undefined,
        blocker: blocker.trim() || null,
        handoff: handoff.trim() || null,
        githubPrUrl: githubPrUrl.trim() || null,
        scope,
        inShippingQueue: issueData.shippingMode === 'approval' ? inShippingQueue : undefined,
      });
    },
    onSuccess: (data) => {
      setFormError('');
      queryClient.setQueryData(['workflow-issue', issueRef], data);
      queryClient.invalidateQueries({ queryKey: ['workflow-overview'] });
      setComment('');
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const createExecutionMutation = useMutation({
    mutationFn: () =>
      createExecutionForIssue(issueRef, {
        feature: feature.trim(),
        branch: branch.trim(),
      }),
    onSuccess: (data) => {
      setFormError('');
      queryClient.setQueryData(['workflow-issue', issueRef], data);
      queryClient.invalidateQueries({ queryKey: ['workflow-overview'] });
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const issueSummary = useMemo(() => {
    if (!issueQuery.data) return null;
    return [
      ['Project', issueQuery.data.project || 'Unmapped'],
      ['Repository', issueQuery.data.repo],
      ['Issue', `#${issueQuery.data.number}`],
      ['Main Branch', issueQuery.data.mainBranch],
      ['Shipping Step', issueQuery.data.shippingBranch || 'Manual approval'],
      ['Updated', new Date(issueQuery.data.updatedAt).toLocaleString()],
      ['Workflow Source', issueQuery.data.workflowSource],
    ] as const;
  }, [issueQuery.data]);

  const workflowGuidance = useMemo(
    () => (issueQuery.data ? getWorkflowGuidance(issueQuery.data) : null),
    [issueQuery.data]
  );
  const actionSummary = useMemo(
    () => (issueQuery.data ? getIssueAction(issueQuery.data) : null),
    [issueQuery.data]
  );
  const lastMovement = useMemo(
    () => (issueQuery.data ? getLastMovement(issueQuery.data) : null),
    [issueQuery.data]
  );

  if (issueQuery.isLoading) return <CircularProgress />;
  if (issueQuery.error) {
    return <Alert severity="error">{(issueQuery.error as Error).message}</Alert>;
  }
  if (!issueQuery.data) return null;

  return (
    <Stack spacing={3}>
      <Button component={Link} to="/" variant="text" sx={{ alignSelf: 'flex-start' }}>
        Back to workflow
      </Button>

      <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h4" fontWeight={800}>
                {issueQuery.data.title}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                {issueQuery.data.repo} · #{issueQuery.data.number}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <WorkflowStateBadge state={issueQuery.data.workflowState} />
              <Button
                component="a"
                href={issueQuery.data.htmlUrl}
                target="_blank"
                rel="noreferrer"
                variant="outlined"
                startIcon={<OpenInNewRoundedIcon />}
              >
                Open in GitHub
              </Button>
            </Stack>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(5, minmax(0, 1fr))' },
              gap: 1.5,
            }}
          >
            {issueSummary?.map(([label, value]) => (
              <Paper key={label} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {value}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Stack>
      </Paper>

      {formError && <Alert severity="error">{formError}</Alert>}

      {workflowGuidance && (
        <Alert severity={workflowGuidance.severity}>
          <strong>{workflowGuidance.title}</strong> {workflowGuidance.body}
        </Alert>
      )}

      {issueQuery.data && actionSummary && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
            gap: 1.5,
          }}
        >
          <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Current Status
            </Typography>
            <Typography variant="body2" fontWeight={800} sx={{ mt: 0.4 }}>
              {workflowStateLabels[issueQuery.data.workflowState]}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4 }}>
              Source: {issueQuery.data.workflowSource}
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Next Action
            </Typography>
            <Typography variant="body2" fontWeight={800} sx={{ mt: 0.4 }}>
              {actionSummary.label}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4 }}>
              {actionSummary.detail}
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Last Movement
            </Typography>
            {lastMovement ? (
              <>
                <Typography variant="body2" fontWeight={800} sx={{ mt: 0.4 }}>
                  {lastMovement.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4 }}>
                  {new Date(lastMovement.at).toLocaleString()}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    mt: 0.4,
                  }}
                >
                  {lastMovement.note}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                No recorded movement yet.
              </Typography>
            )}
          </Paper>
        </Box>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.2fr) minmax(360px, 0.8fr)' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={800}>
              Issue Workspace
            </Typography>
            <TextField label="Title" value={title} onChange={(event) => setTitle(event.target.value)} fullWidth />
            <TextField
              label="Body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              multiline
              minRows={12}
              fullWidth
            />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                gap: 1.5,
              }}
            >
              <TextField
                label="Assignee"
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
                helperText="GitHub login or leave blank"
              />
              <TextField
                label="Workflow State"
                select
                SelectProps={{ native: true }}
                value={workflowStateOverride ?? toEditableWorkflowState(issueQuery.data.workflowState)}
                onChange={(event) =>
                  setWorkflowStateOverride(event.target.value as MutableWorkflowState)
                }
                helperText={
                  issueQuery.data.workflowState === 'promotion' || issueQuery.data.workflowState === 'shipping'
                    ? 'Derived delivery states are read from branch promotion or main-approval status until you explicitly override them.'
                    : undefined
                }
              >
                {editableWorkflowStates.map((state) => (
                  <option key={state} value={state}>
                    {workflowStateLabels[state]}
                  </option>
                ))}
              </TextField>
            </Box>

            {issueQuery.data.labels.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {issueQuery.data.labels.map((label) => (
                  <Chip key={label} label={label} size="small" variant="outlined" />
                ))}
              </Box>
            )}

            <TextField
              label="Coordinator Comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              multiline
              minRows={4}
              fullWidth
              helperText="This will be posted as a GitHub issue comment when you save."
            />

            <Button
              variant="contained"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Issue Workspace'}
            </Button>
          </Stack>
        </Paper>

        <Stack spacing={2}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={800}>
                Execution Context
              </Typography>

              {issueQuery.data.linkedExecution ? (
                <>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 1.5,
                    }}
                  >
                    <TextField label="Feature" value={issueQuery.data.linkedExecution.feature} disabled />
                    <TextField label="Branch" value={issueQuery.data.linkedExecution.branch} disabled />
                  </Box>

                  <TextField
                    label="Pull Request URL"
                    value={githubPrUrl}
                    onChange={(event) => setGithubPrUrl(event.target.value)}
                    fullWidth
                  />
                  {issueQuery.data.linkedPullRequest && (
                    <Alert severity="info">
                      Latest merged PR targets <strong>{issueQuery.data.linkedPullRequest.baseRefName}</strong>.
                      {issueQuery.data.shippingBranch
                        ? ` Shipping starts when work reaches ${issueQuery.data.shippingBranch}.`
                        : ` Shipping is the manual approval step before merging to ${issueQuery.data.mainBranch}.`}
                    </Alert>
                  )}
                  <TextField
                    label="Blocker"
                    value={blocker}
                    onChange={(event) => setBlocker(event.target.value)}
                    multiline
                    minRows={4}
                    fullWidth
                  />
                  <TextField
                    label="Handoff"
                    value={handoff}
                    onChange={(event) => setHandoff(event.target.value)}
                    multiline
                    minRows={4}
                    fullWidth
                  />
                  <TextField
                    label="Scope JSON"
                    value={scopeText}
                    onChange={(event) => setScopeText(event.target.value)}
                    multiline
                    minRows={10}
                    fullWidth
                    InputProps={{ sx: { fontFamily: 'monospace' } }}
                  />

                  {issueQuery.data.shippingMode === 'approval' && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={inShippingQueue}
                          onChange={(event) => setInShippingQueue(event.target.checked)}
                        />
                      }
                      label={`Approved for manual merge to ${issueQuery.data.mainBranch}`}
                    />
                  )}
                </>
              ) : (
                <>
                  <Alert severity="info">
                    This issue does not have a linked execution record yet.
                  </Alert>
                  <TextField
                    label="Execution Name"
                    value={feature}
                    onChange={(event) => setFeature(event.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Branch"
                    value={branch}
                    onChange={(event) => setBranch(event.target.value)}
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    onClick={() => createExecutionMutation.mutate()}
                    disabled={createExecutionMutation.isPending}
                  >
                    {createExecutionMutation.isPending ? 'Creating...' : 'Create Execution'}
                  </Button>
                </>
              )}
            </Stack>
          </Paper>

          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={800}>
                Recent Activity
              </Typography>
              {issueQuery.data.commentsList.length === 0 && issueQuery.data.history.length === 0 ? (
                <Typography color="text.secondary">No recent activity.</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {issueQuery.data.history.map((item) => (
                    <Box key={`history-${item.id}`}>
                      <Typography variant="body2" fontWeight={700}>
                        Execution status: {item.fromStatus || 'none'} → {item.toStatus}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.changedAt ? new Date(item.changedAt).toLocaleString() : 'Unknown time'}
                      </Typography>
                      {item.note && (
                        <Typography variant="body2" color="text.secondary">
                          {item.note}
                        </Typography>
                      )}
                      <Divider sx={{ mt: 1.25 }} />
                    </Box>
                  ))}
                  {issueQuery.data.commentsList.map((item) => (
                    <Box key={`comment-${item.id}`}>
                      <Typography variant="body2" fontWeight={700}>
                        GitHub comment by {item.author}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(item.createdAt).toLocaleString()}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ whiteSpace: 'pre-wrap', mt: 0.75 }}
                      >
                        {item.body}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Box>

      <Stack direction="row" spacing={1}>
        <Button variant="outlined" onClick={() => queryClient.invalidateQueries({ queryKey: ['workflow-overview'] })}>
          Refresh Workflow Data
        </Button>
        <Button variant="text" onClick={() => issueQuery.refetch()}>
          Refresh Workspace
        </Button>
      </Stack>
    </Stack>
  );
}

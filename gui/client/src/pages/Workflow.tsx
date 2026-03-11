import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchSchedulerStatus,
  fetchWorkflowOverview,
  updateWorkflowIssue,
  type SchedulerSession,
  type WorkflowIssueSummary,
} from '../serviceDeskApi';
import {
  WORKFLOW_STATES,
  issueRefToPath,
  workflowStateColors,
  workflowStateLabels,
  type WorkflowState,
} from '../workflow';
import { getIssueAction, getProjectActions } from '../workflowActions';
import { getIssueHealth } from '../workflowHealth';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { alpha, useTheme } from '@mui/material/styles';

function formatAge(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'now';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function matchesSearch(issue: WorkflowIssueSummary, search: string) {
  if (!search) return true;
  const value = search.toLowerCase();
  return (
    issue.title.toLowerCase().includes(value) ||
    issue.repo.toLowerCase().includes(value) ||
    issue.labels.some((label) => label.toLowerCase().includes(value))
  );
}

function summarizeIssueSupport(
  issue: WorkflowIssueSummary,
  detail: string,
  signalCount: number,
  firstSignal?: string
) {
  if (signalCount > 0) {
    return signalCount === 1 && firstSignal ? firstSignal : `${signalCount} checks need attention`;
  }
  if (issue.workflowState === 'blocked' && issue.linkedExecution?.blocker) {
    return issue.linkedExecution.blocker;
  }

  return detail;
}

export default function Workflow() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [refreshPending, setRefreshPending] = useState(false);

  const workflowQuery = useQuery({
    queryKey: ['workflow-overview'],
    queryFn: () => fetchWorkflowOverview(),
  });
  const schedulerQuery = useQuery({
    queryKey: ['scheduler'],
    queryFn: fetchSchedulerStatus,
    refetchInterval: 5000,
    retry: false,
  });

  const projects = useMemo(() => {
    if (!workflowQuery.data) return [];
    return workflowQuery.data.projects
      .filter((project) => !projectFilter || project.name === projectFilter)
      .map((project) => ({
        ...project,
        states: Object.fromEntries(
          WORKFLOW_STATES.map((state) => [
            state,
            project.states[state].filter((issue) => matchesSearch(issue, search)),
          ])
        ) as Record<WorkflowState, WorkflowIssueSummary[]>,
      }));
  }, [projectFilter, search, workflowQuery.data]);

  if (workflowQuery.isLoading) return <CircularProgress />;
  if (workflowQuery.error) {
    return <Alert severity="error">{(workflowQuery.error as Error).message}</Alert>;
  }
  if (!workflowQuery.data) return null;

  const compactTotals = WORKFLOW_STATES.map((state) => ({
    state,
    count: workflowQuery.data.totals[state],
  }));
  const sessionsByIssueRef = new Map(
    (schedulerQuery.data?.activeSessions || []).map((session) => [session.issueRef, session])
  );

  async function handleRefresh() {
    setRefreshPending(true);
    try {
      const refreshed = await fetchWorkflowOverview({ refresh: true });
      queryClient.setQueryData(['workflow-overview'], refreshed);
    } finally {
      setRefreshPending(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Stack spacing={1.5}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              gap: 1.5,
              justifyContent: 'space-between',
              alignItems: { lg: 'center' },
            }}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Workflow
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Project-by-state coordination board. Optimized for scanning in landscape.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {compactTotals.map(({ state, count }) => (
                <Chip
                  key={state}
                  label={`${workflowStateLabels[state]} ${count}`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 220px auto' },
              gap: 1,
              alignItems: 'center',
            }}
          >
            <TextField
              placeholder="Search title, repo, label"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              select
              SelectProps={{ native: true }}
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              size="small"
              fullWidth
            >
              <option value="">All projects</option>
              {workflowQuery.data.projects.map((project) => (
                <option key={project.name} value={project.name}>
                  {project.name}
                </option>
              ))}
            </TextField>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={handleRefresh}
              disabled={workflowQuery.isFetching || refreshPending}
              sx={{ justifySelf: { md: 'end' } }}
            >
              {refreshPending ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Box>
        </Stack>
      </Paper>

      {projects.length === 0 ? (
        <Alert severity="info">No issues match the current filters.</Alert>
      ) : (
        <>
          <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
            <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(9, minmax(0, 1fr))',
                    alignItems: 'stretch',
                  }}
                >
                  <MatrixHeaderCell label="Project" isProject />
                  {WORKFLOW_STATES.map((state) => (
                    <MatrixHeaderCell
                      key={state}
                      label={workflowStateLabels[state]}
                      count={workflowQuery.data.totals[state]}
                    />
                  ))}

                  {projects.map((project, rowIndex) => (
                    <ProjectRow
                      key={project.name}
                      project={project}
                      rowIndex={rowIndex}
                      sessionsByIssueRef={sessionsByIssueRef}
                    />
                  ))}
                </Box>
              </Box>
            </Paper>
          </Box>

          <Stack spacing={1.5} sx={{ display: { xs: 'flex', lg: 'none' } }}>
            {projects.map((project) => (
              <Paper key={project.name} sx={{ p: 1.5, borderRadius: 2 }}>
                <Stack spacing={1.25}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 1,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800}>
                        {project.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {project.repo}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${project.issueCount} issues`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                    {getProjectActions(project).length === 0 ? (
                      <Chip label="No immediate action" size="small" variant="outlined" />
                    ) : (
                      getProjectActions(project).map((action) => (
                        <Chip
                          key={action.label}
                          label={action.label}
                          size="small"
                          color={action.color}
                          variant="outlined"
                        />
                      ))
                    )}
                  </Stack>

                  {WORKFLOW_STATES.map((state) => (
                    <Paper key={`${project.name}-${state}`} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                      <Stack spacing={0.75}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {workflowStateLabels[state]}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {project.states[state].length}
                          </Typography>
                        </Box>
                        {project.states[state].length === 0 ? (
                          <Typography variant="caption" color="text.secondary">
                            Empty
                          </Typography>
                        ) : (
                          project.states[state].slice(0, 3).map((issue) => (
                            <CompactIssueRow key={issue.issueRef} issue={issue} />
                          ))
                        )}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
}

function MatrixHeaderCell({
  label,
  count,
  isProject = false,
}: {
  label: string;
  count?: number;
  isProject?: boolean;
}) {
  return (
    <Box
      sx={{
        p: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default',
        minHeight: 54,
      }}
    >
      <Stack spacing={0.25}>
        <Typography
          variant={isProject ? 'body2' : 'caption'}
          fontWeight={800}
          color={isProject ? 'text.primary' : 'text.secondary'}
        >
          {label}
        </Typography>
        {count !== undefined && (
          <Typography variant="body2" fontWeight={700}>
            {count}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

function ProjectRow({
  project,
  rowIndex,
  sessionsByIssueRef,
}: {
  project: {
    name: string;
    repo: string;
    issueCount: number;
    executionCount: number;
    states: Record<WorkflowState, WorkflowIssueSummary[]>;
  };
  rowIndex: number;
  sessionsByIssueRef: Map<string, SchedulerSession>;
}) {
  const striped = rowIndex % 2 === 1;
  const projectActions = getProjectActions(project);

  return (
    <>
      <Box
        sx={{
          p: 0.85,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: striped ? alpha('#0f1726', 0.015) : 'background.paper',
          minHeight: 118,
          maxHeight: 188,
          overflowY: 'auto',
        }}
      >
        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
          <Typography
            variant="body2"
            fontWeight={800}
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {project.name}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {project.repo}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {project.issueCount} issues · {project.executionCount} linked
          </Typography>
          {projectActions.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              No immediate coordinator action.
            </Typography>
          ) : (
            <>
              <Chip
                label={projectActions[0].label}
                size="small"
                color={projectActions[0].color}
                variant="outlined"
                sx={{ alignSelf: 'flex-start', maxWidth: '100%' }}
              />
              <Typography variant="caption" color="text.secondary">
                {projectActions.length > 1 ? `+${projectActions.length - 1} more` : 'Top coordinator action'}
              </Typography>
            </>
          )}
        </Stack>
      </Box>
      {WORKFLOW_STATES.map((state) => (
        <Box
          key={`${project.name}-${state}`}
          sx={{
            p: 0.75,
            borderBottom: '1px solid',
            borderLeft: '1px solid',
            borderColor: 'divider',
            bgcolor: striped ? alpha('#0f1726', 0.015) : 'background.paper',
            minHeight: 118,
            maxHeight: 188,
            overflowY: 'auto',
          }}
        >
          <Stack spacing={0.75}>
            {project.states[state].length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                Empty
              </Typography>
            ) : (
              project.states[state].map((issue) => (
                <CompactIssueRow
                  key={issue.issueRef}
                  issue={issue}
                  session={sessionsByIssueRef.get(issue.issueRef)}
                />
              ))
            )}
          </Stack>
        </Box>
      ))}
    </>
  );
}

function CompactIssueRow({
  issue,
  session,
}: {
  issue: WorkflowIssueSummary;
  session?: SchedulerSession;
}) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const action = getIssueAction(issue);
  const health = getIssueHealth(issue, session);
  const issueActionMutation = useMutation({
    mutationFn: (input: { workflowState?: 'ready'; githubState?: 'closed' }) =>
      updateWorkflowIssue(issue.issueRef, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-overview'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-issue', issue.issueRef] });
    },
  });
  const canQueue = issue.workflowState === 'backlog' && issue.githubState === 'open';
  const canClose = issue.workflowState === 'backlog' && issue.githubState === 'open';

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 0.85,
        borderRadius: 1.5,
        boxShadow: 'none',
        backgroundColor: alpha(theme.palette.background.default, 0.45),
        minWidth: 0,
      }}
    >
      <Stack spacing={0.8} sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            lineHeight: 1.25,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {issue.title}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 0.75,
            minWidth: 0,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            #{issue.number} · {formatAge(issue.updatedAt)}
          </Typography>
          <Chip
            label={workflowStateLabels[issue.workflowState]}
            size="small"
            color={workflowStateColors[issue.workflowState]}
            variant="outlined"
            sx={{ flexShrink: 0 }}
          />
        </Box>

        <Typography
          variant="caption"
          color={health && health.signals.length > 0 ? 'warning.main' : 'text.secondary'}
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: 32,
          }}
        >
          {summarizeIssueSupport(
            issue,
            action.detail,
            health?.signals.length || 0,
            health?.signals[0]?.label
          )}
        </Typography>
        {(canQueue || canClose) && (
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            {canQueue && (
              <Button
                size="small"
                variant="outlined"
                disabled={issueActionMutation.isPending}
                onClick={() => issueActionMutation.mutate({ workflowState: 'ready' })}
                sx={{ minWidth: 0, px: 1.2, py: 0.25, fontSize: '0.72rem' }}
              >
                Queue
              </Button>
            )}
            {canClose && (
              <Button
                size="small"
                color="inherit"
                variant="outlined"
                disabled={issueActionMutation.isPending}
                onClick={() => issueActionMutation.mutate({ githubState: 'closed' })}
                sx={{ minWidth: 0, px: 1.2, py: 0.25, fontSize: '0.72rem' }}
              >
                Close
              </Button>
            )}
          </Stack>
        )}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 0.75,
            pt: 0.5,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Button
            component={Link}
            to={issueRefToPath(issue.issueRef)}
            size="small"
            variant="text"
            sx={{ minWidth: 0, px: 0, py: 0, fontSize: '0.72rem' }}
          >
            Workspace
          </Button>
          <IconButton
            component="a"
            href={issue.htmlUrl}
            target="_blank"
            rel="noreferrer"
            size="small"
            aria-label={`Open ${issue.issueRef} on GitHub`}
            sx={{ p: 0.25, ml: 'auto' }}
          >
            <OpenInNewRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Stack>
    </Paper>
  );
}

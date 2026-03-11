import { Link } from 'react-router-dom';
import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  fetchSessionLog,
  fetchSchedulerStatus,
  fetchWorkflowOverview,
  type SchedulerSession,
  type WorkflowIssueSummary,
} from '../serviceDeskApi';
import WorkflowStateBadge from '../components/WorkflowStateBadge';
import { issueRefToPath } from '../workflow';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

type SessionLogResult = {
  issueRef: string;
  log: string;
};

function formatTimestamp(value: string | null | undefined) {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleString();
}

function compactId(value: string) {
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function flatten(issues: WorkflowIssueSummary[][]) {
  return issues.flat().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export default function ActiveWork() {
  const workflowQuery = useQuery({
    queryKey: ['workflow-overview'],
    queryFn: () => fetchWorkflowOverview(),
  });
  const schedulerQuery = useQuery({
    queryKey: ['scheduler'],
    queryFn: fetchSchedulerStatus,
    refetchInterval: 5000,
  });

  if (workflowQuery.isLoading) return <CircularProgress />;
  if (workflowQuery.error) {
    return <Alert severity="error">{(workflowQuery.error as Error).message}</Alert>;
  }
  if (!workflowQuery.data) return null;

  const readyIssues = flatten(workflowQuery.data.projects.map((project) => project.states.ready));
  const inProgressIssues = flatten(
    workflowQuery.data.projects.map((project) => project.states['in-progress'])
  );
  const blockedIssues = flatten(workflowQuery.data.projects.map((project) => project.states.blocked));
  const activeSessions = schedulerQuery.data?.activeSessions || [];
  const sessionsByIssueRef = new Map(activeSessions.map((session) => [session.issueRef, session]));
  const logQueries = useQueries({
    queries: inProgressIssues.map((issue) => ({
      queryKey: ['session-log', issue.issueRef],
      queryFn: () => fetchSessionLog(issue.issueRef, 40),
      enabled: sessionsByIssueRef.has(issue.issueRef),
      refetchInterval: 5000,
      retry: false,
    })),
  }) as UseQueryResult<SessionLogResult, Error>[];
  const logsByIssueRef = new Map(
    inProgressIssues.map((issue, index) => [issue.issueRef, logQueries[index]])
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          Active Work
        </Typography>
        <Typography color="text.secondary">
          Execution-focused view for ready, in-progress, and blocked work.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: 'repeat(3, minmax(0, 1fr))' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <StateSection title="Ready" issues={readyIssues} />
        <StateSection
          title="In Progress"
          issues={inProgressIssues}
          sessionsByIssueRef={sessionsByIssueRef}
          logsByIssueRef={logsByIssueRef}
        />
        <StateSection title="Blocked" issues={blockedIssues} />
      </Box>

      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Runtime Sessions
        </Typography>
        {schedulerQuery.isLoading ? (
          <CircularProgress size={24} />
        ) : schedulerQuery.error ? (
          <Alert severity="info">
            Scheduler is unavailable. The workflow UI still works without it.
          </Alert>
        ) : !schedulerQuery.data ? null : (
          <Stack spacing={1.25}>
            <Typography color="text.secondary">
              {schedulerQuery.data.activeCount}/{schedulerQuery.data.maxSessions} sessions active
            </Typography>
            {schedulerQuery.data.activeSessions.length === 0 ? (
              <Typography color="text.secondary">No active sessions.</Typography>
            ) : (
              schedulerQuery.data.activeSessions.map((session) => (
                <Paper key={session.issueRef} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Stack spacing={0.75}>
                    <Typography fontWeight={700}>{session.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {session.issueRef} · {session.branch}
                    </Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                      <Chip label={`PID ${session.pid}`} size="small" variant="outlined" />
                      {session.claudeSessionId && (
                        <Chip
                          label={`Claude ${compactId(session.claudeSessionId)}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Last activity: {formatTimestamp(session.lastActivityAt)}
                    </Typography>
                    <Typography variant="body2">
                      {session.latestActivitySummary || 'Claude activity has not been observed yet.'}
                    </Typography>
                  </Stack>
                </Paper>
              ))
            )}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}

function StateSection({
  title,
  issues,
  sessionsByIssueRef,
  logsByIssueRef,
}: {
  title: string;
  issues: WorkflowIssueSummary[];
  sessionsByIssueRef?: Map<string, SchedulerSession>;
  logsByIssueRef?: Map<string, UseQueryResult<SessionLogResult, Error>>;
}) {
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
                {issue.linkedExecution && (
                  <Typography variant="caption" color="text.secondary">
                    {issue.linkedExecution.branch}
                  </Typography>
                )}
                {sessionsByIssueRef?.has(issue.issueRef) ? (
                  <RuntimeLogPreview
                    session={sessionsByIssueRef.get(issue.issueRef)!}
                    logQuery={logsByIssueRef?.get(issue.issueRef)}
                  />
                ) : title === 'In Progress' ? (
                  <Alert severity="info" sx={{ py: 0 }}>
                    No active runtime session is attached to this issue.
                  </Alert>
                ) : null}
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

function RuntimeLogPreview({
  session,
  logQuery,
}: {
  session: SchedulerSession;
  logQuery?: UseQueryResult<SessionLogResult, Error>;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        borderRadius: 2,
        bgcolor: 'background.default',
      }}
    >
      <Stack spacing={0.75}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" fontWeight={700}>
            Claude Activity
          </Typography>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" justifyContent="flex-end">
            <Chip label={`PID ${session.pid}`} size="small" variant="outlined" />
            {session.claudeSessionId && (
              <Chip
                label={`Session ${compactId(session.claudeSessionId)}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Stack>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Started {formatTimestamp(session.startedAt)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Last activity {formatTimestamp(session.lastActivityAt)}
        </Typography>
        <Typography variant="body2">
          {session.latestActivitySummary || 'Waiting for Claude activity from the remote session.'}
        </Typography>
        {logQuery?.isLoading ? (
          <Typography variant="caption" color="text.secondary">
            Loading log tail...
          </Typography>
        ) : logQuery?.error ? (
          <Alert severity="info" sx={{ py: 0 }}>
            Log stream unavailable.
          </Alert>
        ) : (
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1,
              borderRadius: 1.5,
              bgcolor: '#0b1220',
              color: '#dbe6ff',
              fontSize: '0.72rem',
              lineHeight: 1.45,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 220,
              overflowY: 'auto',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
          >
            {(logQuery?.data?.log || '').trim() || 'No log output yet.'}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

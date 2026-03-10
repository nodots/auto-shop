import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboard, fetchOpenIssues, fetchProjectsRaw } from '../api';
import type { GitHubIssue, ProjectData } from '../api';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { alpha, useTheme } from '@mui/material/styles';

type ProjectSummary = {
  name: string;
  project: ProjectData;
  issues: GitHubIssue[];
  queuedIssues: number;
  openIssues: number;
  oldestIssueAge: string;
  auditCommand: string;
};

function formatAge(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(ms / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

function describeOldestIssue(issues: GitHubIssue[]) {
  if (issues.length === 0) return 'No open issues';
  const oldest = [...issues].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )[0];
  return `Oldest: ${formatAge(oldest.created_at)}`;
}

function buildAuditCommand(projectName: string) {
  return `./bin/auto-shop audit ${projectName} --state=open --limit=50`;
}

function matchesSearch(issue: GitHubIssue, search: string) {
  if (!search) return true;
  const value = search.toLowerCase();
  return (
    issue.title.toLowerCase().includes(value) ||
    issue.repo.toLowerCase().includes(value) ||
    issue.labels.some((label) => label.toLowerCase().includes(value))
  );
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export default function Dashboard() {
  const theme = useTheme();
  const [selectedProject, setSelectedProject] = useState('');
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  const projectsQuery = useQuery({
    queryKey: ['projects-raw'],
    queryFn: fetchProjectsRaw,
  });

  const issuesQuery = useQuery({
    queryKey: ['open-issues'],
    queryFn: () => fetchOpenIssues(),
    staleTime: 300_000,
  });

  if (dashboardQuery.isLoading || projectsQuery.isLoading) {
    return <CircularProgress />;
  }

  if (dashboardQuery.error) {
    return <Alert severity="error">{(dashboardQuery.error as Error).message}</Alert>;
  }

  if (projectsQuery.error) {
    return <Alert severity="error">{(projectsQuery.error as Error).message}</Alert>;
  }

  if (!dashboardQuery.data || !projectsQuery.data) {
    return null;
  }

  const projects = Object.entries(projectsQuery.data)
    .map(([name, project]) => {
      const issues = (issuesQuery.data || []).filter((issue) => issue.project === name);
      return {
        name,
        project,
        issues,
        queuedIssues: issues.filter((issue) => !issue.inCell).length,
        openIssues: issues.length,
        oldestIssueAge: describeOldestIssue(issues),
        auditCommand: buildAuditCommand(name),
      } satisfies ProjectSummary;
    })
    .sort((a, b) => b.openIssues - a.openIssues || a.name.localeCompare(b.name));

  const visibleIssues = (issuesQuery.data || []).filter((issue) => {
    if (selectedProject && issue.project !== selectedProject) return false;
    return matchesSearch(issue, search);
  });

  const totalQueuedIssues = (issuesQuery.data || []).filter((issue) => !issue.inCell).length;
  const isIssueAuthMissing =
    issuesQuery.error && (issuesQuery.error as Error).message.includes('GITHUB_TOKEN');

  const handleCopy = async (command: string, key: string) => {
    try {
      await copyText(command);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1500);
    } catch {
      setCopiedKey(null);
    }
  };

  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          position: 'relative',
          overflow: 'hidden',
          p: { xs: 2.5, md: 4 },
          borderRadius: 4,
          color: '#f8fafc',
          background:
            'linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(14,116,144,0.88) 52%, rgba(249,115,22,0.86) 100%)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at top right, rgba(255,255,255,0.24), transparent 28%), radial-gradient(circle at bottom left, rgba(255,255,255,0.14), transparent 32%)',
            pointerEvents: 'none',
          }}
        />

        <Stack spacing={2.5} sx={{ position: 'relative' }}>
          <Chip
            icon={<AutoAwesomeRoundedIcon />}
            label="Command Center"
            sx={{
              alignSelf: 'flex-start',
              color: 'inherit',
              borderColor: 'rgba(255,255,255,0.35)',
              backgroundColor: 'rgba(255,255,255,0.12)',
            }}
            variant="outlined"
          />

          <Box sx={{ maxWidth: 760 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: '-0.04em',
                fontSize: { xs: '2.2rem', md: '3.4rem' },
              }}
            >
              Audit the backlog, then launch the next clean cell.
            </Typography>
            <Typography sx={{ mt: 1.5, maxWidth: 620, color: 'rgba(248,250,252,0.8)' }}>
              The new CLI workflow is now the front door. Pick a project, copy the audit
              command, review what should close or shrink, and spin up only the work that
              still matters.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <Button
              variant="contained"
              size="large"
              startIcon={<TerminalRoundedIcon />}
              onClick={() =>
                handleCopy('./bin/auto-shop audit a2z-freight-claims --state=open --limit=50', 'hero')
              }
              sx={{
                alignSelf: 'flex-start',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                '&:hover': { backgroundColor: '#e2e8f0' },
              }}
            >
              {copiedKey === 'hero' ? 'Copied audit command' : 'Copy sample audit command'}
            </Button>
            <Button
              component={Link}
              to="/cells/new"
              size="large"
              variant="outlined"
              startIcon={<LaunchRoundedIcon />}
              sx={{
                alignSelf: 'flex-start',
                color: '#f8fafc',
                borderColor: 'rgba(248,250,252,0.35)',
              }}
            >
              Launch a new cell
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
          gap: 1.5,
        }}
      >
        <MetricCard
          label="Active Cells"
          value={`${dashboardQuery.data.capacity.active}/${dashboardQuery.data.capacity.max}`}
          detail="Current concurrency"
          icon={<Inventory2OutlinedIcon />}
        />
        <MetricCard
          label="Blocked"
          value={String(dashboardQuery.data.blockedCells.length)}
          detail="Needs coordinator action"
          icon={<WarningAmberRoundedIcon />}
        />
        <MetricCard
          label="Ready PRs"
          value={String(dashboardQuery.data.readyPRs.length)}
          detail="Merge or review next"
          icon={<AssignmentTurnedInRoundedIcon />}
        />
        <MetricCard
          label="Backlog Ready"
          value={String(totalQueuedIssues)}
          detail="Open issues not already in a cell"
          icon={<AutoAwesomeRoundedIcon />}
        />
      </Box>

      {isIssueAuthMissing && (
        <Alert severity="info">
          Set `GITHUB_TOKEN` for the GUI server to load live issues and power the audit cards.
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Paper sx={{ p: 2.5, borderRadius: 4 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { md: 'center' }, mb: 2 }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" fontWeight={800}>
                Audit Queue
              </Typography>
              <Typography color="text.secondary">
                Project cards pair live issue counts with the new CLI command.
              </Typography>
            </Box>
            <IconButton onClick={() => issuesQuery.refetch()} disabled={issuesQuery.isFetching}>
              <RefreshRoundedIcon />
            </IconButton>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
              gap: 1.5,
            }}
          >
            {projects.map((summary) => (
              <Paper
                key={summary.name}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 3,
                  borderColor:
                    selectedProject === summary.name ? 'primary.main' : 'divider',
                  background:
                    selectedProject === summary.name
                      ? `linear-gradient(180deg, ${alpha(
                          theme.palette.primary.main,
                          theme.palette.mode === 'dark' ? 0.18 : 0.08
                        )}, transparent)`
                      : 'background.paper',
                }}
              >
                <Stack spacing={1.25}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        {summary.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {summary.project.repo}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${summary.openIssues} open`}
                      color={summary.openIssues > 0 ? 'primary' : 'default'}
                      variant={summary.openIssues > 0 ? 'filled' : 'outlined'}
                    />
                  </Box>

                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip size="small" label={`${summary.queuedIssues} ready to audit`} variant="outlined" />
                    <Chip size="small" label={summary.oldestIssueAge} variant="outlined" />
                  </Stack>

                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: '0.78rem',
                      overflowX: 'auto',
                    }}
                  >
                    {summary.auditCommand}
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button
                      variant="contained"
                      startIcon={<ContentCopyRoundedIcon />}
                      onClick={() => handleCopy(summary.auditCommand, summary.name)}
                    >
                      {copiedKey === summary.name ? 'Copied' : 'Copy Audit Command'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() =>
                        setSelectedProject((current) =>
                          current === summary.name ? '' : summary.name
                        )
                      }
                    >
                      {selectedProject === summary.name ? 'Show All Issues' : 'Focus Issues'}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Box>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 4 }}>
          <Typography variant="h5" fontWeight={800}>
            Coordinator Flow
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Keep it tight: audit, trim, launch.
          </Typography>
          <Stack spacing={1.75} sx={{ mt: 2.5 }}>
            {[
              'Copy an audit command from a project card.',
              'Review close, modify, and leave-open recommendations.',
              'Convert only the real remaining work into cells.',
            ].map((step, index) => (
              <Box key={step} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Chip label={`0${index + 1}`} color="primary" size="small" />
                <Typography variant="body2">{step}</Typography>
              </Box>
            ))}
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Recommended prompt-only variant
          </Typography>
          <Box
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: 'action.hover',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '0.78rem',
            }}
          >
            ./bin/auto-shop issues prompt a2z-freight-claims --state=open --limit=25
          </Box>
        </Paper>
      </Box>

      <Paper sx={{ p: 2.5, borderRadius: 4 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { md: 'center' }, mb: 2 }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" fontWeight={800}>
              Issue Radar
            </Typography>
            <Typography color="text.secondary">
              Live backlog view with the current project filter baked in.
            </Typography>
          </Box>
          <TextField
            size="small"
            placeholder="Search title, repo, label"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ width: { xs: '100%', md: 260 } }}
          />
          <TextField
            size="small"
            select
            value={selectedProject}
            onChange={(event) => setSelectedProject(event.target.value)}
            sx={{ width: { xs: '100%', md: 220 } }}
          >
            <MenuItem value="">All projects</MenuItem>
            {projects.map((summary) => (
              <MenuItem key={summary.name} value={summary.name}>
                {summary.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {issuesQuery.isLoading && <CircularProgress size={24} />}

        {!issuesQuery.isLoading && !isIssueAuthMissing && visibleIssues.length === 0 && (
          <Typography color="text.secondary">No matching issues.</Typography>
        )}

        {visibleIssues.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Issue</TableCell>
                  <TableCell>Project</TableCell>
                  <TableCell>Labels</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell align="right">Comments</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleIssues.map((issue) => (
                  <TableRow
                    key={issue.id}
                    sx={issue.inCell ? { opacity: 0.45 } : undefined}
                  >
                    <TableCell>
                      <Typography fontWeight={600}>{issue.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        #{issue.number} · {issue.repo}
                      </Typography>
                    </TableCell>
                    <TableCell>{issue.project}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {issue.labels.slice(0, 4).map((label) => (
                          <Chip key={label} label={label} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>{formatAge(issue.created_at)}</TableCell>
                    <TableCell align="right">{issue.comments}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          component="a"
                          href={issue.html_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </Button>
                        {!issue.inCell && (
                          <Button
                            size="small"
                            variant="contained"
                            component={Link}
                            to={`/cells/new?feature=${encodeURIComponent(issue.title)}&project=${encodeURIComponent(issue.project)}&issueUrl=${encodeURIComponent(issue.html_url)}`}
                          >
                            Create Cell
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Stack>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.9 : 1)}`,
        background: isDark
          ? `linear-gradient(180deg, ${alpha('#0f172a', 0.96)}, ${alpha(
              theme.palette.background.paper,
              0.9
            )})`
          : 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.92))',
      }}
    >
      <Stack spacing={1}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography color="text.secondary" variant="body2">
            {label}
          </Typography>
          <Box sx={{ color: 'primary.main' }}>{icon}</Box>
        </Box>
        <Typography variant="h4" fontWeight={800}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {detail}
        </Typography>
      </Stack>
    </Paper>
  );
}

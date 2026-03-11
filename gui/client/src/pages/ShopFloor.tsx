import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchShopFloor, fetchRepairOrders, fetchAccountsRaw } from '../serviceDeskApi';
import type { RepairOrder, AccountData } from '../serviceDeskApi';
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
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { alpha, useTheme } from '@mui/material/styles';

type AccountSummary = {
  name: string;
  project: AccountData;
  issues: RepairOrder[];
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

function describeOldestIssue(issues: RepairOrder[]) {
  if (issues.length === 0) return 'No open issues';
  const oldest = [...issues].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )[0];
  return `Oldest: ${formatAge(oldest.created_at)}`;
}

function buildAuditCommand(projectName: string) {
  return `./bin/auto-shop audit ${projectName} --state=open --limit=50`;
}

function matchesSearch(issue: RepairOrder, search: string) {
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

export default function ShopFloor() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [selectedProject, setSelectedProject] = useState('');
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [hideEpics, setHideEpics] = useState(true);

  const shopFloorQuery = useQuery({
    queryKey: ['shop-floor'],
    queryFn: fetchShopFloor,
  });

  const accountsQuery = useQuery({
    queryKey: ['accounts-raw'],
    queryFn: fetchAccountsRaw,
  });

  const repairOrdersQuery = useQuery({
    queryKey: ['repair-orders', { hideEpics }],
    queryFn: () => fetchRepairOrders(hideEpics ? { excludeLabels: ['epic'] } : undefined),
    staleTime: 300_000,
  });

  if (shopFloorQuery.isLoading || accountsQuery.isLoading) {
    return <CircularProgress />;
  }

  if (shopFloorQuery.error) {
    return <Alert severity="error">{(shopFloorQuery.error as Error).message}</Alert>;
  }

  if (accountsQuery.error) {
    return <Alert severity="error">{(accountsQuery.error as Error).message}</Alert>;
  }

  if (!shopFloorQuery.data || !accountsQuery.data) {
    return null;
  }

  const projects = Object.entries(accountsQuery.data)
    .map(([name, project]) => {
      const issues = (repairOrdersQuery.data || []).filter((issue) => issue.project === name);
      return {
        name,
        project,
        issues,
        queuedIssues: issues.filter((issue) => !issue.inCell).length,
        openIssues: issues.length,
        oldestIssueAge: describeOldestIssue(issues),
        auditCommand: buildAuditCommand(name),
      } satisfies AccountSummary;
    })
    .sort((a, b) => b.openIssues - a.openIssues || a.name.localeCompare(b.name));

  const visibleIssues = (repairOrdersQuery.data || []).filter((issue) => {
    if (selectedProject && issue.project !== selectedProject) return false;
    return matchesSearch(issue, search);
  });

  const totalQueuedIssues = (repairOrdersQuery.data || []).filter((issue) => !issue.inCell).length;
  const isIssueAuthMissing =
    repairOrdersQuery.error && (repairOrdersQuery.error as Error).message.includes('GITHUB_TOKEN');

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
          p: { xs: 3.5, sm: 4, md: 5 },
          borderRadius: 6,
          color: '#fff7ec',
          border: `3px solid ${theme.palette.primary.main}`,
          background: isDark
            ? 'linear-gradient(135deg, #150909 0%, #2a0f0f 36%, #0f0f0f 100%)'
            : 'linear-gradient(135deg, #221111 0%, #4d1717 34%, #141414 100%)',
          boxShadow: '0 20px 70px rgba(0,0,0,0.35)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at top right, rgba(255,247,236,0.22), transparent 26%), linear-gradient(90deg, rgba(214,40,40,0.16), transparent 44%)',
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            right: { xs: -18, md: 28 },
            top: { xs: -12, md: 24 },
            width: { xs: 120, md: 180 },
            height: { xs: 120, md: 180 },
            borderRadius: '50%',
            border: '10px solid rgba(255,250,242,0.92)',
            boxShadow: 'inset 0 0 0 10px #111111, inset 0 0 0 22px #d62828',
            opacity: 0.9,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 18,
            background:
              'linear-gradient(45deg, #fffaf2 25%, #111111 25%, #111111 50%, #fffaf2 50%, #fffaf2 75%, #111111 75%, #111111)',
            backgroundSize: '24px 24px',
          }}
        />

        <Stack spacing={3} sx={{ position: 'relative', pr: { xs: 0, md: 16 } }}>
          <Chip
            icon={<AutoAwesomeRoundedIcon />}
            label="Service Desk"
            sx={{
              alignSelf: 'flex-start',
              color: 'inherit',
              borderColor: 'rgba(255,250,242,0.42)',
              backgroundColor: 'rgba(255,250,242,0.12)',
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: '1rem',
              letterSpacing: '0.08em',
            }}
            variant="outlined"
          />

          <Box sx={{ maxWidth: 760 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                lineHeight: 0.95,
                textTransform: 'uppercase',
                textShadow: '0 4px 18px rgba(0,0,0,0.35)',
                fontSize: { xs: '2.6rem', md: '4.8rem' },
              }}
            >
              Audit the waiting lot, then pull the next clean job into a bay.
            </Typography>
            <Typography
              sx={{
                mt: 1.5,
                maxWidth: 620,
                color: 'rgba(255,247,236,0.86)',
                fontSize: { xs: '0.95rem', md: '1.05rem' },
              }}
            >
              The new CLI workflow is now the front desk. Pick an account, copy the audit
              command, review what should be closed out or re-estimated, and pull only the
              real remaining work into service.
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
                backgroundColor: '#fffaf2',
                color: '#111111',
                border: '2px solid #111111',
                '&:hover': { backgroundColor: '#f4dfc9' },
              }}
            >
              {copiedKey === 'hero' ? 'Copied shop audit' : 'Copy sample shop audit'}
            </Button>
            <Button
              component={Link}
              to="/bays/new"
              size="large"
              variant="outlined"
              startIcon={<LaunchRoundedIcon />}
              sx={{
                alignSelf: 'flex-start',
                color: '#fffaf2',
                borderColor: 'rgba(255,250,242,0.5)',
                backgroundColor: 'rgba(255,250,242,0.08)',
              }}
            >
              Open a new bay
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        <MetricCard
          label="Occupied Bays"
          value={`${shopFloorQuery.data.capacity.active}/${shopFloorQuery.data.capacity.max}`}
          detail="Current service load"
          icon={<Inventory2OutlinedIcon />}
        />
        <MetricCard
          label="Parts Delays"
          value={String(shopFloorQuery.data.blockedCells.length)}
          detail="Needs service manager attention"
          icon={<WarningAmberRoundedIcon />}
        />
        <MetricCard
          label="Ready for Inspection"
          value={String(shopFloorQuery.data.readyPRs.length)}
          detail="Release or review next"
          icon={<AssignmentTurnedInRoundedIcon />}
        />
        <MetricCard
          label="Jobs Ready"
          value={String(totalQueuedIssues)}
          detail="Open repair orders not already in a bay"
          icon={<AutoAwesomeRoundedIcon />}
        />
      </Box>

      {isIssueAuthMissing && (
        <Alert severity="info">
          Set `GITHUB_TOKEN` for the GUI server to load live repair orders and power the audit cards.
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
        <Paper
          sx={{
            p: 2.5,
            borderRadius: 5,
            background: isDark
              ? 'linear-gradient(180deg, rgba(28,16,16,0.98), rgba(18,10,10,0.96))'
              : 'linear-gradient(180deg, rgba(255,250,242,0.98), rgba(247,235,217,0.98))',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { md: 'center' }, mb: 2 }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" fontWeight={800}>
                Bay Board
              </Typography>
              <Typography color="text.secondary">
                Account cards pair live repair-order counts with the new CLI command.
              </Typography>
            </Box>
            <IconButton onClick={() => repairOrdersQuery.refetch()} disabled={repairOrdersQuery.isFetching}>
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
                    <Chip size="small" label={`${summary.queuedIssues} ready for estimate`} variant="outlined" />
                    <Chip size="small" label={summary.oldestIssueAge} variant="outlined" />
                  </Stack>

                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: isDark ? 'rgba(255,250,242,0.06)' : 'rgba(17,17,17,0.05)',
                      border: `1px dashed ${alpha(theme.palette.primary.main, 0.45)}`,
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
                      {copiedKey === summary.name ? 'Copied' : 'Copy Shop Audit'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() =>
                        setSelectedProject((current) =>
                          current === summary.name ? '' : summary.name
                        )
                      }
                    >
                      {selectedProject === summary.name ? 'Show All Repair Orders' : 'Focus This Account'}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Box>
        </Paper>

        <Paper
          sx={{
            p: 2.5,
            borderRadius: 5,
            background: isDark
              ? 'linear-gradient(180deg, rgba(17,17,17,0.98), rgba(28,16,16,0.94))'
              : 'linear-gradient(180deg, rgba(255,250,242,0.98), rgba(242,230,213,0.98))',
          }}
        >
          <Typography variant="h5" fontWeight={800}>
            Service Lane
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Keep it tight: inspect, estimate, dispatch.
          </Typography>
          <Stack spacing={1.75} sx={{ mt: 2.5 }}>
            {[
              'Copy an audit command from an account card.',
              'Review close-out, re-estimate, and keep-open recommendations.',
              'Pull only the real remaining jobs into bays.',
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
              bgcolor: isDark ? 'rgba(255,250,242,0.06)' : 'rgba(17,17,17,0.05)',
              border: `1px dashed ${alpha(theme.palette.primary.main, 0.45)}`,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '0.78rem',
            }}
          >
            ./bin/auto-shop backlog writeup a2z-freight-claims --state=open --limit=25
          </Box>
        </Paper>
      </Box>

      <Paper
        sx={{
          p: 2.5,
          borderRadius: 5,
          background: isDark
            ? 'linear-gradient(180deg, rgba(22,12,12,0.98), rgba(14,10,10,0.96))'
            : 'linear-gradient(180deg, rgba(255,250,242,0.98), rgba(249,239,224,0.98))',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { md: 'center' }, mb: 2 }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" fontWeight={800}>
              Waiting Lot
            </Typography>
            <Typography color="text.secondary">
              Live repair-order view with the current account filter baked in.
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={hideEpics}
                onChange={(event) => setHideEpics(event.target.checked)}
                size="small"
              />
            }
            label="Hide epics"
            sx={{ mr: 0 }}
          />
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
            <MenuItem value="">All accounts</MenuItem>
            {projects.map((summary) => (
              <MenuItem key={summary.name} value={summary.name}>
                {summary.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {repairOrdersQuery.isLoading && <CircularProgress size={24} />}

        {!repairOrdersQuery.isLoading && !isIssueAuthMissing && visibleIssues.length === 0 && (
          <Typography color="text.secondary">No matching repair orders.</Typography>
        )}

        {visibleIssues.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Repair Order</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Labels</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell align="right">Comments</TableCell>
                  <TableCell align="right">Service Action</TableCell>
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
                            to={`/bays/new?feature=${encodeURIComponent(issue.title)}&project=${encodeURIComponent(issue.project)}&issueUrl=${encodeURIComponent(issue.html_url)}`}
                          >
                            Open Bay
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
        borderRadius: 4,
        border: `2px solid ${alpha(isDark ? '#fffaf2' : '#111111', isDark ? 0.12 : 0.08)}`,
        background: isDark
          ? 'linear-gradient(180deg, rgba(26,14,14,0.98), rgba(15,9,9,0.96))'
          : 'linear-gradient(180deg, rgba(255,250,242,1), rgba(248,237,220,0.98))',
        position: 'relative',
        overflow: 'hidden',
        '&::after': {
          content: '""',
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 6,
          background: `linear-gradient(90deg, ${theme.palette.primary.main}, #111111, #fffaf2)`,
        },
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

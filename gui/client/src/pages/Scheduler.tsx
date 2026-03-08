import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSchedulerStatus,
  pauseScheduler,
  resumeScheduler,
  triggerScan,
  stopScheduler,
  removeFromSchedulerQueue,
  killSession,
  SchedulerStatus,
} from '../api';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import DeleteIcon from '@mui/icons-material/Delete';
import StopIcon from '@mui/icons-material/Stop';

function elapsed(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function StatusChip({ status, paused }: { status: string; paused: boolean }) {
  if (status === 'running' && paused) {
    return <Chip label="paused" color="warning" size="small" />;
  }
  const colorMap: Record<string, 'success' | 'error' | 'default' | 'warning'> = {
    running: 'success',
    stopping: 'warning',
    stopped: 'default',
  };
  return <Chip label={status} color={colorMap[status] || 'default'} size="small" />;
}

export default function Scheduler() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['scheduler'],
    queryFn: fetchSchedulerStatus,
    refetchInterval: 5000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['scheduler'] });

  const pause = useMutation({ mutationFn: pauseScheduler, onSuccess: invalidate });
  const resume = useMutation({ mutationFn: resumeScheduler, onSuccess: invalidate });
  const scan = useMutation({ mutationFn: triggerScan, onSuccess: invalidate });
  const stop = useMutation({ mutationFn: stopScheduler, onSuccess: invalidate });
  const removeQueue = useMutation({ mutationFn: removeFromSchedulerQueue, onSuccess: invalidate });
  const kill = useMutation({ mutationFn: killSession, onSuccess: invalidate });

  if (isLoading) return <CircularProgress />;

  if (error) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight="bold">Scheduler</Typography>
        <Alert severity="warning">
          Scheduler daemon is not running. Start it with: <code>auto-shop scheduler start</code>
        </Alert>
      </Stack>
    );
  }

  if (!data) return null;

  const capacityPct = (data.activeCount / data.maxSessions) * 100;

  return (
    <Stack spacing={3}>
      {/* Header + Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" fontWeight="bold">Scheduler</Typography>
          <StatusChip status={data.status} paused={data.paused} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {data.paused ? (
            <Button variant="outlined" size="small" onClick={() => resume.mutate()}>Resume</Button>
          ) : (
            <Button variant="outlined" size="small" onClick={() => pause.mutate()}>Pause</Button>
          )}
          <Button variant="outlined" size="small" onClick={() => scan.mutate()}>Scan Now</Button>
          <Button variant="outlined" size="small" color="error" onClick={() => stop.mutate()}>Stop</Button>
        </Box>
      </Box>

      {/* Info bar */}
      <Box sx={{ display: 'flex', gap: 3, color: 'text.secondary' }}>
        <Typography variant="body2">
          Last scan: {data.lastScanAt ? new Date(data.lastScanAt).toLocaleTimeString() : 'never'}
        </Typography>
        {data.startedAt && (
          <Typography variant="body2">
            Uptime: {elapsed(data.startedAt)}
          </Typography>
        )}
      </Box>

      {/* Capacity */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Session Capacity
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(capacityPct, 100)}
              color={data.activeCount >= data.maxSessions ? 'error' : data.activeCount >= 3 ? 'warning' : 'success'}
              sx={{ height: 12, borderRadius: 1 }}
            />
          </Box>
          <Typography variant="h6" fontWeight="bold">
            {data.activeCount}/{data.maxSessions}
          </Typography>
        </Box>
      </Paper>

      {/* Active Sessions */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          Active Sessions ({data.activeSessions.length})
        </Typography>
        {data.activeSessions.length === 0 ? (
          <Typography color="text.disabled" variant="body2">No active sessions</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Issue</TableCell>
                  <TableCell>Branch</TableCell>
                  <TableCell>PID</TableCell>
                  <TableCell>Running</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.activeSessions.map((s) => (
                  <TableRow key={s.issueRef}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">{s.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.issueRef}</Typography>
                    </TableCell>
                    <TableCell><code>{s.branch}</code></TableCell>
                    <TableCell>{s.pid}</TableCell>
                    <TableCell>{elapsed(s.startedAt)}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="error" onClick={() => kill.mutate(s.issueRef)} title="Kill session">
                        <StopIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Queue */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          Queue ({data.queueSize})
        </Typography>
        {data.queue.length === 0 ? (
          <Typography color="text.disabled" variant="body2">Queue is empty</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Issue</TableCell>
                  <TableCell>Repo</TableCell>
                  <TableCell>Queued</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.queue.map((q) => (
                  <TableRow key={q.issueRef}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">{q.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{q.issueRef}</Typography>
                    </TableCell>
                    <TableCell>{q.repo}</TableCell>
                    <TableCell>{elapsed(q.discoveredAt)}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="error" onClick={() => removeQueue.mutate(q.issueRef)} title="Remove from queue">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Completed */}
      {data.completed.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            Recent Completions ({data.completed.length})
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Issue</TableCell>
                  <TableCell>Branch</TableCell>
                  <TableCell>Exit Code</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Completed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.completed.slice().reverse().map((c) => {
                  const durationMs = new Date(c.completedAt).getTime() - new Date(c.startedAt).getTime();
                  const durationMin = Math.round(durationMs / 60000);
                  return (
                    <TableRow key={c.issueRef + c.completedAt}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">{c.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.issueRef}</Typography>
                      </TableCell>
                      <TableCell><code>{c.branch}</code></TableCell>
                      <TableCell>
                        <Chip
                          label={c.exitCode === 0 ? 'OK' : `exit ${c.exitCode}`}
                          color={c.exitCode === 0 ? 'success' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{durationMin}m</TableCell>
                      <TableCell>{new Date(c.completedAt).toLocaleTimeString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Stack>
  );
}

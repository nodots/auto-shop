import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDispatchBoardStatus,
  pauseDispatch,
  resumeDispatch,
  scanWaitingLot,
  stopDispatch,
  removeFromDispatchBoard,
  stopTechnicianSession,
} from '../serviceDeskApi';
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
    return <Chip label="service paused" color="warning" size="small" />;
  }
  const labels: Record<string, string> = {
    running: 'open',
    stopping: 'winding down',
    stopped: 'closed',
  };
  const colorMap: Record<string, 'success' | 'error' | 'default' | 'warning'> = {
    running: 'success',
    stopping: 'warning',
    stopped: 'default',
  };
  return <Chip label={labels[status] || status} color={colorMap[status] || 'default'} size="small" />;
}

export default function DispatchBoard() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dispatch-board'],
    queryFn: fetchDispatchBoardStatus,
    refetchInterval: 5000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dispatch-board'] });

  const pause = useMutation({ mutationFn: pauseDispatch, onSuccess: invalidate });
  const resume = useMutation({ mutationFn: resumeDispatch, onSuccess: invalidate });
  const scan = useMutation({ mutationFn: scanWaitingLot, onSuccess: invalidate });
  const stop = useMutation({ mutationFn: stopDispatch, onSuccess: invalidate });
  const removeQueue = useMutation({ mutationFn: removeFromDispatchBoard, onSuccess: invalidate });
  const kill = useMutation({ mutationFn: stopTechnicianSession, onSuccess: invalidate });

  if (isLoading) return <CircularProgress />;

  if (error) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight="bold">Dispatch Board</Typography>
        <Alert severity="warning">
          Dispatch board is not running. Start it with: <code>auto-shop dispatch start</code>
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
          <Typography variant="h5" fontWeight="bold">Dispatch Board</Typography>
          <StatusChip status={data.status} paused={data.paused} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {data.paused ? (
            <Button variant="outlined" size="small" onClick={() => resume.mutate()}>Resume Service</Button>
          ) : (
            <Button variant="outlined" size="small" onClick={() => pause.mutate()}>Pause Service</Button>
          )}
          <Button variant="outlined" size="small" onClick={() => scan.mutate()}>Check Waiting Lot</Button>
          <Button variant="outlined" size="small" color="error" onClick={() => stop.mutate()}>Shut Down</Button>
        </Box>
      </Box>

      {/* Info bar */}
      <Box sx={{ display: 'flex', gap: 3, color: 'text.secondary' }}>
        <Typography variant="body2">
          Last pull from waiting lot: {data.lastScanAt ? new Date(data.lastScanAt).toLocaleTimeString() : 'never'}
        </Typography>
        {data.startedAt && (
          <Typography variant="body2">
            Run time: {elapsed(data.startedAt)}
          </Typography>
        )}
      </Box>

      {/* Capacity */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Technician Capacity
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
          Active Technicians ({data.activeSessions.length})
        </Typography>
        {data.activeSessions.length === 0 ? (
          <Typography color="text.disabled" variant="body2">No active technicians</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Repair Order</TableCell>
                  <TableCell>Job Branch</TableCell>
                  <TableCell>PID</TableCell>
                  <TableCell>On Lift</TableCell>
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
                      <IconButton size="small" color="error" onClick={() => kill.mutate(s.issueRef)} title="Stop technician session">
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
          Waiting Lot ({data.queueSize})
        </Typography>
        {data.queue.length === 0 ? (
          <Typography color="text.disabled" variant="body2">Waiting lot is empty</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Repair Order</TableCell>
                  <TableCell>Repo</TableCell>
                  <TableCell>Waiting</TableCell>
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
                      <IconButton size="small" color="error" onClick={() => removeQueue.mutate(q.issueRef)} title="Remove from waiting lot">
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
            Recent Releases ({data.completed.length})
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Repair Order</TableCell>
                  <TableCell>Job Branch</TableCell>
                  <TableCell>Exit Code</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Released</TableCell>
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

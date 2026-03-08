import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { fetchCell, updateCellStatus, deleteCell } from '../api';
import StatusBadge from '../components/StatusBadge';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import MuiLink from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

const validStatuses = ['queued', 'active', 'blocked', 'awaiting-review', 'merged'];

export default function CellDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [statusNote, setStatusNote] = useState('');

  const { data: cell, isLoading, error } = useQuery({
    queryKey: ['cell', id],
    queryFn: () => fetchCell(Number(id)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      updateCellStatus(Number(id), status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cell', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setStatusNote('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCell(Number(id)),
    onSuccess: () => navigate('/cells'),
  });

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{(error as Error).message}</Alert>;
  if (!cell) return null;

  const tabKeys = ['scope', 'blocker', 'handoff', 'history'] as const;

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">{cell.feature}</Typography>
          <Typography color="text.secondary">
            {cell.project} &middot;{' '}
            <Typography component="span" fontFamily="monospace" fontSize="0.75rem">
              {cell.branch}
            </Typography>
          </Typography>
        </Box>
        <StatusBadge status={cell.status} />
      </Box>

      {/* Links */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        {cell.githubIssueUrl && (
          <MuiLink href={cell.githubIssueUrl} target="_blank" rel="noopener noreferrer">
            GitHub Issue
          </MuiLink>
        )}
        {cell.githubPrUrl && (
          <MuiLink href={cell.githubPrUrl} target="_blank" rel="noopener noreferrer">
            Pull Request
          </MuiLink>
        )}
      </Box>

      {/* Status transitions */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Transition Status
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'flex-end' }}>
          {validStatuses
            .filter((s) => s !== cell.status)
            .map((s) => (
              <Button
                key={s}
                variant="outlined"
                size="small"
                onClick={() => statusMutation.mutate({ status: s, note: statusNote || undefined })}
                disabled={statusMutation.isPending}
              >
                &rarr; {s}
              </Button>
            ))}
          <TextField
            size="small"
            placeholder="Note (optional)"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
          />
        </Box>
      </Paper>

      {/* Tabs */}
      <Box>
        <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)}>
          <Tab label="Scope" />
          <Tab label="Blocker" />
          <Tab label="Handoff" />
          <Tab label="History" />
        </Tabs>

        <Paper sx={{ p: 2, minHeight: 200, mt: 1 }}>
          {tabKeys[activeTab] === 'scope' && (
            cell.scope ? (
              <Box
                component="pre"
                sx={{ fontSize: '0.875rem', bgcolor: 'grey.50', p: 2, borderRadius: 1, overflow: 'auto' }}
              >
                {JSON.stringify(cell.scope, null, 2)}
              </Box>
            ) : (
              <Typography color="text.disabled">No scope data</Typography>
            )
          )}

          {tabKeys[activeTab] === 'blocker' && (
            cell.blocker ? (
              <Box sx={{ '& h1,& h2,& h3': { mt: 2, mb: 1 }, '& p': { my: 1 } }}>
                <ReactMarkdown>{cell.blocker}</ReactMarkdown>
              </Box>
            ) : (
              <Typography color="text.disabled">No blocker</Typography>
            )
          )}

          {tabKeys[activeTab] === 'handoff' && (
            cell.handoff ? (
              <Box sx={{ '& h1,& h2,& h3': { mt: 2, mb: 1 }, '& p': { my: 1 } }}>
                <ReactMarkdown>{cell.handoff}</ReactMarkdown>
              </Box>
            ) : (
              <Typography color="text.disabled">No handoff</Typography>
            )
          )}

          {tabKeys[activeTab] === 'history' && (
            cell.history && cell.history.length > 0 ? (
              <List dense disablePadding>
                {cell.history.map((h) => (
                  <ListItem key={h.id} disableGutters sx={{ gap: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ width: 160, flexShrink: 0 }}>
                      {new Date(h.changedAt).toLocaleString()}
                    </Typography>
                    {h.fromStatus && <StatusBadge status={h.fromStatus} />}
                    <Typography color="text.disabled">&rarr;</Typography>
                    <StatusBadge status={h.toStatus} />
                    {h.note && (
                      <Typography variant="body2" color="text.secondary">{h.note}</Typography>
                    )}
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.disabled">No history</Typography>
            )
          )}
        </Paper>
      </Box>

      {/* Danger zone */}
      <Paper variant="outlined" sx={{ p: 2, borderColor: 'error.light' }}>
        <Typography variant="subtitle2" color="error" gutterBottom>
          Danger Zone
        </Typography>
        <Button
          variant="contained"
          color="error"
          size="small"
          onClick={() => {
            if (confirm('Delete this cell? This cannot be undone.')) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
        >
          Delete Cell
        </Button>
      </Paper>
    </Stack>
  );
}

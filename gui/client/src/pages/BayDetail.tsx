import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { fetchBay, updateBayStatus, clearBay } from '../serviceDeskApi';
import BayStatusBadge from '../components/BayStatusBadge';
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

export default function BayDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [statusNote, setStatusNote] = useState('');

  const { data: bay, isLoading, error } = useQuery({
    queryKey: ['bay', id],
    queryFn: () => fetchBay(Number(id)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      updateBayStatus(Number(id), status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bay', id] });
      queryClient.invalidateQueries({ queryKey: ['shop-floor'] });
      setStatusNote('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => clearBay(Number(id)),
    onSuccess: () => navigate('/bays'),
  });

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{(error as Error).message}</Alert>;
  if (!bay) return null;

  const tabKeys = ['scope', 'blocker', 'handoff', 'history'] as const;

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">{bay.feature}</Typography>
          <Typography color="text.secondary">
            {bay.project} &middot;{' '}
            <Typography component="span" fontFamily="monospace" fontSize="0.75rem">
              {bay.branch}
            </Typography>
          </Typography>
        </Box>
        <BayStatusBadge status={bay.status} />
      </Box>

      {/* Links */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        {bay.githubIssueUrl && (
          <MuiLink href={bay.githubIssueUrl} target="_blank" rel="noopener noreferrer">
            Repair Order
          </MuiLink>
        )}
        {bay.githubPrUrl && (
          <MuiLink href={bay.githubPrUrl} target="_blank" rel="noopener noreferrer">
            Release PR
          </MuiLink>
        )}
      </Box>

      {/* Status transitions */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Move Bay Status
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'flex-end' }}>
          {validStatuses
            .filter((s) => s !== bay.status)
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
            placeholder="Service note (optional)"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
          />
        </Box>
      </Paper>

      {/* Tabs */}
      <Box>
        <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)}>
          <Tab label="Repair Plan" />
          <Tab label="Parts Delay" />
          <Tab label="Shift Notes" />
          <Tab label="Service Log" />
        </Tabs>

        <Paper sx={{ p: 2, minHeight: 200, mt: 1 }}>
          {tabKeys[activeTab] === 'scope' && (
            bay.scope ? (
              <Box
                component="pre"
                sx={{ fontSize: '0.875rem', bgcolor: 'grey.50', p: 2, borderRadius: 1, overflow: 'auto' }}
              >
                {JSON.stringify(bay.scope, null, 2)}
              </Box>
            ) : (
              <Typography color="text.disabled">No repair plan</Typography>
            )
          )}

          {tabKeys[activeTab] === 'blocker' && (
            bay.blocker ? (
              <Box sx={{ '& h1,& h2,& h3': { mt: 2, mb: 1 }, '& p': { my: 1 } }}>
                <ReactMarkdown>{bay.blocker}</ReactMarkdown>
              </Box>
            ) : (
              <Typography color="text.disabled">No parts delay</Typography>
            )
          )}

          {tabKeys[activeTab] === 'handoff' && (
            bay.handoff ? (
              <Box sx={{ '& h1,& h2,& h3': { mt: 2, mb: 1 }, '& p': { my: 1 } }}>
                <ReactMarkdown>{bay.handoff}</ReactMarkdown>
              </Box>
            ) : (
              <Typography color="text.disabled">No shift notes</Typography>
            )
          )}

          {tabKeys[activeTab] === 'history' && (
            bay.history && bay.history.length > 0 ? (
              <List dense disablePadding>
                {bay.history.map((h) => (
                  <ListItem key={h.id} disableGutters sx={{ gap: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ width: 160, flexShrink: 0 }}>
                      {new Date(h.changedAt).toLocaleString()}
                    </Typography>
                    {h.fromStatus && <BayStatusBadge status={h.fromStatus} />}
                    <Typography color="text.disabled">&rarr;</Typography>
                    <BayStatusBadge status={h.toStatus} />
                    {h.note && (
                      <Typography variant="body2" color="text.secondary">{h.note}</Typography>
                    )}
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.disabled">No service log</Typography>
            )
          )}
        </Paper>
      </Box>

      {/* Danger zone */}
      <Paper variant="outlined" sx={{ p: 2, borderColor: 'error.light' }}>
        <Typography variant="subtitle2" color="error" gutterBottom>
          Tow Yard
        </Typography>
        <Button
          variant="contained"
          color="error"
          size="small"
          onClick={() => {
            if (confirm('Clear this bay? This cannot be undone.')) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
        >
          Clear Bay
        </Button>
      </Paper>
    </Stack>
  );
}

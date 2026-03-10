import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchReleaseLane, removeFromReleaseLane, reorderReleaseLane } from '../serviceDeskApi';
import BayStatusBadge from '../components/BayStatusBadge';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import MuiLink from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/Delete';

export default function ReleaseLane() {
  const queryClient = useQueryClient();

  const { data: queue, isLoading, error } = useQuery({
    queryKey: ['release-lane'],
    queryFn: fetchReleaseLane,
  });

  const removeMutation = useMutation({
    mutationFn: removeFromReleaseLane,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['release-lane'] }),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderReleaseLane,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['release-lane'] }),
  });

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (!queue) return;
    const newQueue = [...queue];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newQueue.length) return;

    [newQueue[index], newQueue[swapIndex]] = [newQueue[swapIndex], newQueue[index]];
    const order = newQueue.map((item, i) => ({ id: item.id, position: i + 1 }));
    reorderMutation.mutate(order);
  };

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{(error as Error).message}</Alert>;

  return (
    <Stack spacing={3}>
      <Typography variant="h5" fontWeight="bold">Release Lane</Typography>

      {!queue || queue.length === 0 ? (
        <Typography color="text.disabled" align="center" sx={{ py: 4 }}>
          Release lane is empty
        </Typography>
      ) : (
        <Stack spacing={1}>
          {queue.map((item, index) => (
            <Paper key={item.id} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h5" fontWeight="bold" color="text.disabled" sx={{ width: 32, textAlign: 'center' }}>
                {index + 1}
              </Typography>

              <Box sx={{ flex: 1 }}>
                <Typography fontWeight="medium">{item.feature}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.project} &middot;{' '}
                  <Typography component="span" fontFamily="monospace" fontSize="0.75rem">
                    {item.branch}
                  </Typography>
                </Typography>
              </Box>

              <BayStatusBadge status={item.status} />

              {item.githubPrUrl && (
                <MuiLink href={item.githubPrUrl} target="_blank" rel="noopener noreferrer" variant="body2">
                  Release PR
                </MuiLink>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <IconButton
                  size="small"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0 || reorderMutation.isPending}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === queue.length - 1 || reorderMutation.isPending}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
              </Box>

              <IconButton
                size="small"
                color="error"
                onClick={() => removeMutation.mutate(item.id)}
                disabled={removeMutation.isPending}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

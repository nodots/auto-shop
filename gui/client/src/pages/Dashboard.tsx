import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchDashboard } from '../api';
import StatusBadge from '../components/StatusBadge';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import MuiLink from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{(error as Error).message}</Alert>;
  if (!data) return null;

  const capacityPct = (data.capacity.active / data.capacity.max) * 100;
  const capacityColor =
    data.capacity.active >= data.capacity.max
      ? 'error'
      : data.capacity.active >= 3
      ? 'warning'
      : 'success';

  return (
    <Stack spacing={3}>
      <Typography variant="h5" fontWeight="bold">Dashboard</Typography>

      {/* Capacity gauge */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Active Cell Capacity
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(capacityPct, 100)}
              color={capacityColor as 'error' | 'warning' | 'success'}
              sx={{ height: 12, borderRadius: 1 }}
            />
          </Box>
          <Typography variant="h6" fontWeight="bold">
            {data.capacity.active}/{data.capacity.max}
          </Typography>
        </Box>
      </Paper>

      {/* Status counts */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {Object.entries(data.counts).map(([status, count]) => (
          <Paper
            key={status}
            component={Link}
            to={`/cells?status=${status}`}
            sx={{
              p: 2,
              textDecoration: 'none',
              flex: '1 1 120px',
              '&:hover': { boxShadow: 3 },
            }}
          >
            <Typography variant="h4" fontWeight="bold">{count}</Typography>
            <StatusBadge status={status} />
          </Paper>
        ))}
      </Box>

      {/* Blocked cells alert */}
      {data.blockedCells.length > 0 && (
        <Alert severity="error" variant="outlined">
          <AlertTitle>Blocked Cells ({data.blockedCells.length})</AlertTitle>
          <List dense disablePadding>
            {data.blockedCells.map((cell) => (
              <ListItem key={cell.id} disableGutters sx={{ py: 0.5 }}>
                <ListItemText
                  primary={
                    <MuiLink component={Link} to={`/cells/${cell.id}`} underline="hover">
                      {cell.feature}
                    </MuiLink>
                  }
                  secondary={cell.project}
                />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {/* Ready PRs */}
      {data.readyPRs.length > 0 && (
        <Alert severity="warning" variant="outlined">
          <AlertTitle>Ready for Review ({data.readyPRs.length})</AlertTitle>
          <List dense disablePadding>
            {data.readyPRs.map((cell) => (
              <ListItem key={cell.id} disableGutters sx={{ py: 0.5 }}>
                <ListItemText
                  primary={
                    <MuiLink component={Link} to={`/cells/${cell.id}`} underline="hover">
                      {cell.feature}
                    </MuiLink>
                  }
                  secondary={
                    cell.githubPrUrl ? (
                      <MuiLink href={cell.githubPrUrl} target="_blank" rel="noopener noreferrer">
                        PR
                      </MuiLink>
                    ) : undefined
                  }
                />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {/* Recent activity */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          Recent Activity
        </Typography>
        {data.recentActivity.length === 0 ? (
          <Typography color="text.disabled" variant="body2">No recent activity</Typography>
        ) : (
          <List dense disablePadding>
            {data.recentActivity.map((entry) => (
              <ListItem key={entry.id} disableGutters sx={{ gap: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ width: 150, flexShrink: 0 }}>
                  {new Date(entry.changedAt).toLocaleString()}
                </Typography>
                <Typography variant="body2" fontWeight="medium">{entry.feature}</Typography>
                {entry.fromStatus && <StatusBadge status={entry.fromStatus} />}
                <Typography color="text.disabled">&rarr;</Typography>
                <StatusBadge status={entry.toStatus} />
                {entry.note && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {entry.note}
                  </Typography>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Stack>
  );
}

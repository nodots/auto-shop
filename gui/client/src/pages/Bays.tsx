import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchBays } from '../serviceDeskApi';
import BayStatusBadge from '../components/BayStatusBadge';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import MuiLink from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

const statuses = ['all', 'queued', 'active', 'blocked', 'awaiting-review', 'merged'];

export default function Bays() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';

  const { data: bays, isLoading, error } = useQuery({
    queryKey: ['bays', statusFilter],
    queryFn: () => fetchBays(statusFilter === 'all' ? undefined : { status: statusFilter }),
  });

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{(error as Error).message}</Alert>;

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" fontWeight="bold">Bays</Typography>
        <Button component={Link} to="/bays/new" variant="contained" size="small">
          Open Bay
        </Button>
      </Box>

      <ToggleButtonGroup
        value={statusFilter}
        exclusive
        onChange={(_e, val) => {
          if (val) setSearchParams(val === 'all' ? {} : { status: val });
        }}
        size="small"
      >
        {statuses.map((s) => (
          <ToggleButton key={s} value={s} sx={{ textTransform: 'none' }}>
            {s}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {!bays || bays.length === 0 ? (
        <Typography color="text.disabled" align="center" sx={{ py: 4 }}>
          No bays found
        </Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Job</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Job Branch</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bays.map((bay) => (
                <TableRow key={bay.id} hover>
                  <TableCell>
                    <MuiLink component={Link} to={`/bays/${bay.id}`} underline="hover" fontWeight="medium">
                      {bay.feature}
                    </MuiLink>
                  </TableCell>
                  <TableCell>{bay.project}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                      {bay.branch}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <BayStatusBadge status={bay.status} />
                  </TableCell>
                  <TableCell>{new Date(bay.updatedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}

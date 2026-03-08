import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchCells } from '../api';
import StatusBadge from '../components/StatusBadge';
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

export default function CellsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';

  const { data: cells, isLoading, error } = useQuery({
    queryKey: ['cells', statusFilter],
    queryFn: () => fetchCells(statusFilter === 'all' ? undefined : { status: statusFilter }),
  });

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{(error as Error).message}</Alert>;

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" fontWeight="bold">Cells</Typography>
        <Button component={Link} to="/cells/new" variant="contained" size="small">
          New Cell
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

      {!cells || cells.length === 0 ? (
        <Typography color="text.disabled" align="center" sx={{ py: 4 }}>
          No cells found
        </Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Feature</TableCell>
                <TableCell>Project</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cells.map((cell) => (
                <TableRow key={cell.id} hover>
                  <TableCell>
                    <MuiLink component={Link} to={`/cells/${cell.id}`} underline="hover" fontWeight="medium">
                      {cell.feature}
                    </MuiLink>
                  </TableCell>
                  <TableCell>{cell.project}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                      {cell.branch}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={cell.status} />
                  </TableCell>
                  <TableCell>{new Date(cell.updatedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}

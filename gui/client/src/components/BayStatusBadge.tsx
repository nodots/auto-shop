import Chip from '@mui/material/Chip';

const statusColors: Record<string, 'default' | 'primary' | 'error' | 'warning' | 'success'> = {
  queued: 'default',
  active: 'primary',
  blocked: 'error',
  'awaiting-review': 'warning',
  merged: 'success',
};

const statusLabels: Record<string, string> = {
  queued: 'waiting in line',
  active: 'in service',
  blocked: 'waiting on parts',
  'awaiting-review': 'ready for inspection',
  merged: 'released',
};

export default function BayStatusBadge({ status }: { status: string }) {
  return (
    <Chip
      label={statusLabels[status] || status}
      color={statusColors[status] || 'default'}
      size="small"
      variant="outlined"
    />
  );
}

import Chip from '@mui/material/Chip';

const statusColors: Record<string, 'default' | 'primary' | 'error' | 'warning' | 'success'> = {
  queued: 'default',
  active: 'primary',
  blocked: 'error',
  'awaiting-review': 'warning',
  merged: 'success',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <Chip
      label={status}
      color={statusColors[status] || 'default'}
      size="small"
      variant="outlined"
    />
  );
}

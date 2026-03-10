import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { openBay, fetchAccountsRaw } from '../serviceDeskApi';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function OpenBay() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const prefillFeature = searchParams.get('feature') || '';
  const prefillProject = searchParams.get('project') || '';
  const prefillIssueUrl = searchParams.get('issueUrl') || '';

  const [feature, setFeature] = useState(prefillFeature);
  const [project, setProject] = useState(prefillProject);
  const [branch, setBranch] = useState(prefillFeature ? `feat/${slugify(prefillFeature)}` : '');
  const [issueUrl, setIssueUrl] = useState(prefillIssueUrl);
  const [error, setError] = useState('');

  const { data: accounts } = useQuery({
    queryKey: ['accounts-raw'],
    queryFn: fetchAccountsRaw,
  });

  const mutation = useMutation({
    mutationFn: openBay,
    onSuccess: (bay) => navigate(`/bays/${bay.id}`),
    onError: (err: Error) => setError(err.message),
  });

  const handleFeatureChange = (value: string) => {
    setFeature(value);
    setBranch(`feat/${slugify(value)}`);
  };

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Stack spacing={3}>
        <Typography variant="h5" fontWeight="bold">Open Bay</Typography>

        {error && <Alert severity="error">{error}</Alert>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!feature || !project || !branch) {
              setError('Job, account, and branch are required');
              return;
            }
            mutation.mutate({
              feature,
              project,
              branch,
              githubIssueUrl: issueUrl || undefined,
            });
          }}
        >
          <Stack spacing={2}>
            <TextField
              label="Job Name"
              size="small"
              fullWidth
              value={feature}
              onChange={(e) => handleFeatureChange(e.target.value)}
              placeholder="e.g. user-registration"
            />

            <TextField
              label="Account"
              size="small"
              fullWidth
              select
              value={project}
              onChange={(e) => setProject(e.target.value)}
            >
              <MenuItem value="">Select account...</MenuItem>
              {accounts &&
                Object.keys(accounts).map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
            </TextField>

            <TextField
              label="Job Branch"
              size="small"
              fullWidth
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              InputProps={{ sx: { fontFamily: 'monospace' } }}
            />

            <TextField
              label="Repair Order URL (optional)"
              size="small"
              fullWidth
              type="url"
              value={issueUrl}
              onChange={(e) => setIssueUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/issues/123"
            />

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button type="submit" variant="contained" disabled={mutation.isPending}>
                {mutation.isPending ? 'Opening...' : 'Open Bay'}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/bays')}>
                Cancel
              </Button>
            </Box>
          </Stack>
        </form>
      </Stack>
    </Box>
  );
}

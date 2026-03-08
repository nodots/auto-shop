import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createCell, fetchProjectsRaw } from '../api';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

export default function CellCreate() {
  const navigate = useNavigate();
  const [feature, setFeature] = useState('');
  const [project, setProject] = useState('');
  const [branch, setBranch] = useState('');
  const [issueUrl, setIssueUrl] = useState('');
  const [error, setError] = useState('');

  const { data: projects } = useQuery({
    queryKey: ['projects-raw'],
    queryFn: fetchProjectsRaw,
  });

  const mutation = useMutation({
    mutationFn: createCell,
    onSuccess: (cell) => navigate(`/cells/${cell.id}`),
    onError: (err: Error) => setError(err.message),
  });

  const handleFeatureChange = (value: string) => {
    setFeature(value);
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setBranch(`feat/${slug}`);
  };

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Stack spacing={3}>
        <Typography variant="h5" fontWeight="bold">Create Cell</Typography>

        {error && <Alert severity="error">{error}</Alert>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!feature || !project || !branch) {
              setError('Feature, project, and branch are required');
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
              label="Feature Name"
              size="small"
              fullWidth
              value={feature}
              onChange={(e) => handleFeatureChange(e.target.value)}
              placeholder="e.g. user-registration"
            />

            <TextField
              label="Project"
              size="small"
              fullWidth
              select
              value={project}
              onChange={(e) => setProject(e.target.value)}
            >
              <MenuItem value="">Select project...</MenuItem>
              {projects &&
                Object.keys(projects).map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
            </TextField>

            <TextField
              label="Branch"
              size="small"
              fullWidth
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              InputProps={{ sx: { fontFamily: 'monospace' } }}
            />

            <TextField
              label="GitHub Issue URL (optional)"
              size="small"
              fullWidth
              type="url"
              value={issueUrl}
              onChange={(e) => setIssueUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/issues/123"
            />

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button type="submit" variant="contained" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating...' : 'Create Cell'}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/cells')}>
                Cancel
              </Button>
            </Box>
          </Stack>
        </form>
      </Stack>
    </Box>
  );
}

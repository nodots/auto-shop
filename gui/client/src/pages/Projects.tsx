import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProjectsRaw, syncProjects, type ProjectData } from '../api';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

export default function Projects() {
  const queryClient = useQueryClient();

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects-raw'],
    queryFn: fetchProjectsRaw,
  });

  const syncMutation = useMutation({
    mutationFn: syncProjects,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{(error as Error).message}</Alert>;
  if (!projects) return null;

  const fields = (proj: ProjectData) => [
    ['Repository', proj.repo],
    ['Default Branch', proj.defaultBranch],
    ['Feature Target', proj.featureTarget],
    ['Promotion Path', proj.promotionPath.join(' \u2192 ')],
  ];

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" fontWeight="bold">Projects</Typography>
        <Button
          variant="contained"
          size="small"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? 'Syncing...' : 'Sync to DB'}
        </Button>
      </Box>

      {syncMutation.isSuccess && (
        <Alert severity="success">
          Synced {syncMutation.data?.synced} project(s) to database
        </Alert>
      )}

      <Stack spacing={2}>
        {Object.entries(projects).map(([name, proj]: [string, ProjectData]) => (
          <Paper key={name} sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight="bold">{name}</Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 0.5,
                columnGap: 2,
                mt: 1,
              }}
            >
              {fields(proj).map(([label, value]) => (
                <>
                  <Typography key={`${label}-label`} variant="body2" color="text.secondary">{label}</Typography>
                  <Typography
                    key={`${label}-value`}
                    variant="body2"
                    fontFamily={label === 'Repository' ? 'monospace' : undefined}
                    fontSize={label === 'Repository' ? '0.75rem' : undefined}
                  >
                    {value}
                  </Typography>
                </>
              ))}
            </Box>

            {proj.packages && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Packages ({Object.keys(proj.packages).length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(proj.packages).map(([pkgName, pkg]) => (
                    <Chip
                      key={pkgName}
                      label={`${pkgName} (${pkg.repo})`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
}

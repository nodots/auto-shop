import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAccountsRaw, syncAccounts, type AccountData } from '../serviceDeskApi';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

export default function Accounts() {
  const queryClient = useQueryClient();

  const { data: accounts, isLoading, error } = useQuery({
    queryKey: ['accounts-raw'],
    queryFn: fetchAccountsRaw,
  });

  const syncMutation = useMutation({
    mutationFn: syncAccounts,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{(error as Error).message}</Alert>;
  if (!accounts) return null;

  const fields = (account: AccountData) => [
    ['Repository', account.repo],
    ['Default Branch', account.defaultBranch],
    ['Service Branch', account.featureTarget],
    ['Promotion Path', account.promotionPath.join(' \u2192 ')],
  ];

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" fontWeight="bold">Accounts</Typography>
        <Button
          variant="contained"
          size="small"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? 'Syncing...' : 'Sync Accounts'}
        </Button>
      </Box>

      {syncMutation.isSuccess && (
        <Alert severity="success">
          Synced {syncMutation.data?.synced} account(s) to the service desk
        </Alert>
      )}

      <Stack spacing={2}>
        {Object.entries(accounts).map(([name, account]: [string, AccountData]) => (
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
              {fields(account).map(([label, value]) => (
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

            {account.packages && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Subsystems ({Object.keys(account.packages).length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(account.packages).map(([pkgName, pkg]) => (
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

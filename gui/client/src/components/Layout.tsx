import { NavLink, Outlet } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { alpha, useTheme } from '@mui/material/styles';
import { useThemeMode } from '../ThemeContext';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/cells', label: 'Cells' },
  { to: '/projects', label: 'Projects' },
  { to: '/merge-queue', label: 'Merge Queue' },
  { to: '/scheduler', label: 'Scheduler' },
];

export default function Layout() {
  const { mode, toggleMode } = useThemeMode();
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background:
          mode === 'dark'
            ? `radial-gradient(circle at top left, ${alpha('#38bdf8', 0.18)}, transparent 32%), radial-gradient(circle at top right, ${alpha('#f97316', 0.14)}, transparent 28%), linear-gradient(180deg, ${theme.palette.background.default} 0%, #020817 100%)`
            : `radial-gradient(circle at top left, ${alpha('#0ea5e9', 0.14)}, transparent 32%), radial-gradient(circle at top right, ${alpha('#f97316', 0.16)}, transparent 28%), linear-gradient(180deg, ${theme.palette.background.default} 0%, #f8fafc 100%)`,
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={{
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${alpha(
            mode === 'dark' ? '#cbd5e1' : '#0f172a',
            mode === 'dark' ? 0.12 : 0.08
          )}`,
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mr: 2 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #0ea5e9, #f97316)',
                boxShadow: '0 0 0 6px rgba(14,165,233,0.12)',
              }}
            />
            <Box>
              <Typography variant="h6" sx={{ lineHeight: 1, fontWeight: 800, letterSpacing: '-0.04em' }}>
                auto-shop
              </Typography>
              <Typography variant="caption" color="text.secondary">
                coordinator console
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              gap: 0.75,
              flexGrow: 1,
              flexWrap: 'wrap',
            }}
          >
            {navItems.map((item) => (
              <Button
                key={item.to}
                component={NavLink}
                to={item.to}
                end={item.to === '/' ? true : undefined}
                sx={{
                  color: 'text.primary',
                  textTransform: 'none',
                  borderRadius: '999px',
                  px: 1.5,
                  '&.active': {
                    backgroundColor: alpha(
                      theme.palette.text.primary,
                      mode === 'dark' ? 0.12 : 0.08
                    ),
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
          <IconButton color="default" onClick={toggleMode} aria-label="Toggle dark mode">
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ flex: 1, py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  );
}

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 0, mr: 4, fontWeight: 'bold' }}>
            auto-shop
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1 }}>
            {navItems.map((item) => (
              <Button
                key={item.to}
                component={NavLink}
                to={item.to}
                end={item.to === '/' ? true : undefined}
                sx={{
                  color: 'inherit',
                  textTransform: 'none',
                  '&.active': {
                    backgroundColor: 'rgba(255,255,255,0.15)',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
          <IconButton color="inherit" onClick={toggleMode} aria-label="Toggle dark mode">
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ flex: 1, py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  );
}

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
  { to: '/', label: 'Workflow' },
  { to: '/active-work', label: 'Active Work' },
  { to: '/delivery', label: 'Delivery' },
  { to: '/projects', label: 'Projects' },
];

export default function Layout() {
  const { mode, toggleMode } = useThemeMode();
  const theme = useTheme();
  const isDark = mode === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: isDark
          ? `linear-gradient(180deg, ${theme.palette.background.default} 0%, #0f1726 100%)`
          : `linear-gradient(180deg, ${theme.palette.background.default} 0%, #f4f7fd 100%)`,
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={{
          backdropFilter: 'blur(10px)',
          background: isDark
            ? 'rgba(11,18,32,0.88)'
            : 'rgba(248,251,255,0.9)',
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
          boxShadow: 'none',
        }}
      >
        <Toolbar
          sx={{
            gap: 2,
            px: { xs: 2, sm: 3.5, lg: 5 },
            py: { xs: 0.75, sm: 0.9 },
            minHeight: { xs: 64, sm: 68 },
          }}
        >
          <Box
            component={NavLink}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mr: 2.5,
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            <Box
              sx={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background: theme.palette.primary.main,
                boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.12)}`,
              }}
            />
            <Box>
              <Typography
                variant="h6"
                sx={{
                  lineHeight: 1,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  fontFamily: '"Space Grotesk", sans-serif',
                }}
              >
                auto-shop
              </Typography>
              <Typography variant="caption" color="text.secondary">
                workflow coordination interface
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
                  borderRadius: 2,
                  px: 1.75,
                  py: 0.7,
                  fontFamily: '"IBM Plex Sans", sans-serif',
                  fontSize: '0.95rem',
                  letterSpacing: '-0.01em',
                  border: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.2 : 0.12)}`,
                  backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.22 : 0.85),
                  '&.active': {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    borderColor: theme.palette.primary.main,
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
          <IconButton
            color="default"
            onClick={toggleMode}
            aria-label="Toggle dark mode"
            sx={{
              border: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.18 : 0.1)}`,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.background.paper, isDark ? 0.22 : 0.85),
            }}
          >
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container
        maxWidth="xl"
        sx={{
          flex: 1,
          px: { xs: 2, sm: 3.5, lg: 5 },
          py: { xs: 3, sm: 4, lg: 5 },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Outlet />
      </Container>
    </Box>
  );
}

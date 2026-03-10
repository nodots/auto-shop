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
  { to: '/', label: 'Shop Floor' },
  { to: '/bays', label: 'Bays' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/release-lane', label: 'Release Lane' },
  { to: '/dispatch', label: 'Dispatch Board' },
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
        background:
          isDark
            ? `radial-gradient(circle at top left, ${alpha('#d62828', 0.32)}, transparent 28%), radial-gradient(circle at top right, ${alpha('#fffaf2', 0.08)}, transparent 24%), linear-gradient(180deg, ${theme.palette.background.default} 0%, #050505 100%)`
            : `radial-gradient(circle at top left, ${alpha('#d62828', 0.16)}, transparent 28%), radial-gradient(circle at top right, ${alpha('#111111', 0.08)}, transparent 30%), linear-gradient(180deg, ${theme.palette.background.default} 0%, #efe4d0 100%)`,
        '&::before': {
          content: '""',
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background:
            'linear-gradient(45deg, rgba(17,17,17,0.07) 25%, transparent 25%, transparent 50%, rgba(17,17,17,0.07) 50%, rgba(17,17,17,0.07) 75%, transparent 75%, transparent)',
          backgroundSize: '24px 24px',
          opacity: isDark ? 0.08 : 0.1,
        },
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={{
          backdropFilter: 'blur(10px)',
          background: isDark
            ? 'linear-gradient(180deg, rgba(10,10,10,0.88), rgba(10,10,10,0.68))'
            : 'linear-gradient(180deg, rgba(255,250,242,0.94), rgba(255,250,242,0.78))',
          borderBottom: `3px solid ${theme.palette.primary.main}`,
          boxShadow: `0 6px 0 ${alpha('#111111', isDark ? 0.6 : 0.14)}`,
        }}
      >
        <Toolbar
          sx={{
            gap: 2,
            px: { xs: 2, sm: 3.5, lg: 5 },
            py: { xs: 1.25, sm: 1.5 },
            minHeight: { xs: 88, sm: 96 },
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
                width: 22,
                height: 22,
                borderRadius: '999px',
                background: 'radial-gradient(circle at 35% 35%, #fffaf2 0 18%, #d62828 20% 58%, #111111 62% 100%)',
                boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.18)}`,
              }}
            />
            <Box>
              <Typography
                variant="h6"
                sx={{
                  lineHeight: 1,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  fontFamily: '"Alfa Slab One", serif',
                  textTransform: 'lowercase',
                }}
              >
                nodots auto shop
              </Typography>
              <Typography variant="caption" color="text.secondary">
                custom code garage
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
                  textTransform: 'uppercase',
                  borderRadius: '999px',
                  px: 1.75,
                  py: 0.7,
                  fontFamily: '"Bebas Neue", sans-serif',
                  fontSize: '1rem',
                  letterSpacing: '0.08em',
                  border: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.2 : 0.12)}`,
                  backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.35 : 0.7),
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
              bgcolor: alpha(theme.palette.background.paper, isDark ? 0.32 : 0.75),
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

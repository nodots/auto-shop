import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';

interface ThemeModeContextType {
  mode: PaletteMode;
  toggleMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextType>({
  mode: 'light',
  toggleMode: () => {},
});

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

function getStoredMode(): PaletteMode {
  const stored = localStorage.getItem('auto-shop-theme-mode');
  if (stored === 'dark' || stored === 'light') return stored;
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(getStoredMode);

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('auto-shop-theme-mode', next);
      return next;
    });
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#2563eb',
            light: '#5b8def',
            dark: '#163e93',
            contrastText: '#f8fbff',
          },
          secondary: {
            main: '#0f1726',
            light: '#24324c',
            dark: '#070b14',
            contrastText: '#f8fbff',
          },
          text: mode === 'dark'
            ? {
                primary: '#f5f8ff',
                secondary: '#b8c2d8',
              }
            : {
                primary: '#0f1726',
                secondary: '#56637a',
              },
          ...(mode === 'dark'
            ? {
                background: {
                  default: '#0b1220',
                  paper: '#121b2d',
                },
              }
            : {
                background: {
                  default: '#eef3fb',
                  paper: '#f8fbff',
                },
              }),
        },
        typography: {
          fontFamily: '"IBM Plex Sans", sans-serif',
          h1: { fontFamily: '"Space Grotesk", sans-serif', letterSpacing: '-0.03em', fontWeight: 700 },
          h2: { fontFamily: '"Space Grotesk", sans-serif', letterSpacing: '-0.03em', fontWeight: 700 },
          h3: { fontFamily: '"Space Grotesk", sans-serif', letterSpacing: '-0.03em', fontWeight: 700 },
          h4: { fontFamily: '"Space Grotesk", sans-serif', letterSpacing: '-0.025em', fontWeight: 700 },
          h5: { fontFamily: '"Space Grotesk", sans-serif', letterSpacing: '-0.02em', fontWeight: 700 },
          h6: { fontFamily: '"Space Grotesk", sans-serif', letterSpacing: '-0.02em', fontWeight: 700 },
          button: { fontWeight: 700, letterSpacing: '0' },
        },
        shape: {
          borderRadius: 8,
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: mode === 'dark' ? '#0b1220' : '#eef3fb',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                border: `1px solid ${alpha(mode === 'dark' ? '#f8fbff' : '#0f1726', mode === 'dark' ? 0.08 : 0.08)}`,
                boxShadow: mode === 'dark'
                  ? '0 10px 28px rgba(0,0,0,0.22)'
                  : '0 8px 24px rgba(15, 23, 38, 0.06)',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                paddingInline: 18,
              },
              containedPrimary: {
                boxShadow: mode === 'dark'
                  ? '0 6px 18px rgba(37,99,235,0.24)'
                  : '0 4px 14px rgba(37,99,235,0.14)',
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                fontWeight: 700,
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

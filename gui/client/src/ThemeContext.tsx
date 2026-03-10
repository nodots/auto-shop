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
            main: '#d62828',
            light: '#ef4444',
            dark: '#8f1414',
            contrastText: '#fffaf2',
          },
          secondary: {
            main: '#111111',
            light: '#2f2f2f',
            dark: '#000000',
            contrastText: '#fffaf2',
          },
          text: mode === 'dark'
            ? {
                primary: '#fff6e8',
                secondary: '#d9cbb7',
              }
            : {
                primary: '#171717',
                secondary: '#5b5148',
              },
          ...(mode === 'dark'
            ? {
                background: {
                  default: '#100909',
                  paper: '#181010',
                },
              }
            : {
                background: {
                  default: '#f8f1e3',
                  paper: '#fffaf2',
                },
              }),
        },
        typography: {
          fontFamily: '"Work Sans", "Trebuchet MS", sans-serif',
          h1: { fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.03em' },
          h2: { fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.03em' },
          h3: { fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.03em' },
          h4: { fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.03em' },
          h5: { fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.04em' },
          h6: { fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.04em' },
          button: { fontWeight: 800, letterSpacing: '0.04em' },
        },
        shape: {
          borderRadius: 18,
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: mode === 'dark' ? '#100909' : '#f8f1e3',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                border: `1px solid ${alpha(mode === 'dark' ? '#fffaf2' : '#171717', mode === 'dark' ? 0.12 : 0.08)}`,
                boxShadow: mode === 'dark'
                  ? '0 20px 60px rgba(0,0,0,0.4)'
                  : '0 14px 40px rgba(120, 28, 28, 0.12)',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 999,
                paddingInline: 18,
              },
              containedPrimary: {
                boxShadow: mode === 'dark'
                  ? '0 10px 24px rgba(214,40,40,0.35)'
                  : '0 10px 24px rgba(214,40,40,0.22)',
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 999,
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

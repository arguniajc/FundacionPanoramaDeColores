import { createContext, useContext, useState, useMemo } from 'react';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { useConfiguracion } from '../context/ConfiguracionContext';

const ThemeCtx = createContext({ mode: 'light', toggleMode: () => {} });
export const useThemeMode = () => useContext(ThemeCtx);

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(
    () => localStorage.getItem('themeMode') || 'light'
  );
  const {
    colorPrimario,
    colorSecundario,
    colorOscuroFondo,
    colorOscuroPaper,
  } = useConfiguracion();

  const toggleMode = () =>
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', next);
      return next;
    });

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary:   { main: colorPrimario   || '#4E1B95' },
      secondary: { main: colorSecundario || '#2D984F' },
      background: {
        default: mode === 'light' ? '#f5f5f5' : (colorOscuroFondo  || '#0f0f0f'),
        paper:   mode === 'light' ? '#ffffff'  : (colorOscuroPaper || '#1c1c1c'),
      },
    },
    typography: { fontFamily: 'Inter, Roboto, sans-serif' },
    shape: { borderRadius: 8 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            letterSpacing: '0.01em',
            borderRadius: 8,
          },
          sizeSmall: { padding: '5px 14px' },
          sizeMedium: { padding: '7px 18px' },
          sizeLarge: { padding: '10px 24px' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600 },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { padding: '10px 14px' },
          head: { padding: '12px 14px', fontWeight: 700 },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { fontSize: '0.75rem', borderRadius: 6 },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { padding: '16px 24px' },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: { padding: '20px 24px' },
          dividers: { padding: '20px 24px' },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: { padding: '12px 24px 18px', gap: '8px' },
        },
      },
    },
  }), [mode, colorPrimario, colorSecundario, colorOscuroFondo, colorOscuroPaper]);

  return (
    <ThemeCtx.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeCtx.Provider>
  );
}

import { createContext, useContext, useState, useMemo } from 'react';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { useConfiguracion, DEFAULTS } from '../context/ConfiguracionContext';

const ThemeCtx = createContext({ mode: 'light', toggleMode: () => {} });
export const useThemeMode = () => useContext(ThemeCtx);

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(
    () => localStorage.getItem('themeMode') || 'light'
  );
  const {
    colorPrimario,
    colorSecundario,
    colorAccento,
    colorOscuroFondo,
    colorOscuroPaper,
    fontFamily,
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
      primary:   { main: colorPrimario   || DEFAULTS.colorPrimario   },
      secondary: { main: colorSecundario || DEFAULTS.colorSecundario },
      warning:   { main: colorAccento    || DEFAULTS.colorAccento    },
      background: {
        default: mode === 'light' ? '#fafafa'   : (colorOscuroFondo  || DEFAULTS.colorOscuroFondo),
        paper:   mode === 'light' ? '#ffffff'   : (colorOscuroPaper  || DEFAULTS.colorOscuroPaper),
      },
    },
    typography: {
      fontFamily: `'${fontFamily || 'Inter'}', sans-serif`,
    },
    shape: { borderRadius: 12 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            letterSpacing: '0.01em',
            borderRadius: 10,
          },
          sizeSmall:  { padding: '5px 14px' },
          sizeMedium: { padding: '7px 18px' },
          sizeLarge:  { padding: '10px 24px' },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.05)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: { borderRadius: 14 },
          elevation1: { boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.05)' },
          elevation2: { boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 6px 20px rgba(0,0,0,0.06)' },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 10 } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { padding: '10px 14px' },
          head: { padding: '12px 14px', fontWeight: 700 },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { fontSize: '0.75rem', borderRadius: 8 },
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { padding: '16px 24px' } },
      },
      MuiDialogContent: {
        styleOverrides: {
          root:     { padding: '20px 24px' },
          dividers: { padding: '20px 24px' },
        },
      },
      MuiDialogActions: {
        styleOverrides: { root: { padding: '12px 24px 18px', gap: '8px' } },
      },
      MuiTextField: {
        styleOverrides: {
          root: { '& .MuiOutlinedInput-root': { borderRadius: 10 } },
        },
      },
    },
  }), [mode, colorPrimario, colorSecundario, colorAccento, colorOscuroFondo, colorOscuroPaper, fontFamily]);

  return (
    <ThemeCtx.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeCtx.Provider>
  );
}

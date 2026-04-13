import { createContext, useContext, useState, useMemo } from 'react';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';

const ThemeCtx = createContext({ mode: 'light', toggleMode: () => {} });
export const useThemeMode = () => useContext(ThemeCtx);

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(
    () => localStorage.getItem('themeMode') || 'light'
  );

  const toggleMode = () =>
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', next);
      return next;
    });

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary:   { main: '#4E1B95' },
      secondary: { main: '#2D984F' },
      background: {
        default: mode === 'light' ? '#f5f5f5' : '#0f0f0f',
        paper:   mode === 'light' ? '#ffffff'  : '#1c1c1c',
      },
    },
    typography: { fontFamily: 'Inter, Roboto, sans-serif' },
    shape: { borderRadius: 8 },
  }), [mode]);

  return (
    <ThemeCtx.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeCtx.Provider>
  );
}

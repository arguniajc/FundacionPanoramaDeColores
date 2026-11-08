import { useState, useMemo, useEffect } from 'react';
import { createTheme, ThemeProvider, CssBaseline, alpha, lighten } from '@mui/material';
import { useConfiguracion, DEFAULTS } from '../context/useConfiguracion';
import { ThemeCtx } from './useThemeMode';
import { PALETA } from './paleta';

const MODO_KEY = 'themeMode';
// Pantallas de celular (< sm): zonas táctiles de al menos 40px
const CELULAR = '@media (max-width: 599.95px)';

/** Modo inicial: el guardado o, la primera vez, el del sistema operativo. */
function modoInicial() {
  try {
    const guardado = localStorage.getItem(MODO_KEY);
    if (guardado === 'light' || guardado === 'dark') return guardado;
  } catch { /* localStorage bloqueado: se usa el del sistema */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Color primario según modo: en claro se usa el de la configuración; en oscuro, si
 * es el de la paleta se usa su par oscuro y si es personalizado se aclara para que
 * mantenga contraste sobre fondos oscuros.
 */
function primarioPara(modo, colorConfig) {
  const base = colorConfig || DEFAULTS.colorPrimario;
  if (modo === 'light') return { main: base };
  return base.toLowerCase() === PALETA.light.primario.main.toLowerCase()
    ? PALETA.dark.primario
    : { main: lighten(base, 0.38) };
}

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(modoInicial);
  const { colorPrimario, fontFamily } = useConfiguracion();

  const toggleMode = () =>
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(MODO_KEY, next); } catch { /* solo se pierde la preferencia */ }
      return next;
    });

  // Permite que CSS global y componentes externos sepan el modo (p. ej. scrollbars, calendario)
  useEffect(() => {
    document.documentElement.dataset.modo = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  // --color-primario es el de la configuración (fondos y botones con texto blanco);
  // --color-primario-texto es su versión legible en el modo actual, para textos, íconos y bordes.
  const primarioTexto = primarioPara(mode, colorPrimario).main;
  useEffect(() => {
    document.documentElement.style.setProperty('--color-primario-texto', primarioTexto);
  }, [primarioTexto]);

  const theme = useMemo(() => {
    const p = PALETA[mode];
    const primary = primarioPara(mode, colorPrimario);
    const oscuro = mode === 'dark';

    return createTheme({
      palette: {
        mode,
        primary,
        secondary: p.secundario,
        success:   { main: p.exito.main, dark: p.exito.dark },
        warning:   { main: p.aviso.main, dark: p.aviso.dark },
        error:     { main: p.error.main, dark: p.error.dark },
        info:      { main: p.info.main,  dark: p.info.dark },
        background: { default: p.fondo, paper: p.superficie },
        text: { primary: p.texto, secondary: p.textoSuave, disabled: p.textoTenue },
        divider: p.borde,
        action: { hover: p.hover, selected: p.seleccion },
        superficie2: p.superficie2,
      },
      typography: {
        fontFamily: `'${fontFamily || 'Inter'}', system-ui, -apple-system, 'Segoe UI', sans-serif`,
        h4: { fontWeight: 800, letterSpacing: '-0.02em' },
        h5: { fontWeight: 800, letterSpacing: '-0.01em' },
        h6: { fontWeight: 700 },
        subtitle1: { fontWeight: 600 },
        button: { fontWeight: 600 },
        overline: { fontWeight: 700, letterSpacing: '0.08em' },
      },
      shape: { borderRadius: 10 },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: { backgroundColor: p.fondo },
            '*::-webkit-scrollbar': { width: 8, height: 8 },
            '*::-webkit-scrollbar-thumb': { backgroundColor: oscuro ? '#353C4B' : '#CDD2DB', borderRadius: 8 },
            '*::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
          },
        },
        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: {
            root: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em', borderRadius: 8, [CELULAR]: { minHeight: 40 } },
            sizeSmall:  { padding: '5px 12px', [CELULAR]: { minHeight: 40 } },
            sizeMedium: { padding: '7px 16px' },
            sizeLarge:  { padding: '10px 22px' },
            outlined: { borderColor: p.borde },
          },
        },
        MuiIconButton: { styleOverrides: { root: { borderRadius: 8, [CELULAR]: { minWidth: 40, minHeight: 40 } } } },
        MuiToggleButton: { styleOverrides: { root: { [CELULAR]: { minHeight: 40 } } } },
        MuiMenuItem: { styleOverrides: { root: { [CELULAR]: { minHeight: 44 } } } },
        MuiPaper: {
          defaultProps: { elevation: 0 },
          styleOverrides: {
            root: { backgroundImage: 'none' },
            rounded: { borderRadius: 12 },
            outlined: { borderColor: p.borde },
            elevation1: { boxShadow: oscuro ? 'none' : '0 1px 2px rgba(16,24,40,0.06)', border: `1px solid ${p.borde}` },
            elevation2: { boxShadow: oscuro ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 12px rgba(16,24,40,0.08)' },
          },
        },
        MuiCard: {
          defaultProps: { elevation: 0 },
          styleOverrides: {
            root: {
              borderRadius: 12,
              border: `1px solid ${p.borde}`,
              boxShadow: oscuro ? 'none' : '0 1px 2px rgba(16,24,40,0.05)',
            },
          },
        },
        MuiAppBar: { defaultProps: { elevation: 0, color: 'inherit' } },
        // Chips clicables (filtros, días, avisos con acción): 40px de alto en celular
        MuiChip: {
          styleOverrides: {
            root: { fontWeight: 600, borderRadius: 6, [CELULAR]: { '&.MuiChip-clickable': { minHeight: 40 } } },
          },
        },
        MuiPaginationItem: { styleOverrides: { root: { [CELULAR]: { minWidth: 40, height: 40 } } } },
        // Autocomplete: el input (role=combobox) ocupa todo el alto del campo en celular,
        // sin cambiar el alto total (el relleno pasa del contenedor al input).
        MuiAutocomplete: {
          styleOverrides: {
            root: {
              [CELULAR]: {
                '& .MuiOutlinedInput-root': {
                  paddingTop: 0, paddingBottom: 0,
                  '& .MuiAutocomplete-input': { paddingTop: 16.5, paddingBottom: 16.5 },
                },
                '& .MuiOutlinedInput-root.MuiInputBase-sizeSmall': {
                  paddingTop: 0, paddingBottom: 0,
                  '& .MuiAutocomplete-input': { paddingTop: 8.5, paddingBottom: 8.5 },
                },
              },
            },
          },
        },
        MuiAlert: { styleOverrides: { root: { borderRadius: 10 } } },
        MuiTableContainer: { styleOverrides: { root: { borderRadius: 12 } } },
        // El fondo va en la cabecera (no en cada celda) para que las páginas que pintan
        // su propia cabecera (fila con color de marca y texto blanco) no queden tapadas.
        MuiTableHead: { styleOverrides: { root: { backgroundColor: p.superficie2 } } },
        MuiTableCell: {
          styleOverrides: {
            root: { padding: '10px 14px', borderColor: p.borde },
            head: {
              padding: '10px 14px', fontWeight: 700, fontSize: '0.72rem',
              textTransform: 'uppercase', letterSpacing: '0.04em', color: p.textoSuave,
            },
            stickyHeader: { backgroundColor: p.superficie2 },
          },
        },
        MuiTableRow: { styleOverrides: { root: { '&.MuiTableRow-hover:hover': { backgroundColor: p.hover } } } },
        MuiTooltip: {
          defaultProps: { arrow: true },
          styleOverrides: {
            tooltip: { fontSize: '0.75rem', borderRadius: 6, backgroundColor: oscuro ? '#2A303D' : '#1D2433' },
            arrow: { color: oscuro ? '#2A303D' : '#1D2433' },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: { borderRadius: 14, border: oscuro ? `1px solid ${p.borde}` : 'none' },
          },
        },
        MuiDialogTitle: { styleOverrides: { root: { padding: '16px 24px', fontWeight: 700 } } },
        MuiDialogContent: {
          styleOverrides: { root: { padding: '20px 24px' }, dividers: { padding: '20px 24px', borderColor: p.borde } },
        },
        MuiDialogActions: { styleOverrides: { root: { padding: '12px 24px 18px', gap: '8px' } } },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              backgroundColor: oscuro ? alpha('#FFFFFF', 0.02) : '#FFFFFF',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: p.borde },
            },
          },
        },
        MuiTabs: {
          styleOverrides: {
            root: { minHeight: 42 },
            indicator: { height: 3, borderRadius: '3px 3px 0 0' },
          },
        },
        MuiTab: {
          styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 42 } },
        },
        MuiDivider: { styleOverrides: { root: { borderColor: p.borde } } },
        MuiDrawer: { styleOverrides: { paper: { backgroundImage: 'none' } } },
        MuiMenu: { styleOverrides: { paper: { border: `1px solid ${p.borde}` } } },
        MuiPopover: { styleOverrides: { paper: { border: `1px solid ${p.borde}` } } },
      },
    });
  }, [mode, colorPrimario, fontFamily]);

  return (
    <ThemeCtx.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeCtx.Provider>
  );
}

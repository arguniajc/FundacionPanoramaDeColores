/**
 * Paleta central del panel (una sola fuente de verdad para colores).
 *
 * Basada en la identidad de la fundación (violeta, verde, naranja) ajustada para
 * pantallas: contraste AA en texto, tonos suaves para fondos y una versión propia
 * para el modo oscuro (no es solo "invertir"). Los componentes deben usar el tema
 * (`primary.main`, `text.secondary`, `divider`, `success.main`…) o `ESTADO`,
 * nunca colores hexadecimales sueltos.
 */

export const PALETA = {
  light: {
    primario:    { main: '#5B2BB3', light: '#7C4DDB', dark: '#43208A', contrastText: '#FFFFFF' },
    secundario:  { main: '#15803D', light: '#22A55A', dark: '#0F6630', contrastText: '#FFFFFF' },
    exito:       { main: '#15803D', light: '#DCFCE7', dark: '#0F6630' },
    aviso:       { main: '#D97706', light: '#FEF3C7', dark: '#B45309' },
    error:       { main: '#DC2626', light: '#FEE2E2', dark: '#B91C1C' },
    info:        { main: '#0284C7', light: '#E0F2FE', dark: '#0369A1' },
    fondo:       '#F5F6FA',
    superficie:  '#FFFFFF',
    superficie2: '#F9FAFB',   // cabeceras de tabla, zonas secundarias
    borde:       '#E4E7EC',
    texto:       '#101828',
    textoSuave:  '#475467',
    textoTenue:  '#667085',
    hover:       'rgba(91, 43, 179, 0.06)',
    seleccion:   'rgba(91, 43, 179, 0.12)',
  },
  dark: {
    primario:    { main: '#A78BFA', light: '#C4B5FD', dark: '#8B5CF6', contrastText: '#14102A' },
    secundario:  { main: '#34D399', light: '#6EE7B7', dark: '#10B981', contrastText: '#052E1B' },
    exito:       { main: '#34D399', light: 'rgba(52, 211, 153, 0.14)', dark: '#10B981' },
    aviso:       { main: '#FBBF24', light: 'rgba(251, 191, 36, 0.14)', dark: '#F59E0B' },
    error:       { main: '#F87171', light: 'rgba(248, 113, 113, 0.14)', dark: '#EF4444' },
    info:        { main: '#38BDF8', light: 'rgba(56, 189, 248, 0.14)', dark: '#0EA5E9' },
    fondo:       '#0D1017',
    superficie:  '#161A23',
    superficie2: '#1C212C',
    borde:       '#2A303D',
    texto:       '#E8EAF0',
    textoSuave:  '#A6AEBF',
    textoTenue:  '#7D8597',
    hover:       'rgba(167, 139, 250, 0.08)',
    seleccion:   'rgba(167, 139, 250, 0.16)',
  },
};

/** Menú lateral: oscuro en ambos modos (aspecto de ERP, foco en el contenido). */
export const SIDEBAR = {
  light: {
    fondo: '#1C1433', texto: 'rgba(255,255,255,0.86)', textoTenue: 'rgba(255,255,255,0.48)',
    grupo: 'rgba(255,255,255,0.42)', icono: 'rgba(255,255,255,0.62)', hover: 'rgba(255,255,255,0.07)',
    activoFondo: 'rgba(167,139,250,0.20)', activoTexto: '#FFFFFF', activoIcono: '#C4B5FD', activoBarra: '#A78BFA',
    borde: 'rgba(255,255,255,0.08)', buscador: 'rgba(255,255,255,0.07)',
  },
  dark: {
    fondo: '#11141C', texto: 'rgba(232,234,240,0.88)', textoTenue: 'rgba(232,234,240,0.45)',
    grupo: 'rgba(232,234,240,0.40)', icono: 'rgba(232,234,240,0.58)', hover: 'rgba(255,255,255,0.05)',
    activoFondo: 'rgba(167,139,250,0.16)', activoTexto: '#FFFFFF', activoIcono: '#C4B5FD', activoBarra: '#A78BFA',
    borde: 'rgba(255,255,255,0.06)', buscador: 'rgba(255,255,255,0.05)',
  },
};

/**
 * Colores semánticos para estados (chips, etiquetas, indicadores). Uso:
 *   const { fondo, texto } = colorEstado('activo', theme.palette.mode)
 */
const TONO = {
  exito:  { light: { fondo: '#DCFCE7', texto: '#166534' }, dark: { fondo: 'rgba(52,211,153,0.14)',  texto: '#6EE7B7' } },
  aviso:  { light: { fondo: '#FEF3C7', texto: '#92400E' }, dark: { fondo: 'rgba(251,191,36,0.14)',  texto: '#FCD34D' } },
  error:  { light: { fondo: '#FEE2E2', texto: '#991B1B' }, dark: { fondo: 'rgba(248,113,113,0.14)', texto: '#FCA5A5' } },
  info:   { light: { fondo: '#E0F2FE', texto: '#075985' }, dark: { fondo: 'rgba(56,189,248,0.14)',  texto: '#7DD3FC' } },
  marca:  { light: { fondo: '#EDE7F8', texto: '#43208A' }, dark: { fondo: 'rgba(167,139,250,0.16)', texto: '#C4B5FD' } },
  neutro: { light: { fondo: '#F2F4F7', texto: '#344054' }, dark: { fondo: 'rgba(255,255,255,0.08)', texto: '#D0D5DD' } },
};

const ESTADO_A_TONO = {
  activo: 'exito', aprobado: 'exito', completado: 'exito', pagado: 'exito', emitido: 'exito', confirmada: 'exito',
  pendiente: 'aviso', borrador: 'aviso', en_proceso: 'aviso', por_vencer: 'aviso',
  baja: 'error', inactivo: 'error', anulado: 'error', rechazado: 'error', vencido: 'error', cancelada: 'error',
  info: 'info', programada: 'info',
};

/** Tono por nombre de estado (activo, baja, pendiente…) o por tono directo (exito, aviso…). */
export function colorEstado(estadoOTono, modo = 'light') {
  const clave = String(estadoOTono ?? '').toLowerCase().replace(/\s+/g, '_');
  const tono = TONO[clave] ? clave : (ESTADO_A_TONO[clave] ?? 'neutro');
  return TONO[tono][modo === 'dark' ? 'dark' : 'light'];
}

/** Valores recomendados para Configuración → Apariencia (botón "Usar paleta recomendada"). */
export const APARIENCIA_RECOMENDADA = {
  colorPrimario:      PALETA.light.primario.main,
  colorSecundario:    PALETA.light.secundario.main,
  colorGradiente:     PALETA.light.primario.dark,
  colorAccento:       PALETA.light.aviso.main,
  colorSidebar:       SIDEBAR.light.fondo,
  colorOscuroFondo:   PALETA.dark.fondo,
  colorOscuroPaper:   PALETA.dark.superficie,
  colorOscuroSidebar: SIDEBAR.dark.fondo,
  fontFamily:         'Inter',
};

// ── Components ────────────────────────────────────────────────────────────────
export { default as SkeletonTabla }      from './components/SkeletonTabla';
export { ConfirmProvider }               from './components/ConfirmDialog';
export { useConfirm }                    from './components/useConfirm';
export { default as FirmaPad }           from './components/FirmaPad';
export { default as UploadFoto }         from './components/UploadFoto';
export { default as UploadDocumento }    from './components/UploadDocumento';
export { default as CamaraFoto }         from './components/CamaraFoto';
export { default as PantallaCarga }      from './components/PantallaCarga';
export { default as RutaProtegida }      from './components/RutaProtegida';
export { default as SinAcceso }          from './components/SinAcceso';
export { default as ModuloEnDesarrollo } from './components/ModuloEnDesarrollo';
export {
  CampoFecha, CampoDocumento, CampoCiudad,
  SelectorUbicacion, CampoUnidadMedida, CampoMedidas,
} from './components/form/FormControles';

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { useAsyncData }                          from './hooks/useAsyncData';
export { default as usePermisos }                from './hooks/usePermisos';
export { useGeografia, useGeografiaColombia }    from './hooks/useGeografia';

// ── Context ───────────────────────────────────────────────────────────────────
export { ConfiguracionProvider }         from './context/ConfiguracionContext';
export { FONT_OPTIONS, DEFAULTS, useConfiguracion } from './context/useConfiguracion';
export { ToastProvider }                 from './context/ToastContext';
export { useToast }                      from './context/useToast';
export { AppThemeProvider }              from './theme/ThemeContext';
export { useThemeMode }                  from './theme/useThemeMode';

// ── Constants ─────────────────────────────────────────────────────────────────
export { BRAND_COLOR }                           from './constants/brand';
export { LOGIN_URL }                             from './constants/routes';
export {
  TIPOS_DOC, PAISES, PARENTESCOS,
  TALLAS_CAMISA, TALLAS_PANTALON, TALLAS_ZAPATOS, EPS_LIST,
} from './constants/beneficiarios';

// ── Utils ─────────────────────────────────────────────────────────────────────
export { calcularEdad }                          from './utils/fecha';
export { default as logger }                     from './utils/logger';
export { abrirHojaDeVida }                       from './utils/pdf';
export { generarPdfInscripcion }                 from './utils/generarPdfInscripcion';
export { exportarExcel }                         from './utils/exportarExcel';

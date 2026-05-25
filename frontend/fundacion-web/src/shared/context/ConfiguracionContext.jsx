import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { configuracionRepository } from '@/infrastructure/repositories/configuracionRepository';

export const FONT_OPTIONS = [
  { value: 'Inter',      label: 'Inter',      desc: 'Moderna y limpia — ideal para dashboards' },
  { value: 'Poppins',    label: 'Poppins',    desc: 'Amigable y moderna — sensación humana' },
  { value: 'Nunito',     label: 'Nunito',     desc: 'Social y cálida — perfecta para fundaciones' },
  { value: 'Roboto',     label: 'Roboto',     desc: 'Clásica Google — excelente legibilidad' },
  { value: 'Open Sans',  label: 'Open Sans',  desc: 'Cómoda para lectura extensa' },
];

const FONT_GOOGLE_MAP = {
  'Inter':     'Inter:wght@400;500;600;700;800',
  'Poppins':   'Poppins:wght@400;500;600;700;800',
  'Nunito':    'Nunito:wght@400;500;600;700;800',
  'Roboto':    'Roboto:wght@400;500;700',
  'Open Sans': 'Open+Sans:wght@400;500;600;700',
};

export const DEFAULTS = {
  colorPrimario:      '#6735A6',
  colorSidebar:       '#F4E3C1',
  colorSecundario:    '#51A432',
  colorGradiente:     '#085A9D',
  colorAccento:       '#FAA112',
  colorOscuroFondo:   '#121212',
  colorOscuroPaper:   '#1E1A28',
  colorOscuroSidebar: '#1B1035',
  fontFamily:         'Inter',
  nombreFundacion:    'Fundación Panorama de Colores',
  nit:                '',
  direccion:          '',
  telefono:           '',
  tagline:            '',
  mision:             '',
  vision:             '',
  emailContacto:      '',
  sitioWeb:           '',
  mensajeBienvenida:  '',
  footerTexto:        '',
};

const CACHE_KEY = 'fundacion_config_cache';
const CACHE_TTL = 5 * 60 * 1000;

function cargarFuente(fontFamily) {
  const family = fontFamily || 'Inter';
  const spec   = FONT_GOOGLE_MAP[family] || FONT_GOOGLE_MAP['Inter'];
  const href   = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  let link = document.getElementById('dynamic-font-link');
  if (!link) {
    link = document.createElement('link');
    link.id  = 'dynamic-font-link';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = href;
  document.documentElement.style.setProperty('--fuente-principal', `'${family}', sans-serif`);
  document.body.style.fontFamily = `'${family}', sans-serif`;
}

function aplicarCssVars(cfg) {
  const root = document.documentElement;
  root.style.setProperty('--color-primario',       cfg.colorPrimario      || DEFAULTS.colorPrimario);
  root.style.setProperty('--color-sidebar',        cfg.colorSidebar       || DEFAULTS.colorSidebar);
  root.style.setProperty('--color-secundario',     cfg.colorSecundario    || DEFAULTS.colorSecundario);
  root.style.setProperty('--color-gradiente',      cfg.colorGradiente     || DEFAULTS.colorGradiente);
  root.style.setProperty('--color-acento',         cfg.colorAccento       || DEFAULTS.colorAccento);
  root.style.setProperty('--color-oscuro-fondo',   cfg.colorOscuroFondo   || DEFAULTS.colorOscuroFondo);
  root.style.setProperty('--color-oscuro-paper',   cfg.colorOscuroPaper   || DEFAULTS.colorOscuroPaper);
  root.style.setProperty('--color-oscuro-sidebar', cfg.colorOscuroSidebar || DEFAULTS.colorOscuroSidebar);
  cargarFuente(cfg.fontFamily);
}

function cargarCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.ts) return parsed;
    return Date.now() - parsed.ts < CACHE_TTL ? parsed.data : null;
  } catch {
    return null;
  }
}

function guardarCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch { /* noop */ }
}

const ConfiguracionCtx = createContext({ ...DEFAULTS, actualizarConfig: () => {} });
export const useConfiguracion = () => useContext(ConfiguracionCtx);

export function ConfiguracionProvider({ children }) {
  const [config, setConfig] = useState(() => {
    const cached = cargarCache();
    const merged = { ...DEFAULTS, ...cached };
    aplicarCssVars(merged);
    return merged;
  });

  const actualizar = useCallback((data) => {
    const merged = {
      colorPrimario:      data.colorPrimario      || DEFAULTS.colorPrimario,
      colorSidebar:       data.colorSidebar       || DEFAULTS.colorSidebar,
      colorSecundario:    data.colorSecundario    || DEFAULTS.colorSecundario,
      colorGradiente:     data.colorGradiente     || DEFAULTS.colorGradiente,
      colorAccento:       data.colorAccento       || DEFAULTS.colorAccento,
      colorOscuroFondo:   data.colorOscuroFondo   || DEFAULTS.colorOscuroFondo,
      colorOscuroPaper:   data.colorOscuroPaper   || DEFAULTS.colorOscuroPaper,
      colorOscuroSidebar: data.colorOscuroSidebar || DEFAULTS.colorOscuroSidebar,
      fontFamily:         data.fontFamily         || DEFAULTS.fontFamily,
      nombreFundacion:    data.nombreFundacion    ?? DEFAULTS.nombreFundacion,
      nit:                data.nit               ?? '',
      direccion:          data.direccion         ?? '',
      telefono:           data.telefono          ?? '',
      tagline:            data.tagline           ?? '',
      mision:             data.mision            ?? '',
      vision:             data.vision            ?? '',
      emailContacto:      data.emailContacto     ?? '',
      sitioWeb:           data.sitioWeb          ?? '',
      mensajeBienvenida:  data.mensajeBienvenida ?? '',
      footerTexto:        data.footerTexto       ?? '',
    };
    aplicarCssVars(merged);
    guardarCache(merged);
    setConfig(merged);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.ts && Date.now() - parsed.ts < CACHE_TTL) return;
      } catch { /* ignorar cache corrupto */ }
    }
    configuracionRepository.obtenerPublica()
      .then(({ data }) => actualizar(data))
      .catch(() => { /* usar defaults/cache */ });
  }, [actualizar]);

  return (
    <ConfiguracionCtx.Provider value={{ ...config, actualizarConfig: actualizar }}>
      {children}
    </ConfiguracionCtx.Provider>
  );
}

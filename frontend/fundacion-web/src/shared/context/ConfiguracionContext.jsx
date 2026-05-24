import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { configuracionRepository } from '../../infrastructure/repositories/configuracionRepository';

const DEFAULTS = {
  colorPrimario:      '#4E1B95',
  colorSidebar:       '#150830',
  colorSecundario:    '#2D984F',
  colorGradiente:     '#3a1470',
  colorOscuroFondo:   '#0f0f0f',
  colorOscuroPaper:   '#1c1c1c',
  colorOscuroSidebar: '#0d1117',
  nombreFundacion:   'Fundación Panorama de Colores',
  nit:               '',
  direccion:         '',
  telefono:          '',
  tagline:           '',
  mision:            '',
  vision:            '',
  emailContacto:     '',
  sitioWeb:          '',
  mensajeBienvenida: '',
  footerTexto:       '',
};

const CACHE_KEY = 'fundacion_config_cache';
const CACHE_TTL = 5 * 60 * 1000;

function aplicarCssVars(cfg) {
  const root = document.documentElement;
  root.style.setProperty('--color-primario',       cfg.colorPrimario      || DEFAULTS.colorPrimario);
  root.style.setProperty('--color-sidebar',        cfg.colorSidebar       || DEFAULTS.colorSidebar);
  root.style.setProperty('--color-secundario',     cfg.colorSecundario    || DEFAULTS.colorSecundario);
  root.style.setProperty('--color-gradiente',      cfg.colorGradiente     || DEFAULTS.colorGradiente);
  root.style.setProperty('--color-oscuro-fondo',   cfg.colorOscuroFondo   || DEFAULTS.colorOscuroFondo);
  root.style.setProperty('--color-oscuro-paper',   cfg.colorOscuroPaper   || DEFAULTS.colorOscuroPaper);
  root.style.setProperty('--color-oscuro-sidebar', cfg.colorOscuroSidebar || DEFAULTS.colorOscuroSidebar);
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
      colorOscuroFondo:   data.colorOscuroFondo   || DEFAULTS.colorOscuroFondo,
      colorOscuroPaper:   data.colorOscuroPaper   || DEFAULTS.colorOscuroPaper,
      colorOscuroSidebar: data.colorOscuroSidebar || DEFAULTS.colorOscuroSidebar,
      nombreFundacion:   data.nombreFundacion   ?? DEFAULTS.nombreFundacion,
      nit:               data.nit               ?? '',
      direccion:         data.direccion         ?? '',
      telefono:          data.telefono          ?? '',
      tagline:           data.tagline           ?? '',
      mision:            data.mision            ?? '',
      vision:            data.vision            ?? '',
      emailContacto:     data.emailContacto     ?? '',
      sitioWeb:          data.sitioWeb          ?? '',
      mensajeBienvenida: data.mensajeBienvenida ?? '',
      footerTexto:       data.footerTexto       ?? '',
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
      .catch(() => { /* sin configuración guardada — usar defaults/cache */ });
  }, [actualizar]);

  return (
    <ConfiguracionCtx.Provider value={{ ...config, actualizarConfig: actualizar }}>
      {children}
    </ConfiguracionCtx.Provider>
  );
}

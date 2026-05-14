import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { configuracionRepository } from '../../infrastructure/repositories/configuracionRepository';

const DEFAULTS = {
  colorPrimario:     '#4E1B95',
  colorSidebar:      '#150830',
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

function aplicarCssVars(colorPrimario, colorSidebar) {
  const root = document.documentElement;
  root.style.setProperty('--color-primario', colorPrimario || DEFAULTS.colorPrimario);
  root.style.setProperty('--color-sidebar',  colorSidebar  || DEFAULTS.colorSidebar);
}

function cargarCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function guardarCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* noop */ }
}

const ConfiguracionCtx = createContext({ ...DEFAULTS, actualizarConfig: () => {} });
export const useConfiguracion = () => useContext(ConfiguracionCtx);

export function ConfiguracionProvider({ children }) {
  const [config, setConfig] = useState(() => {
    const cached = cargarCache();
    const merged = { ...DEFAULTS, ...cached };
    aplicarCssVars(merged.colorPrimario, merged.colorSidebar);
    return merged;
  });

  const actualizar = useCallback((data) => {
    const merged = {
      colorPrimario:     data.colorPrimario     || DEFAULTS.colorPrimario,
      colorSidebar:      data.colorSidebar      || DEFAULTS.colorSidebar,
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
    aplicarCssVars(merged.colorPrimario, merged.colorSidebar);
    guardarCache(merged);
    setConfig(merged);
  }, []);

  useEffect(() => {
    // Usa el endpoint público para cargar colores sin requerir auth (sirve en login también)
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

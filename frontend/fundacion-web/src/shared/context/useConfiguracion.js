import { createContext, useContext } from 'react';

export const FONT_OPTIONS = [
  { value: 'Inter',      label: 'Inter',      desc: 'Moderna y limpia — ideal para dashboards' },
  { value: 'Poppins',    label: 'Poppins',    desc: 'Amigable y moderna — sensación humana' },
  { value: 'Nunito',     label: 'Nunito',     desc: 'Social y cálida — perfecta para fundaciones' },
  { value: 'Roboto',     label: 'Roboto',     desc: 'Clásica Google — excelente legibilidad' },
  { value: 'Open Sans',  label: 'Open Sans',  desc: 'Cómoda para lectura extensa' },
];

export const DEFAULTS = {
  // Paleta recomendada (ver shared/theme/paleta.js → APARIENCIA_RECOMENDADA)
  colorPrimario:      '#5B2BB3',
  colorSidebar:       '#1C1433',
  colorSecundario:    '#15803D',
  colorGradiente:     '#43208A',
  colorAccento:       '#D97706',
  colorOscuroFondo:   '#0D1017',
  colorOscuroPaper:   '#161A23',
  colorOscuroSidebar: '#11141C',
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

export const ConfiguracionCtx = createContext({ ...DEFAULTS, actualizarConfig: () => {} });
export const useConfiguracion = () => useContext(ConfiguracionCtx);

import { createContext, useContext } from 'react';

export const FONT_OPTIONS = [
  { value: 'Inter',      label: 'Inter',      desc: 'Moderna y limpia — ideal para dashboards' },
  { value: 'Poppins',    label: 'Poppins',    desc: 'Amigable y moderna — sensación humana' },
  { value: 'Nunito',     label: 'Nunito',     desc: 'Social y cálida — perfecta para fundaciones' },
  { value: 'Roboto',     label: 'Roboto',     desc: 'Clásica Google — excelente legibilidad' },
  { value: 'Open Sans',  label: 'Open Sans',  desc: 'Cómoda para lectura extensa' },
];

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

export const ConfiguracionCtx = createContext({ ...DEFAULTS, actualizarConfig: () => {} });
export const useConfiguracion = () => useContext(ConfiguracionCtx);

import { BRAND_COLOR } from '@/shared/constants/brand';

export const COLOR     = 'var(--color-primario)';
export const TIPOS_DOC = ['CC', 'CE', 'PP', 'NIT', 'Otro'];
export const FA_ICONOS = [
  'fa-palette','fa-futbol','fa-leaf','fa-users','fa-star','fa-heart',
  'fa-book','fa-music','fa-camera','fa-paint-brush','fa-seedling',
  'fa-child','fa-hands-helping','fa-graduation-cap','fa-running',
];

export const DEFAULT_WEB = {
  slider: [
    { titulo: 'Transformando vidas a través del arte', subtitulo: 'Descubre el potencial creativo de niños y niñas del barrio Panorama Comuna 1', cta: 'Conoce nuestros programas', ctaHref: '#que-hacemos', imagen: '' },
    { titulo: 'Deporte para el desarrollo integral',   subtitulo: 'Fomentamos valores y habilidades a través de actividades deportivas',         cta: 'Ver nuestras actividades', ctaHref: '#galeria',     imagen: '' },
    { titulo: 'Conciencia ambiental para un futuro mejor', subtitulo: 'Educamos y actuamos por un entorno más sostenible',                        cta: 'Únete a nuestra causa',    ctaHref: '#donaciones',  imagen: '' },
  ],
  quienesSomos: {
    imagen: '',
    mision: 'Transformar vidas de niños, niñas y familias en el barrio Panorama Comuna 1 a través del arte, el deporte y la conciencia ambiental, promoviendo el desarrollo integral y la construcción de un futuro sostenible.',
    vision: 'Ser una fundación líder en la transformación social del barrio Panorama Comuna 1, reconocida por nuestro compromiso con el desarrollo integral de la niñez y la promoción de entornos sostenibles y saludables.',
    historia: 'Fundación Panorama de Colores nació hace más de 2 años como una iniciativa comunitaria para brindar oportunidades a niños y niñas en situación de vulnerabilidad. Desde entonces, hemos crecido y transformado la vida de más de 18 niños y sus familias.',
  },
  programas: [
    { icono: 'fa-palette', titulo: 'Arte y Creatividad',  descripcion: '' },
    { icono: 'fa-futbol',  titulo: 'Deporte y Recreación', descripcion: '' },
    { icono: 'fa-leaf',    titulo: 'Conciencia Ambiental', descripcion: '' },
    { icono: 'fa-users',   titulo: 'Apoyo',                descripcion: '' },
  ],
  impacto: {
    visible: false,
    titulo: 'NUESTRO IMPACTO EN EL BARRIO PANORAMA',
    items: [
      { numero: 20, label: 'Niñas y niños formados en nuestros programas' },
      { numero: 20, label: 'Familias beneficiadas' },
      { numero: 1,  label: 'Año trabajando por la niñez del barrio Panorama de Yumbo Valle' },
      { numero: 15, label: 'Talleres realizados' },
    ],
  },
  galeria: [
    { imagen: '', titulo: 'Taller de arte infantil' },
    { imagen: '', titulo: 'Actividad deportiva con niños' },
    { imagen: '', titulo: 'Taller de conciencia ambiental' },
    { imagen: '', titulo: 'Niños mostrando sus creaciones' },
    { imagen: '', titulo: 'Familia participando en actividades' },
    { imagen: '', titulo: 'Evento comunitario de la fundación' },
  ],
  donaciones: {
    whatsapp: '573226012056',
    email: 'Panoramadecolores@gmail.com',
    textoVoluntariado: 'Únete como voluntario y comparte tus habilidades con nuestra comunidad.',
    textoEspecie: 'Materiales de arte, deportivos o recursos para nuestros talleres.',
    textoMonetario: 'Si deseas realizar una donación monetaria y recibir la información necesaria, puedes escribirnos por WhatsApp o correo. Con tu aporte seguimos ampliando nuestro impacto',
  },
  contacto: {
    direccion: 'Carrera 7F 16H-10 Barrio Panorama Comuna 1- Yumbo Valle del Cauca, Colombia',
    telefono: '+57 322 602 2056',
    email: 'Panoramadecolores@gmail.com',
    instagram: 'https://www.instagram.com/fundacionpanoramadecolores/',
    tiktok: 'https://www.tiktok.com/@fundapanoramadecolores',
    whatsapp: '573226012056',
  },
  footer: {
    nombre: 'FUNDACIÓN PANORAMA DE COLORES',
    eslogan: 'Transformamos vidas a través del arte, el deporte y la conciencia ambiental.',
    copyright: '© 2025 Fundación Panorama de Colores. Todos los derechos reservados.',
  },
};

export const VACIO_FORM = {
  nombreFundacion: '', nit: '', direccion: '', telefono: '',
  nombreRepLegal: '', tipoDocRep: 'CC', documentoRep: '', cargoRep: '', firmaRep: '',
  colorPrimario: BRAND_COLOR, colorSidebar: '#150830',
  tagline: '', mision: '', vision: '',
  emailContacto: '', sitioWeb: '', mensajeBienvenida: '', footerTexto: '',
  webContenido: '',
};

export function leerArchivoComoDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
export function redimensionarImagen(dataUrl, maxW = 600) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxW / img.naturalWidth);
      const w = Math.round(img.naturalWidth * ratio);
      const h = Math.round(img.naturalHeight * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
export function mergeDeep(defaults, overrides) {
  if (!overrides) return defaults;
  const result = { ...defaults };
  for (const key of Object.keys(overrides)) {
    const d = defaults[key];
    const o = overrides[key];
    if (Array.isArray(o))                result[key] = o;
    else if (o && typeof o === 'object') result[key] = mergeDeep(d || {}, o);
    else if (o !== undefined)            result[key] = o;
  }
  return result;
}

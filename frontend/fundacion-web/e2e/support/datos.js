// Datos de prueba que devuelve la API falsa. Las formas de respuesta siguen lo
// que leen los hooks/páginas de src/ (p. ej. GET /api/beneficiarios →
// { data, total, pagina, porPagina }).

export const USUARIO = {
  email: 'ana.admin@example.org',
  nombre: 'Ana Prueba',
  avatarUrl: null,
};

/** JWT sintácticamente válido (sin firma real: la API está simulada). */
export function crearJwt({ venceEnMin = 8 * 60, ahora = Date.now() } = {}) {
  const b64url = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const exp = Math.floor(ahora / 1000) + venceEnMin * 60;
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: '1', email: USUARIO.email, exp })}.e2e-firma`;
}

export const CONFIG_PUBLICA = {
  nombreFundacion: 'Fundación Panorama de Colores',
  colorPrimario: '#6735A6',
  colorSidebar: '#F4E3C1',
  fontFamily: 'Inter',
};

export const STATS_NINOS = {
  totalActivos: 3,
  extranjeros: 1,
  otraRegion: 1,
  sinEdad: 0,
  porRango: [
    { codigo: 'PI', nombre: 'Primera infancia', total: 1 },
    { codigo: 'IN', nombre: 'Infancia', total: 1 },
    { codigo: 'AD', nombre: 'Adolescencia', total: 1 },
  ],
  porGenero: [
    { genero: 'Femenino', total: 2 },
    { genero: 'Masculino', total: 1 },
  ],
  topPaises: [{ pais: 'Venezuela', total: 1 }],
  departamentosConCiudades: [
    { departamento: 'Valle del Cauca', total: 2, ciudades: [{ ciudad: 'Yumbo', total: 2 }] },
  ],
};

const base = {
  tipoDocumento: 'TI',
  tieneAlergia: 'no',
  activo: true,
  fotoMenorUrl: null,
  fotoDocumentoUrl: null,
  eps: 'Nueva EPS',
  direccion: 'Calle 5 # 10-20',
  tallaCamisa: '10',
  tallaZapatos: '32',
  pesoKg: 30,
  nombreColegio: 'IE Panorama',
  gradoEscolar: '4°',
  createdAt: '2026-01-15T10:00:00Z',
};

export const BENEFICIARIOS = [
  { ...base, id: 101, nombreMenor: 'Valentina Rodríguez Gómez', numeroDocumento: '1107123456', fechaNacimiento: '2015-04-12', genero: 'Femenino', whatsapp: '3001234567' },
  { ...base, id: 102, nombreMenor: 'Santiago Pérez Mina', numeroDocumento: '1107654321', fechaNacimiento: '2013-09-30', genero: 'Masculino', whatsapp: '3109876543', tieneAlergia: 'si' },
  { ...base, id: 103, nombreMenor: 'Isabella Castro Ríos', tipoDocumento: 'RC', numeroDocumento: '1107000111', fechaNacimiento: '2021-01-05', genero: 'Femenino', whatsapp: null },
];

export const STATS_BENEFICIARIOS = { activos: 3, baja: 0, total: 3 };

/**
 * Forma de cada fila de GET /api/beneficiarios (BeneficiarioResumenDto en la API): sin salud,
 * dirección, acudiente ni rutas de fotos. La ficha completa va en GET /api/beneficiarios/{id}
 * y en GET /api/beneficiarios/exportar. La completitud replica BeneficiarioResumenDto.CalcularCompletitud.
 */
export function resumenBeneficiario(b) {
  const dato = v => !!v && v !== 'No registra';
  // Contacto: WhatsApp del acudiente (niño) o celular propio (adulto); 'No registra' no es un número
  const contacto = b.tipo === 'adulto' ? b.celular : b.whatsapp;
  const whatsapp = dato(contacto) ? contacto : null;
  const checks = [
    !!b.fotoMenorUrl, !!b.fotoDocumentoUrl, dato(b.eps), !!whatsapp, dato(b.direccion),
    dato(b.tallaCamisa), dato(b.tallaZapatos), Number(b.pesoKg) > 0,
    ...(b.tipo === 'adulto' ? [] : [dato(b.nombreColegio), !!b.gradoEscolar]),
  ];
  return {
    id: b.id, nombreMenor: b.nombreMenor, fechaNacimiento: b.fechaNacimiento,
    tipoDocumento: b.tipoDocumento, numeroDocumento: b.numeroDocumento, genero: b.genero,
    whatsapp, tieneAlergia: b.tieneAlergia, activo: b.activo, tipo: b.tipo ?? 'niño',
    tieneFotoMenor: !!b.fotoMenorUrl, tieneFotoDocumento: !!b.fotoDocumentoUrl,
    completitud: Math.round(checks.filter(Boolean).length / checks.length * 100),
  };
}

// Un perfil incompleto con foto privada: obliga a firmar la URL con /api/archivos/firmar
export const FOTO_PRIVADA = 'privado://fotos/isabella.jpg';
export const PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export const INCOMPLETOS = [
  { id: 103, nombre: 'Isabella Castro Ríos', fotoUrl: FOTO_PRIVADA, completitud: 60, faltantes: ['Foto documento', 'WhatsApp'] },
];

/**
 * Borrador completo y válido del formulario "Nuevo beneficiario" (niño).
 * NuevoBeneficiario restaura su borrador de sessionStorage ({ form, paso } en
 * 'nuevo_beneficiario_draft_nino' / '_adulto'), así las pruebas llegan a un paso concreto
 * sin escribir los 25 campos.
 */
export const BORRADOR_VALIDO = {
  tipo: 'niño',
  primerNombre: 'Mariana', segundoNombre: '', primerApellido: 'López', segundoApellido: 'Díaz',
  fechaNacimiento: '2016-03-15', tipoDocumento: 'TI', numeroDocumento: '1107999888',
  genero: 'Femenino',
  paisNacimiento: 'Colombia', departamentoNacimiento: 'Valle del Cauca', ciudadNacimiento: 'Yumbo',
  barrio: 'Panorama', direccion: 'Calle 5 # 10-20', numPersonasVive: '4', numHermanos: '2',
  tallaCamisa: '10', tallaPantalon: '12', tallaZapatos: '32', pesoKg: '28', tallaCm: '130',
  eps: 'Nueva EPS', tieneAlergia: 'no', descripcionAlergia: '', observacionesSalud: '',
  tieneDiscapacidad: false, descripcionDiscapacidad: '',
  nombreColegio: 'IE Panorama', gradoEscolar: '4°',
  nombreAcudiente: 'Ana Gómez', parentesco: 'Madre', whatsapp: '3001234567', viveConNino: 'si',
  celular: '',
  autorizacion: true,
  fotoMenorUrl: null, fotoDocumentoUrl: null, fotoDocumentoReversoUrl: null,
};

/** Borrador completo y válido de un adulto (sin acudiente; con celular propio). */
export const BORRADOR_ADULTO_VALIDO = {
  ...BORRADOR_VALIDO,
  tipo: 'adulto',
  primerNombre: 'Carlos', primerApellido: 'Gómez', segundoApellido: '',
  fechaNacimiento: '1985-08-20', tipoDocumento: 'CC', numeroDocumento: '16123456',
  genero: 'Masculino', numHermanos: '1', tallaCamisa: 'L', tallaPantalon: '32', tallaZapatos: '41',
  pesoKg: '70', tallaCm: '172', nombreColegio: '', gradoEscolar: 'Bachillerato completo',
  nombreAcudiente: '', parentesco: '', whatsapp: '', viveConNino: '',
  celular: '3109876543',
};

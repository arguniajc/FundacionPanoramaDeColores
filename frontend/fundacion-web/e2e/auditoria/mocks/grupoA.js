// Mocks de la API para la auditoría de diseño responsivo — grupo A:
// Beneficiarios (niños y adultos), Inscripciones, Proyectos, Sedes, Documentos y
// Log de descargas.
//
// Los datos son deliberadamente largos (nombres compuestos, direcciones, correos,
// nombres de programa) para que los desbordes de texto se vean en pantallas pequeñas.
// Ninguna lista viene vacía. Formas de respuesta tomadas de src/ (apiClient NO
// desenvuelve: lo que aquí es `json` es lo que el código lee como `data`).
//
// Uso:
//   import { registrar, RUTAS_A, DIALOGOS_A } from './mocks/grupoA.js';
//   registrar(api);
//   for (const r of RUTAS_A) await page.goto(r.hash) …
//   for (const d of DIALOGOS_A) { await page.goto(d.hash); await d.abrir(page); }
//   (cada `abrir` también navega a `hash` si la página aún no está ahí)
import { BORRADOR_VALIDO, PNG_1X1, resumenBeneficiario } from '../../support/datos.js';

const FECHA = (d, h = '10:30') => `2026-${d}T${h}:00.000Z`;

// ─── Beneficiarios ───────────────────────────────────────────────────────────

const BASE_NINO = {
  tipo: 'niño',
  tipoDocumento: 'TI',
  activo: true,
  motivoBaja: null,
  paisNacimiento: 'Colombia',
  departamentoNacimiento: 'Valle del Cauca',
  ciudadNacimiento: 'Santiago de Cali',
  barrio: 'Urbanización Panorama de los Colores Etapa III',
  direccion: 'Carrera 100 # 16-321 Torre 4 Apartamento 1203, Conjunto Residencial Los Almendros del Valle',
  numPersonasVive: 6,
  numHermanos: 3,
  tallaCamisa: '12',
  tallaPantalon: '14',
  tallaZapatos: '34',
  pesoKg: 32.5,
  tallaCm: 138,
  eps: 'Entidad Promotora de Salud Sanitas S.A.S. — Régimen Contributivo',
  tieneAlergia: 'no',
  descripcionAlergia: '',
  observacionesSalud: '',
  tieneDiscapacidad: false,
  descripcionDiscapacidad: '',
  nombreColegio: 'Institución Educativa Técnica Industrial Pedro Antonio Molina Sede Central',
  gradoEscolar: '5°',
  nombreAcudiente: 'María Fernanda Rodríguez Valencia de la Torre',
  parentesco: 'Madre',
  whatsapp: '3104567890',
  viveConNino: true,
  autorizacion: true,
  fotoMenorUrl: PNG_1X1,
  fotoDocumentoUrl: PNG_1X1,
  fotoDocumentoReversoUrl: null,
  createdAt: FECHA('02-14'),
};

export const NINOS = [
  {
    ...BASE_NINO, id: 2001,
    primerNombre: 'María', segundoNombre: 'Alejandra', primerApellido: 'Rodríguez', segundoApellido: 'Valencia de la Torre',
    nombreMenor: 'María Alejandra Rodríguez Valencia de la Torre',
    numeroDocumento: '1107123456789', fechaNacimiento: '2015-04-12', genero: 'Femenino',
    tieneAlergia: 'si',
    descripcionAlergia: 'Alergia severa a la proteína de leche de vaca, al maní y a los mariscos; requiere epinefrina autoinyectable',
    observacionesSalud: 'Asma leve controlada con inhalador de rescate. Control con neumopediatría cada seis meses en el Hospital Universitario del Valle.',
    fotoMenorUrl: 'privado://fotos/maria-alejandra.jpg',
  },
  {
    ...BASE_NINO, id: 2002,
    primerNombre: 'Juan', segundoNombre: 'Sebastián', primerApellido: 'Castañeda', segundoApellido: 'Mosquera',
    nombreMenor: 'Juan Sebastián Castañeda Mosquera',
    numeroDocumento: '1107654321', fechaNacimiento: '2013-09-30', genero: 'Masculino',
    nombreAcudiente: 'Luz Dary Mosquera Hurtado', parentesco: 'Abuela', whatsapp: '3209876543',
    fotoDocumentoUrl: null,
    tieneDiscapacidad: true,
    descripcionDiscapacidad: 'Discapacidad auditiva moderada bilateral; usa audífonos y requiere ubicarse en las primeras filas',
  },
  {
    ...BASE_NINO, id: 2003, tipoDocumento: 'RC',
    primerNombre: 'Isabella', segundoNombre: 'Sofía', primerApellido: 'Martínez', segundoApellido: 'Ospina',
    nombreMenor: 'Isabella Sofía Martínez Ospina',
    numeroDocumento: '1107000111222', fechaNacimiento: '2020-01-05', genero: 'Femenino',
    whatsapp: null, fotoMenorUrl: null, fotoDocumentoUrl: null,
    nombreColegio: 'Centro de Desarrollo Infantil Semillitas de Esperanza', gradoEscolar: 'Transición',
    paisNacimiento: 'Venezuela', departamentoNacimiento: 'Zulia', ciudadNacimiento: 'Maracaibo',
  },
  {
    ...BASE_NINO, id: 2004,
    primerNombre: 'Santiago', segundoNombre: 'Andrés', primerApellido: 'Mina', segundoApellido: 'Carabalí',
    nombreMenor: 'Santiago Andrés Mina Carabalí',
    numeroDocumento: '1006789012', fechaNacimiento: '2011-07-22', genero: 'Masculino',
    nombreAcudiente: 'José Ricardo Mina Angulo', parentesco: 'Padre', whatsapp: '3156667788',
    tallaCamisa: '16', tallaPantalon: '30', tallaZapatos: '39', pesoKg: 48, tallaCm: 158,
    gradoEscolar: '9°',
  },
  {
    ...BASE_NINO, id: 2005, activo: false,
    motivoBaja: 'Cambio de domicilio de la familia al municipio de Buenaventura por oferta laboral del acudiente',
    primerNombre: 'Valentina', segundoNombre: '', primerApellido: 'Gómez', segundoApellido: 'Restrepo',
    nombreMenor: 'Valentina Gómez Restrepo',
    numeroDocumento: '1107333444', fechaNacimiento: '2014-11-03', genero: 'Femenino',
    whatsapp: '3001112233', fotoMenorUrl: null,
  },
];

const BASE_ADULTO = {
  ...BASE_NINO,
  tipo: 'adulto',
  tipoDocumento: 'CC',
  nombreColegio: '',
  gradoEscolar: '',
  nombreAcudiente: '',
  parentesco: '',
  viveConNino: null,
  tallaCamisa: 'L',
  tallaPantalon: '34',
  tallaZapatos: '41',
  pesoKg: 72,
  tallaCm: 170,
};

export const ADULTOS = [
  {
    ...BASE_ADULTO, id: 3001,
    primerNombre: 'María', segundoNombre: 'Fernanda', primerApellido: 'Rodríguez', segundoApellido: 'Valencia de la Torre',
    nombreMenor: 'María Fernanda Rodríguez Valencia de la Torre',
    numeroDocumento: '31987654321', fechaNacimiento: '1984-06-18', genero: 'Femenino', whatsapp: '3104567890',
    fotoMenorUrl: 'privado://fotos/maria-fernanda.jpg',
  },
  {
    ...BASE_ADULTO, id: 3002,
    primerNombre: 'José', segundoNombre: 'Ricardo', primerApellido: 'Mina', segundoApellido: 'Angulo',
    nombreMenor: 'José Ricardo Mina Angulo',
    numeroDocumento: '16789012', fechaNacimiento: '1979-02-02', genero: 'Masculino', whatsapp: '3156667788',
    tieneAlergia: 'si', descripcionAlergia: 'Penicilina y derivados betalactámicos',
  },
  {
    ...BASE_ADULTO, id: 3003, tipoDocumento: 'PPT',
    primerNombre: 'Yuleisy', segundoNombre: 'Carolina', primerApellido: 'Hernández', segundoApellido: 'Paredes',
    nombreMenor: 'Yuleisy Carolina Hernández Paredes',
    numeroDocumento: '5987321456001', fechaNacimiento: '1996-10-09', genero: 'Femenino', whatsapp: null,
    paisNacimiento: 'Venezuela', departamentoNacimiento: 'Carabobo', ciudadNacimiento: 'Valencia',
    fotoMenorUrl: null, fotoDocumentoUrl: null,
  },
  {
    ...BASE_ADULTO, id: 3004,
    primerNombre: 'Luz', segundoNombre: 'Dary', primerApellido: 'Mosquera', segundoApellido: 'Hurtado',
    nombreMenor: 'Luz Dary Mosquera Hurtado',
    numeroDocumento: '29111222', fechaNacimiento: '1958-12-25', genero: 'Femenino', whatsapp: '3209876543',
  },
  {
    ...BASE_ADULTO, id: 3005, activo: false,
    motivoBaja: 'Solicitud voluntaria del beneficiario por cambio de horario laboral',
    primerNombre: 'Carlos', segundoNombre: 'Eduardo', primerApellido: 'Bermúdez', segundoApellido: 'Saavedra',
    nombreMenor: 'Carlos Eduardo Bermúdez Saavedra',
    numeroDocumento: '94555666', fechaNacimiento: '1990-03-14', genero: 'Masculino', whatsapp: '3017778899',
  },
];

const TODOS = [...NINOS, ...ADULTOS];

const STATS = {
  niño:   { activos: 58, baja: 4, total: 62 },
  adulto: { activos: 21, baja: 3, total: 24 },
  todos:  { activos: 79, baja: 7, total: 86 },
};

function statsDetalle(tipo) {
  const s = STATS[tipo] ?? STATS.todos;
  return {
    ...s,
    conAlergia: 9, sinDocumento: 3, sinEps: 5, sinWhatsapp: 11, sinDireccion: 2, sinTallas: 14, sinFoto: 17,
    porEdad: tipo === 'adulto'
      ? { '18 a 25 años': 4, '26 a 40 años': 9, '41 a 59 años': 8, '60 años o más': 3 }
      : { 'Primera infancia (0-5)': 12, 'Infancia (6-11)': 29, 'Adolescencia (12-17)': 21 },
    porMes: { 'Agosto 2026': 6, 'Septiembre 2026': 9, 'Octubre 2026': 14, 'Noviembre 2026': 3 },
    topCamisa:   [{ talla: '12', cantidad: 15 }, { talla: '10', cantidad: 11 }, { talla: '14', cantidad: 8 }],
    topZapatos:  [{ talla: '34', cantidad: 13 }, { talla: '32', cantidad: 9 }, { talla: '36', cantidad: 6 }],
    topPantalon: [{ talla: '14', cantidad: 12 }, { talla: '12', cantidad: 10 }, { talla: '16', cantidad: 7 }],
  };
}

const HISTORIAL = [
  { id: 1, accion: 'creado',     fecha: FECHA('02-14', '14:05'), usuarioEmail: 'coordinacion.programas.sociales@fundacionpanorama.org', detalle: 'Inscripción inicial desde el formulario del panel administrativo' },
  { id: 2, accion: 'editado',    fecha: FECHA('04-03', '09:12'), usuarioEmail: 'trabajo.social.sede.norte@fundacionpanorama.org', detalle: 'Actualizó: dirección, EPS, talla de camisa, talla de zapatos, observaciones de salud y nombre del colegio' },
  { id: 3, accion: 'baja',       fecha: FECHA('06-20', '16:40'), usuarioEmail: 'direccion.general@fundacionpanorama.org', detalle: 'Motivo: cambio temporal de domicilio por situación familiar' },
  { id: 4, accion: 'reactivado', fecha: FECHA('08-01', '08:00'), usuarioEmail: 'coordinacion.programas.sociales@fundacionpanorama.org', detalle: 'Regresó al barrio y retomó las actividades del programa' },
  { id: 5, accion: 'editado',    fecha: FECHA('10-28', '11:22'), usuarioEmail: 'voluntariado.registro@fundacionpanorama.org', detalle: 'Cargó foto del documento de identidad (anverso y reverso)' },
];

const INCOMPLETOS = tipo => (tipo === 'adulto' ? ADULTOS : NINOS).slice(0, 4).map((b, i) => ({
  id: b.id,
  nombre: b.nombreMenor,
  fotoUrl: b.fotoMenorUrl,
  completitud: [40, 60, 70, 90][i],
  faltantes: [
    ['Foto del menor', 'Foto documento', 'WhatsApp', 'Dirección', 'Talla camisa', 'Colegio'],
    ['Foto documento', 'WhatsApp', 'Talla zapatos', 'Peso'],
    ['EPS', 'Grado escolar', 'Dirección'],
    ['Foto del menor'],
  ][i],
}));

// ─── Sedes y programas ───────────────────────────────────────────────────────

const REP_FUNDACION = {
  repAutorizado: true,
  repNombre: 'Ana Lucía Restrepo Valderrama de Cifuentes',
  repDocumento: 'CC 31.456.789',
  repCargo: 'Representante Legal y Directora Ejecutiva',
  repFirma: PNG_1X1,
  repAutorizacionFecha: FECHA('01-20'),
};

const SIN_TERCERO = {
  tieneTercero: false, nombreTercero: '',
  terceroRepNombre: '', terceroRepTipoDoc: 'CC', terceroRepDocumento: '', terceroRepCargo: '', terceroRepFirma: '',
};

export const PROGRAMAS = [
  {
    id: 11, sedeId: 1, activo: true, cupoMaximo: 120, inscritosActivos: 97, ...REP_FUNDACION,
    nombre: 'Programa de Fortalecimiento Psicosocial y Nutricional para la Primera Infancia',
    descripcion: 'Acompañamiento integral a niños y niñas de 0 a 5 años y sus familias: valoración nutricional mensual, complementación alimentaria, talleres de crianza amorosa y seguimiento psicosocial en el hogar.',
    tieneTercero: true,
    nombreTercero: 'Corporación para el Desarrollo Comunitario y la Paz del Suroccidente Colombiano',
    terceroRepNombre: 'Hernán Darío Quintero Salazar',
    terceroRepTipoDoc: 'CC', terceroRepDocumento: '94.123.456',
    terceroRepCargo: 'Director de Proyectos Sociales y Alianzas Interinstitucionales',
    terceroRepFirma: PNG_1X1,
  },
  {
    id: 12, sedeId: 1, activo: true, cupoMaximo: 80, inscritosActivos: 34, ...SIN_TERCERO,
    repAutorizado: false, repNombre: null, repDocumento: null, repCargo: null, repFirma: null, repAutorizacionFecha: null,
    nombre: 'Escuela de Artes, Música y Expresión Corporal "Colores que Transforman"',
    descripcion: 'Formación artística extracurricular en música, danza folclórica del Pacífico, teatro y artes plásticas para niños, niñas y adolescentes de 6 a 17 años.',
  },
  {
    id: 21, sedeId: 2, activo: true, cupoMaximo: 45, inscritosActivos: 45, ...REP_FUNDACION, ...SIN_TERCERO,
    nombre: 'Refuerzo Escolar y Acompañamiento en Lectoescritura y Pensamiento Lógico-Matemático',
    descripcion: 'Tutorías en jornada contraria para estudiantes de básica primaria con dificultades de aprendizaje.',
  },
  {
    id: 22, sedeId: 2, activo: false, cupoMaximo: null, inscritosActivos: 0, ...SIN_TERCERO,
    repAutorizado: false, repNombre: null, repDocumento: null, repCargo: null, repFirma: null, repAutorizacionFecha: null,
    nombre: 'Emprendimiento Productivo y Educación Financiera para Madres Cabeza de Hogar',
    descripcion: null,
  },
  {
    id: 31, sedeId: 3, activo: true, cupoMaximo: 200, inscritosActivos: 58, ...REP_FUNDACION, ...SIN_TERCERO,
    nombre: 'Deporte para la Convivencia y la Prevención del Consumo de Sustancias Psicoactivas',
    descripcion: 'Escuelas deportivas de fútbol, baloncesto y atletismo con enfoque en habilidades para la vida.',
  },
];

const SEDE_EXTRA = { telefono: '602 485 9632 ext. 104', email: 'coordinacion.programas.sociales@fundacionpanorama.org' };

export const SEDES = [
  { id: 1, activo: true, ...SEDE_EXTRA, nombre: 'Sede Principal Barrio Panorama — Casa de los Colores', ciudad: 'Santiago de Cali', direccion: 'Carrera 100 # 16-321 Bodega 7, Zona Industrial de Arroyohondo, frente al parque principal' },
  { id: 2, activo: true, ...SEDE_EXTRA, nombre: 'Sede Comunitaria Ladera — Centro de Desarrollo Integral Siloé', ciudad: 'Santiago de Cali', direccion: 'Calle 5 Oeste # 52-110 Barrio Lleras Camargo, Comuna 20' },
  { id: 3, activo: false, ...SEDE_EXTRA, nombre: 'Sede Rural Corregimiento La Buitrera de Palmira', ciudad: 'Palmira', direccion: 'Vereda La Buitrera, kilómetro 12 vía Palmira – Tenjo, finca El Mirador de los Andes' },
  { id: 4, activo: true, ...SEDE_EXTRA, nombre: 'Sede Yumbo Norte', ciudad: 'Yumbo', direccion: 'Calle 10 # 4-56' },
].map(s => ({ ...s, programas: PROGRAMAS.filter(p => p.sedeId === s.id) }));

const conSede = p => ({ ...p, nombreSede: SEDES.find(s => s.id === p.sedeId)?.nombre });

const opcionesLargas = [
  'Familia nuclear (padre, madre e hijos que viven juntos)',
  'Familia monoparental con jefatura femenina',
  'Familia extensa (abuelos, tíos u otros parientes en el hogar)',
  'Hogar sustituto del ICBF',
];

/** Campos del formulario dinámico de un programa (mismos para todos, con ids propios). */
function camposDe(programaId) {
  const c = (i, campo) => ({ id: programaId * 100 + i, programaId, obligatorio: false, opciones: null, columnas: 6, orden: i, ...campo });
  return [
    c(1,  { seccion: 'Información general de la vinculación al programa', etiqueta: 'Fecha de ingreso efectivo al programa', tipo: 'date', obligatorio: true }),
    c(2,  { seccion: 'Información general de la vinculación al programa', etiqueta: 'Edad del beneficiario al momento de la inscripción', tipo: 'edad' }),
    c(3,  { seccion: 'Información general de la vinculación al programa', etiqueta: 'Tipología familiar con la que convive actualmente el beneficiario', tipo: 'select', obligatorio: true, opciones: opcionesLargas, columnas: 12 }),
    c(4,  { seccion: 'Información general de la vinculación al programa', etiqueta: '¿Recibe actualmente algún subsidio o apoyo de otra entidad pública o privada?', tipo: 'boolean' }),
    c(5,  { seccion: 'Información general de la vinculación al programa', etiqueta: 'Periodo de participación autorizado', tipo: 'daterange' }),
    c(6,  { seccion: 'Contacto y documentos', etiqueta: 'Documento de identidad del beneficiario', tipo: 'documento_id', obligatorio: true }),
    c(7,  { seccion: 'Contacto y documentos', etiqueta: 'Correo electrónico de contacto del acudiente', tipo: 'email' }),
    c(8,  { seccion: 'Contacto y documentos', etiqueta: 'Teléfono celular alterno', tipo: 'telefono' }),
    c(9,  { seccion: 'Contacto y documentos', etiqueta: 'Certificado de afiliación a la EPS (PDF, máximo 5 MB)', tipo: 'document' }),
    c(10, { seccion: 'Escolaridad', etiqueta: 'Grado escolar y jornada actual', tipo: 'grado_escolar' }),
    c(11, { seccion: 'Escolaridad', etiqueta: 'Observaciones del docente o del orientador escolar sobre el proceso de aprendizaje', tipo: 'text', columnas: 12 }),
    c(12, { seccion: 'Responsables del beneficiario', etiqueta: 'Información del padre', tipo: 'datos_padre', columnas: 12 }),
    c(13, { seccion: 'Responsables del beneficiario', etiqueta: 'Información de la madre', tipo: 'datos_madre', columnas: 12 }),
    c(14, { seccion: 'Responsables del beneficiario', etiqueta: 'Información del tutor legal (abuelo, tío, hermano…)', tipo: 'datos_tutor', columnas: 12 }),
  ];
}

function datosInscripcion(programaId) {
  const id = i => String(programaId * 100 + i);
  return JSON.stringify({
    [id(1)]: '2026-02-16',
    [id(2)]: '11',
    [id(3)]: opcionesLargas[2],
    [id(4)]: 'true',
    [id(5)]: JSON.stringify({ desde: '2026-02-16', hasta: '2026-11-30' }),
    [id(6)]: JSON.stringify({ tipo: 'TI', numero: '1107123456789' }),
    [id(7)]: 'coordinacion.programas.sociales@fundacionpanorama.org',
    [id(8)]: '3104567890',
    [id(9)]: 'privado://inscripciones/certificado-eps.pdf',
    [id(10)]: JSON.stringify({ grado: 'Grado 5°', jornada: 'Mañana' }),
    [id(11)]: 'Presenta avances notables en comprensión lectora; se recomienda reforzar operaciones con fracciones y resolución de problemas en contexto.',
    [id(13)]: JSON.stringify({
      nombres: 'María Fernanda', apellidos: 'Rodríguez Valencia de la Torre', fechaNac: '1984-06-18',
      pais: 'Colombia', departamento: 'Valle del Cauca', ciudad: 'Santiago de Cali',
      tipoDoc: 'CC', numDoc: '31987654321', celular: '3104567890',
      direccion: 'Carrera 100 # 16-321 Torre 4 Apartamento 1203', barrio: 'Panorama',
      eps: 'Sanitas', escolaridad: 'Técnico', ocupacion: 'Auxiliar de enfermería',
      empresa: 'Clínica de Occidente S.A. — Servicio de Urgencias', autoidentificacion: 'Ninguna',
    }),
    __firma_padre__: PNG_1X1,
    __firma_meta__: JSON.stringify({ quien: 'madre', nombre: 'María Fernanda Rodríguez Valencia de la Torre', documento: '31987654321' }),
  });
}

// ─── Inscripciones ───────────────────────────────────────────────────────────

const insc = (id, benef, prog, estado, dia) => {
  const p = conSede(PROGRAMAS.find(x => x.id === prog));
  return {
    id, beneficiarioId: benef.id, programaId: p.id,
    nombreBeneficiario: benef.nombreMenor,
    documentoBeneficiario: `${benef.tipoDocumento} ${benef.numeroDocumento}`,
    nombrePrograma: p.nombre, nombreSede: p.nombreSede,
    estado, fechaInscripcion: FECHA(dia),
    datos: datosInscripcion(p.id),
    observaciones: 'Inscripción remitida por la Comisaría de Familia de la Comuna 20; prioridad alta por riesgo nutricional.',
  };
};

export const INSCRIPCIONES = [
  insc(5001, NINOS[0], 11, 'activa', '02-16'),
  insc(5002, NINOS[1], 12, 'suspendida', '03-02'),
  insc(5003, NINOS[2], 21, 'completada', '04-11'),
  insc(5004, NINOS[3], 31, 'activa', '05-27'),
  insc(5005, ADULTOS[0], 22, 'baja', '07-09'),
];

// ─── Documentos y descargas ──────────────────────────────────────────────────

const DOCUMENTOS = [
  { id: 701, categoria: 'Actas', titulo: 'Acta de Asamblea General Ordinaria de Asociados No. 47 — Aprobación de estados financieros 2025', descripcion: 'Acta firmada por la presidenta y la secretaria de la asamblea, con el listado de asistentes y la aprobación de la reforma estatutaria del artículo 23.' },
  { id: 702, categoria: 'Políticas', titulo: 'Política Institucional de Protección Integral de Niños, Niñas y Adolescentes', descripcion: 'Versión 3.2 aprobada por la Junta Directiva.' },
  { id: 703, categoria: 'Formularios', titulo: 'Formato_Autorizacion_Tratamiento_Datos_Personales_Ley_1581_de_2012_v4', descripcion: null },
  { id: 704, categoria: 'Informes', titulo: 'Informe de gestión social tercer trimestre 2026 — Programas de primera infancia y juventud', descripcion: 'Indicadores de cobertura, permanencia, estado nutricional y satisfacción de las familias participantes en las cuatro sedes.' },
  { id: 705, categoria: 'Certificados', titulo: 'Certificado de existencia y representación legal — Cámara de Comercio de Cali', descripcion: 'Vigente hasta diciembre de 2026.' },
].map((d, i) => ({
  ...d,
  url: 'privado://documentos/' + d.id + '.pdf',
  subidoPorEmail: i % 2 ? 'direccion.general@fundacionpanorama.org' : 'coordinacion.programas.sociales@fundacionpanorama.org',
  fechaCreacion: FECHA(`0${i + 3}-1${i}`, '15:45'),
}));

const ARCHIVOS_BENEFICIARIO = beneficiarioId => [
  'Valoracion_nutricional_y_antropometrica_febrero_2026_firmada_por_nutricionista.pdf',
  'Certificado de estudios grado quinto — Institución Educativa Pedro Antonio Molina.pdf',
  'Registro civil de nacimiento.pdf',
  'Consentimiento informado de participación en actividades deportivas y salidas pedagógicas.pdf',
].map((nombre, i) => ({
  id: beneficiarioId * 10 + i,
  beneficiarioId,
  titulo: nombre.replace(/\.pdf$/, ''),
  nombreOriginal: nombre,
  url: `privado://beneficiarios/${beneficiarioId}/${i}.pdf`,
  fechaCreacion: FECHA(`0${i + 5}-0${i + 2}`, '09:10'),
}));

const LOG_DESCARGAS = [
  { usuarioEmail: 'coordinacion.programas.sociales@fundacionpanorama.org', nombreBeneficiario: NINOS[0].nombreMenor, tipoArchivo: 'Documento de identidad (anverso)' },
  { usuarioEmail: 'trabajo.social.sede.norte@fundacionpanorama.org', nombreBeneficiario: ADULTOS[0].nombreMenor, tipoArchivo: 'Foto del beneficiario' },
  { usuarioEmail: 'direccion.general@fundacionpanorama.org', nombreBeneficiario: NINOS[1].nombreMenor, tipoArchivo: 'Formulario de inscripción PDF' },
  { usuarioEmail: 'voluntariado.registro@fundacionpanorama.org', nombreBeneficiario: NINOS[3].nombreMenor, tipoArchivo: 'Documento de identidad (reverso)' },
  { usuarioEmail: 'ana.admin@example.org', nombreBeneficiario: ADULTOS[2].nombreMenor, tipoArchivo: 'Certificado EPS' },
].map((r, i) => ({ id: 900 + i, ...r, descargadoEn: FECHA(`11-0${i + 1}`, `1${i}:2${i}`) }));

// ─── Registro de manejadores ─────────────────────────────────────────────────

function filtrarBeneficiarios(url) {
  const q      = url.searchParams;
  const tipo   = q.get('tipo');
  const estado = q.get('estado') ?? 'todos';
  const buscar = (q.get('buscar') ?? '').toLowerCase();
  let lista = tipo === 'adulto' ? ADULTOS : tipo === 'niño' ? NINOS : TODOS;
  if (estado === 'activos') lista = lista.filter(b => b.activo);
  if (estado === 'baja')    lista = lista.filter(b => !b.activo);
  if (buscar) lista = lista.filter(b => b.nombreMenor.toLowerCase().includes(buscar) || b.numeroDocumento.includes(buscar));
  return lista;
}

// Beneficiarios que perdieron el tipo de documento (GET /api/beneficiarios/sin-tipo-documento)
const SIN_TIPO_DOCUMENTO = [
  { id: 'a1b2c3d4-0000-4000-8000-000000000001', nombre: 'Valeria Alejandra Moreno Castillo de las Mercedes', numeroDocumento: 'AB12345678', tipo: 'niño',   fechaNacimiento: '2014-02-10', activo: true,  sugerencia: null },
  { id: 'a1b2c3d4-0000-4000-8000-000000000002', nombre: 'Samuel David Ortiz Quiñónez',                     numeroDocumento: null,         tipo: 'niño',   fechaNacimiento: '2021-07-01', activo: true,  sugerencia: 'Sin documento' },
  { id: 'a1b2c3d4-0000-4000-8000-000000000003', nombre: 'Isabella Gómez Arboleda',                         numeroDocumento: '1107998877', tipo: 'niño',   fechaNacimiento: '2012-11-23', activo: false, sugerencia: 'TI' },
  { id: 'a1b2c3d4-0000-4000-8000-000000000004', nombre: 'José Gregorio Hernández Pérez',                   numeroDocumento: 'V24567890',  tipo: 'adulto', fechaNacimiento: '1979-05-14', activo: true,  sugerencia: null },
  { id: 'a1b2c3d4-0000-4000-8000-000000000005', nombre: 'Luz Marina Riascos Valencia',                     numeroDocumento: '31987654',   tipo: 'adulto', fechaNacimiento: '1968-03-02', activo: true,  sugerencia: 'CC' },
];

export function registrar(api) {
  // Beneficiarios — genéricos primero, específicos después (el último registrado gana)
  api.on('GET', /^\/api\/beneficiarios\/\d+$/, ({ url }) => {
    const id = Number(url.pathname.split('/').pop());
    return { json: TODOS.find(b => b.id === id) ?? NINOS[0] };
  });
  api.on('GET', /^\/api\/beneficiarios\/\d+\/historial$/, HISTORIAL);
  api.on('POST', '/api/beneficiarios/verificar-documento', { existe: false, id: null, nombre: null });
  api.on('GET', '/api/beneficiarios', ({ url }) => {
    const lista = filtrarBeneficiarios(url);
    const sinFiltros = !url.searchParams.get('buscar') && url.searchParams.get('tipo');
    const tipo = url.searchParams.get('tipo') ?? 'todos';
    const estado = url.searchParams.get('estado') ?? 'todos';
    // Total "inflado" en las listas principales para que aparezca la paginación
    const total = sinFiltros ? (STATS[tipo]?.[estado === 'baja' ? 'baja' : estado === 'activos' ? 'activos' : 'total'] ?? lista.length) : lista.length;
    return { json: {
      data: lista.map(resumenBeneficiario), total,
      pagina: Number(url.searchParams.get('pagina') ?? 1),
      porPagina: Number(url.searchParams.get('porPagina') ?? 15),
    } };
  });
  // Exportación a Excel: ficha completa (permiso beneficiarios:exportar)
  api.on('GET', '/api/beneficiarios/exportar', ({ url }) => {
    const lista = filtrarBeneficiarios(url);
    return { json: {
      data: lista, total: lista.length,
      pagina: Number(url.searchParams.get('pagina') ?? 1),
      porPagina: Number(url.searchParams.get('porPagina') ?? 100),
    } };
  });
  api.on('GET', '/api/beneficiarios/stats', ({ url }) => ({ json: statsDetalle(url.searchParams.get('tipo') ?? 'todos') }));
  api.on('GET', '/api/beneficiarios/incompletos', ({ url }) => ({ json: INCOMPLETOS(url.searchParams.get('tipo') ?? 'niño') }));
  // Aviso "sin tipo de documento" (con filas, para auditar el aviso y su diálogo)
  api.on('GET', '/api/beneficiarios/sin-tipo-documento', ({ url }) => ({
    json: SIN_TIPO_DOCUMENTO.filter(f => f.tipo === (url.searchParams.get('tipo') ?? 'niño')),
  }));
  api.on('PATCH', /^\/api\/beneficiarios\/[^/]+\/tipo-documento$/, { actualizados: 1 });
  api.on('PATCH', '/api/beneficiarios/tipo-documento/lote', ({ body }) => ({ json: { actualizados: body?.length ?? 0 } }));

  // Archivos privados → enlace firmado (data: PNG) ; log de descargas paginado
  api.on('POST', '/api/archivos/firmar', ({ body }) => ({
    json: { urls: Object.fromEntries((body?.referencias ?? []).map(r => [r, PNG_1X1])) },
  }));
  api.on('POST', '/api/archivos/log-descarga', { ok: true });
  api.on('GET', '/api/archivos/log-descargas', ({ url }) => ({ json: {
    data: LOG_DESCARGAS, total: 47,
    pagina: Number(url.searchParams.get('pagina') ?? 1), porPagina: 20,
  } }));

  // Sedes y programas
  api.on('GET', '/api/sedes', SEDES);
  api.on('GET', /^\/api\/sedes\/\d+$/, ({ url }) => {
    const id = Number(url.pathname.split('/').pop());
    return { json: SEDES.find(s => s.id === id) ?? SEDES[0] };
  });
  api.on('GET', /^\/api\/sedes\/\d+\/programas$/, ({ url }) => {
    const sedeId = Number(url.pathname.split('/')[3]);
    return { json: PROGRAMAS.filter(p => p.sedeId === sedeId) };
  });
  api.on('GET', /^\/api\/sedes\/programas\/\d+$/, ({ url }) => {
    const id = Number(url.pathname.split('/').pop());
    return { json: conSede(PROGRAMAS.find(p => p.id === id) ?? PROGRAMAS[0]) };
  });
  api.on('GET', /^\/api\/sedes\/programas\/\d+\/campos$/, ({ url }) => ({
    json: camposDe(Number(url.pathname.split('/')[4])),
  }));

  // Inscripciones (paginado: { data, total, pagina, porPagina }; filtros programaId / estado / buscar)
  api.on('GET', '/api/inscripciones', ({ url }) => {
    const p      = url.searchParams;
    const prog   = Number(p.get('programaId')) || null;
    const benef  = Number(p.get('beneficiarioId')) || null;
    const estado = p.get('estado');
    const q      = (p.get('buscar') ?? '').toLowerCase();
    const filtradas = INSCRIPCIONES.filter(i =>
      (!prog || i.programaId === prog) && (!benef || i.beneficiarioId === benef) && (!estado || i.estado === estado) &&
      (!q || `${i.nombreBeneficiario} ${i.documentoBeneficiario ?? ''} ${i.nombrePrograma}`.toLowerCase().includes(q)));
    // Sin coincidencias se muestra todo (listado de la página), salvo al consultar por beneficiario
    const lista     = filtradas.length || benef ? filtradas : INSCRIPCIONES;
    const pagina    = Number(p.get('pagina')) || 1;
    const porPagina = Number(p.get('porPagina')) || 20;
    return { json: { data: lista.slice((pagina - 1) * porPagina, pagina * porPagina), total: lista.length, pagina, porPagina } };
  });
  api.on('GET', /^\/api\/inscripciones\/\d+$/, ({ url }) => {
    const id = Number(url.pathname.split('/').pop());
    return { json: INSCRIPCIONES.find(i => i.id === id) ?? INSCRIPCIONES[0] };
  });

  // Documentos
  api.on('GET', '/api/documentos', ({ url }) => {
    const cat = url.searchParams.get('categoria');
    const lista = cat ? DOCUMENTOS.filter(d => d.categoria === cat) : DOCUMENTOS;
    return { json: lista.length ? lista : DOCUMENTOS };
  });
  api.on('GET', /^\/api\/documentos\/beneficiario\/\d+$/, ({ url }) => ({
    json: ARCHIVOS_BENEFICIARIO(Number(url.pathname.split('/').pop())),
  }));
}

// ─── Rutas ───────────────────────────────────────────────────────────────────

// Pestañas (role 'tab', nombres exactos tal como se renderizan con estos datos):
//  - Niños:     'Activos (58)', 'Baja (4)', 'Todos (62)'
//  - Adultos:   'Activos (21)', 'Baja (3)', 'Todos (24)'
//  - Documentos: 'Institucionales', 'Por beneficiario'
// Inscripciones, Proyectos, Sedes y Log de descargas no tienen pestañas.
export const RUTAS_A = [
  { nombre: 'Beneficiarios — Niños',   hash: '#/sede/beneficiarios', tabs: ['Activos (58)', 'Baja (4)', 'Todos (62)'] },
  { nombre: 'Beneficiarios — Adultos', hash: '#/sede/adultos',       tabs: ['Activos (21)', 'Baja (3)', 'Todos (24)'] },
  { nombre: 'Inscripciones',           hash: '#/sede/inscripciones' },
  { nombre: 'Proyectos',               hash: '#/sede/proyectos' },
  { nombre: 'Sedes',                   hash: '#/sede/sedes' },
  { nombre: 'Documentos',              hash: '#/sede/documentos',    tabs: ['Institucionales', 'Por beneficiario'] },
  { nombre: 'Log de descargas',        hash: '#/sede/log-descargas' },
];

// ─── Diálogos ────────────────────────────────────────────────────────────────

// Borrador del formulario: sessionStorage, una clave por tipo, con { form, paso }
const DRAFT_KEY        = 'nuevo_beneficiario_draft_nino';
const DRAFT_KEY_ADULTO = 'nuevo_beneficiario_draft_adulto';
const PASOS_NUEVO = ['Datos personales', 'Tallas', 'Salud', 'Acudiente', 'Autorización'];

/** Navega a `hash` solo si la página no está ya ahí. */
async function irA(page, hash) {
  const actual = await page.evaluate(() => location.hash).catch(() => '');
  if (actual !== hash) await page.goto(hash);
}

const dialogo = (page, texto) => page.getByRole('dialog').filter({ hasText: texto }).first();
const boton   = (scope, name, exact = true) => scope.getByRole('button', { name, exact });

/** Espera a que la tabla de la lista tenga filas (no el spinner). */
async function esperarFilas(page) {
  await page.locator('table tbody tr').filter({ has: page.getByRole('button', { name: 'Ver detalle' }) }).first().waitFor();
}

/** Abre "Nuevo beneficiario" desde Niños; con `paso` > 0 usa el borrador válido y avanza. */
function nuevoBeneficiario(paso) {
  return async page => {
    await irA(page, '#/sede/beneficiarios');
    await page.evaluate(([k, v]) => {
      if (v) sessionStorage.setItem(k, v); else sessionStorage.removeItem(k);
    }, [DRAFT_KEY, paso > 0 ? JSON.stringify({ form: BORRADOR_VALIDO, paso: 0 }) : null]);
    await boton(page, '+ Nuevo beneficiario').click();
    const dlg = dialogo(page, 'Inscribir nuevo beneficiario');
    await dlg.waitFor();
    for (let i = 1; i <= paso; i++) {
      await boton(dlg, 'Siguiente').click();
      await dlg.locator('.MuiStepLabel-label.Mui-active', { hasText: PASOS_NUEVO[i] }).waitFor();
    }
    await page.getByRole('dialog').first().waitFor();
  };
}

/** "Nueva inscripción" hasta el paso indicado (0 Beneficiario, 1 Programa, 2 Formulario). */
function nuevaInscripcion(paso) {
  return async page => {
    await irA(page, '#/sede/inscripciones');
    await boton(page, 'Nueva inscripción').click();
    const dlg = dialogo(page, 'Nueva Inscripción');
    await dlg.waitFor();
    if (paso >= 1) {
      await dlg.getByLabel('Buscar por nombre').fill('María');
      await page.getByRole('option').first().click();
      await boton(dlg, 'Siguiente').click();
      await dlg.getByText('Selecciona el programa').waitFor();
    }
    if (paso >= 2) {
      // PROGRAMAS[0]: la primera niña ya está inscrita ("Ya inscrito"); PROGRAMAS[2] tiene el cupo lleno
      await dlg.getByText(PROGRAMAS[1].nombre).first().click();
      await boton(dlg, 'Siguiente').click();
      await dlg.getByText('Información de la madre').first().waitFor();
    }
  };
}

async function abrirVerFormulario(page) {
  await irA(page, '#/sede/inscripciones');
  await boton(page, 'Ver / Editar formulario').first().click();
  const dlg = dialogo(page, INSCRIPCIONES[0].nombrePrograma);
  await dlg.waitFor();
  await dlg.getByText('Tipología familiar', { exact: false }).first().waitFor(); // campos cargados
  return dlg;
}

async function abrirEditorCampos(page) {
  await irA(page, '#/sede/proyectos');
  await boton(page, 'Campos').first().click();
  const dlg = dialogo(page, `Campos: ${PROGRAMAS[0].nombre}`);
  await dlg.waitFor();
  await dlg.getByText('Información de la madre').first().waitFor();
  return dlg;
}

async function expandirPrimeraSede(page) {
  await irA(page, '#/sede/sedes');
  await boton(page, 'Ver programas').first().click();
  await boton(page, 'Agregar').first().waitFor();
}

async function porBeneficiario(page) {
  await irA(page, '#/sede/documentos');
  await page.getByRole('tab', { name: 'Por beneficiario' }).click();
  await page.getByLabel('Buscar beneficiario').fill('María');
  await page.getByRole('option').first().click();
  await page.getByText(ARCHIVOS_BENEFICIARIO(0)[0].nombreOriginal).waitFor();
}

function listaBeneficiarios(hash, extra) {
  return async page => {
    await irA(page, hash);
    await esperarFilas(page);
    await extra(page);
    await page.getByRole('dialog').first().waitFor();
  };
}

export const DIALOGOS_A = [
  // ── Niños ──
  { nombre: 'Niños · Nuevo beneficiario · Datos personales (vacío)', hash: '#/sede/beneficiarios', abrir: nuevoBeneficiario(0) },
  { nombre: 'Niños · Nuevo beneficiario · Tallas',                  hash: '#/sede/beneficiarios', abrir: nuevoBeneficiario(1) },
  { nombre: 'Niños · Nuevo beneficiario · Salud',                   hash: '#/sede/beneficiarios', abrir: nuevoBeneficiario(2) },
  { nombre: 'Niños · Nuevo beneficiario · Acudiente',               hash: '#/sede/beneficiarios', abrir: nuevoBeneficiario(3) },
  { nombre: 'Niños · Nuevo beneficiario · Autorización',            hash: '#/sede/beneficiarios', abrir: nuevoBeneficiario(4) },
  {
    nombre: 'Niños · Detalle', hash: '#/sede/beneficiarios',
    abrir: listaBeneficiarios('#/sede/beneficiarios', p => boton(p, 'Ver detalle').first().click()),
  },
  {
    nombre: 'Niños · Detalle con historial', hash: '#/sede/beneficiarios',
    abrir: listaBeneficiarios('#/sede/beneficiarios', async p => {
      await boton(p, 'Ver detalle').first().click();
      const dlg = p.getByRole('dialog').first();
      await boton(dlg, 'Ver historial de cambios').click();
      await dlg.getByText(HISTORIAL[1].detalle).waitFor();
    }),
  },
  {
    nombre: 'Niños · Editar', hash: '#/sede/beneficiarios',
    abrir: listaBeneficiarios('#/sede/beneficiarios', p => boton(p, 'Editar').first().click()),
  },
  {
    nombre: 'Niños · Pendientes (perfiles incompletos)', hash: '#/sede/beneficiarios',
    abrir: listaBeneficiarios('#/sede/beneficiarios', async p => {
      await boton(p, 'Perfiles con datos sin completar').click();
      await dialogo(p, 'Perfiles pendientes por completar').getByText(NINOS[0].nombreMenor).waitFor();
    }),
  },
  {
    nombre: 'Niños · Sin tipo de documento', hash: '#/sede/beneficiarios',
    abrir: listaBeneficiarios('#/sede/beneficiarios', async p => {
      await p.getByRole('alert').filter({ hasText: 'sin tipo de documento' }).getByRole('button', { name: 'Revisar' }).click();
      await dialogo(p, 'Beneficiarios sin tipo de documento').getByText(SIN_TIPO_DOCUMENTO[0].nombre).waitFor();
    }),
  },
  {
    nombre: 'Niños · Estadísticas', hash: '#/sede/beneficiarios',
    abrir: listaBeneficiarios('#/sede/beneficiarios', async p => {
      await boton(p, 'Ver estadísticas detalladas de beneficiarios').click();
      await dialogo(p, 'Estadísticas de beneficiarios').getByText('Resumen general', { exact: false }).waitFor();
    }),
  },
  {
    nombre: 'Niños · Importar xlsx', hash: '#/sede/beneficiarios',
    abrir: listaBeneficiarios('#/sede/beneficiarios', p => boton(p, 'Importar xlsx').click()),
  },
  {
    nombre: 'Niños · Dar de baja', hash: '#/sede/beneficiarios',
    abrir: listaBeneficiarios('#/sede/beneficiarios', p => boton(p, 'Dar de baja').first().click()),
  },
  {
    nombre: 'Niños · Eliminar de la BD', hash: '#/sede/beneficiarios',
    abrir: listaBeneficiarios('#/sede/beneficiarios', p => boton(p, 'Eliminar de la BD (irreversible)').first().click()),
  },

  // ── Adultos ──
  {
    nombre: 'Adultos · Nuevo adulto', hash: '#/sede/adultos',
    abrir: async page => {
      await irA(page, '#/sede/adultos');
      await page.evaluate(k => sessionStorage.removeItem(k), DRAFT_KEY_ADULTO);
      await boton(page, '+ Nuevo adulto').click();
      await page.getByRole('dialog').first().waitFor();
    },
  },
  {
    nombre: 'Adultos · Detalle', hash: '#/sede/adultos',
    abrir: listaBeneficiarios('#/sede/adultos', p => boton(p, 'Ver detalle').first().click()),
  },
  {
    nombre: 'Adultos · Editar', hash: '#/sede/adultos',
    abrir: listaBeneficiarios('#/sede/adultos', p => boton(p, 'Editar').first().click()),
  },
  {
    nombre: 'Adultos · Pendientes', hash: '#/sede/adultos',
    abrir: listaBeneficiarios('#/sede/adultos', async p => {
      await boton(p, 'Perfiles con datos sin completar').click();
      await dialogo(p, 'Perfiles pendientes por completar').getByText(ADULTOS[0].nombreMenor).waitFor();
    }),
  },
  {
    nombre: 'Adultos · Estadísticas', hash: '#/sede/adultos',
    abrir: listaBeneficiarios('#/sede/adultos', async p => {
      await boton(p, 'Ver estadísticas detalladas de adultos').click();
      await dialogo(p, 'Estadísticas de beneficiarios').getByText('Resumen general', { exact: false }).waitFor();
    }),
  },

  // ── Inscripciones ──
  { nombre: 'Inscripciones · Nueva · Beneficiario', hash: '#/sede/inscripciones', abrir: nuevaInscripcion(0) },
  { nombre: 'Inscripciones · Nueva · Programa',     hash: '#/sede/inscripciones', abrir: nuevaInscripcion(1) },
  { nombre: 'Inscripciones · Nueva · Formulario',   hash: '#/sede/inscripciones', abrir: nuevaInscripcion(2) },
  { nombre: 'Inscripciones · Ver formulario',       hash: '#/sede/inscripciones', abrir: async page => { await abrirVerFormulario(page); } },
  {
    nombre: 'Inscripciones · Ver formulario (modo edición)', hash: '#/sede/inscripciones',
    abrir: async page => {
      const dlg = await abrirVerFormulario(page);
      await boton(dlg, 'Editar').click();
      await boton(dlg, 'Guardar cambios').waitFor();
    },
  },

  // ── Proyectos ──
  {
    nombre: 'Proyectos · Nuevo proyecto', hash: '#/sede/proyectos',
    abrir: async page => {
      await irA(page, '#/sede/proyectos');
      await boton(page, 'Nuevo proyecto').click();
      await dialogo(page, 'Nuevo proyecto').waitFor();
    },
  },
  {
    nombre: 'Proyectos · Editar proyecto (con entidad ejecutora)', hash: '#/sede/proyectos',
    abrir: async page => {
      await irA(page, '#/sede/proyectos');
      await boton(page, 'Editar proyecto').first().click();
      await dialogo(page, 'Editar proyecto').waitFor();
    },
  },
  { nombre: 'Proyectos · Editor de campos', hash: '#/sede/proyectos', abrir: async page => { await abrirEditorCampos(page); } },
  {
    nombre: 'Proyectos · Editor de campos · Nuevo campo', hash: '#/sede/proyectos',
    abrir: async page => {
      const dlg = await abrirEditorCampos(page);
      await boton(dlg, 'Agregar campo').click();
      await dialogo(page, 'Nuevo campo').waitFor();
    },
  },
  {
    nombre: 'Proyectos · Editor de campos · Vista previa', hash: '#/sede/proyectos',
    abrir: async page => {
      const dlg = await abrirEditorCampos(page);
      await boton(dlg, 'Vista previa del formulario').click();
      await page.getByRole('dialog').filter({ hasText: 'Vista previa del formulario' })
        .filter({ hasNotText: 'Agregar campo' }).first().waitFor();
    },
  },

  // ── Sedes ──
  {
    nombre: 'Sedes · Nueva sede', hash: '#/sede/sedes',
    abrir: async page => {
      await irA(page, '#/sede/sedes');
      await boton(page, 'Nueva sede').click();
      await dialogo(page, 'Nueva sede').waitFor();
    },
  },
  {
    nombre: 'Sedes · Editar sede', hash: '#/sede/sedes',
    abrir: async page => {
      await irA(page, '#/sede/sedes');
      await boton(page, 'Editar sede').first().click();
      await dialogo(page, 'Editar sede').waitFor();
    },
  },
  {
    nombre: 'Sedes · Nuevo programa', hash: '#/sede/sedes',
    abrir: async page => {
      await expandirPrimeraSede(page);
      await boton(page, 'Agregar').first().click();
      await dialogo(page, 'Nuevo programa').waitFor();
    },
  },
  {
    nombre: 'Sedes · Editar programa', hash: '#/sede/sedes',
    abrir: async page => {
      await expandirPrimeraSede(page);
      await boton(page, 'Editar').first().click();
      await dialogo(page, 'Editar programa').waitFor();
    },
  },

  // ── Documentos ──
  {
    nombre: 'Documentos · Subir documentos institucionales', hash: '#/sede/documentos',
    abrir: async page => {
      await irA(page, '#/sede/documentos');
      await page.getByText(DOCUMENTOS[0].titulo).waitFor();
      await boton(page, 'Subir documentos').click();
      await page.getByRole('dialog').first().waitFor();
    },
  },
  {
    nombre: 'Documentos · Subir documento de beneficiario', hash: '#/sede/documentos',
    abrir: async page => {
      await porBeneficiario(page);
      await boton(page, 'Subir documento').click();
      await page.getByRole('dialog').first().waitFor();
    },
  },
  {
    nombre: 'Documentos · Editar documento institucional', hash: '#/sede/documentos',
    abrir: async page => {
      await irA(page, '#/sede/documentos');
      await page.getByText(DOCUMENTOS[0].titulo).waitFor();
      await page.getByRole('button', { name: `Editar ${DOCUMENTOS[0].titulo}` }).click();
      await page.getByRole('dialog').first().waitFor();
    },
  },
];

// Mocks de la auditoría responsive — grupo B:
// Actividades, Voluntarios, Donaciones/Donantes, Inventario y Contabilidad.
// Las formas de respuesta siguen lo que leen las páginas, hooks y diálogos de
// src/ (apiClient devuelve la respuesta de axios: el JSON llega tal cual en `data`).
// Los textos son largos a propósito para que aparezcan los desbordes.

// ── Utilidades de fecha ───────────────────────────────────────────────────────
const pad = n => String(n).padStart(2, '0');
/** 'AAAA-MM-DD' en hora local. */
const isoDia = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Fecha local desplazada `dias` respecto de hoy. */
const desdeHoy = dias => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + dias); return d; };
/** Día `dia` del mes/año pedido, acotado al último día del mes. */
const diaDelMes = (anio, mes, dia) => `${anio}-${pad(mes)}-${pad(Math.min(Math.max(dia, 1), new Date(anio, mes, 0).getDate()))}`;
const num = v => (v == null || v === '' ? null : Number(v));

// ── Sedes y programas ─────────────────────────────────────────────────────────
const SEDES = [
  {
    id: 'sede-001', nombre: 'Sede Principal Barrio Panorama — Yumbo', ciudad: 'Yumbo',
    departamento: 'Valle del Cauca', direccion: 'Calle 5 # 10-20, Barrio Panorama', activo: true,
    programas: [
      { id: 'prog-001', nombre: 'Refuerzo escolar y acompañamiento en lectoescritura', activo: true },
      { id: 'prog-002', nombre: 'Escuela de fútbol formativo para niñas y niños', activo: true },
    ],
  },
  {
    id: 'sede-002', nombre: 'Sede Comunitaria Ladera de Siloé — Cali', ciudad: 'Santiago de Cali',
    departamento: 'Valle del Cauca', direccion: 'Carrera 52 # 1-45, Comuna 20', activo: true,
    programas: [
      { id: 'prog-003', nombre: 'Taller de artes plásticas, pintura y expresión corporal', activo: true },
      { id: 'prog-004', nombre: 'Nutrición, complemento alimentario y seguimiento de peso y talla', activo: true },
    ],
  },
  {
    id: 'sede-003', nombre: 'Sede Rural Vereda Mulaló — Corregimiento de Yumbo', ciudad: 'Yumbo',
    departamento: 'Valle del Cauca', direccion: 'Vía Mulaló kilómetro 7, vereda El Pedregal', activo: true,
    programas: [
      { id: 'prog-005', nombre: 'Huerta escolar comunitaria y educación ambiental', activo: true },
    ],
  },
];
const PROGRAMAS = SEDES.flatMap(s => s.programas.map(p => ({ ...p, sedeId: s.id, sedeNombre: s.nombre })));

// ── Actividades ───────────────────────────────────────────────────────────────
const TITULOS_ACT = [
  'Jornada de vacunación y valoración nutricional para niños de primera infancia del barrio Panorama',
  'Taller de lectura en voz alta con padres de familia',
  'Celebración del día de la niñez con presentaciones artísticas, comparsa y almuerzo comunitario',
  'Reunión de seguimiento con acudientes y docentes',
  'Salida pedagógica al Museo de Ciencias Naturales Federico Carlos Lehmann Valencia',
  'Entrega de kits escolares y uniformes donados por la Corporación Industrial de Alimentos del Valle',
];

/** Actividades alrededor de hoy (día −1 … +3), visibles en la vista de mes y semana. */
function actividades(mes, anio) {
  const hoy = new Date();
  const enMesActual = mes === hoy.getMonth() + 1 && anio === hoy.getFullYear();
  const fecha = off => (enMesActual ? isoDia(desdeHoy(off)) : diaDelMes(anio, mes, 15 + off));
  const def = [
    { off: 0,  hi: '08:00', hf: '12:30', prog: PROGRAMAS[3], lugar: 'Salón comunal Sede Principal Barrio Panorama, segundo piso', estado: 'programada', inscritos: 48 },
    { off: 0,  hi: '14:00', hf: '16:00', prog: PROGRAMAS[0], lugar: 'Biblioteca comunitaria', estado: 'en_curso', inscritos: 22 },
    { off: 1,  hi: '09:00', hf: '17:00', prog: null,         lugar: 'Polideportivo municipal de Yumbo — cancha múltiple cubierta', estado: 'programada', inscritos: 135 },
    { off: -1, hi: '15:00', hf: '17:00', prog: PROGRAMAS[0], lugar: 'Aula 3', estado: 'realizada', inscritos: 30 },
    { off: 2,  hi: '07:30', hf: '13:00', prog: PROGRAMAS[2], lugar: 'Avenida Roosevelt # 24-80, Cali', estado: 'programada', inscritos: 40 },
    { off: 3,  hi: '10:00', hf: '12:00', prog: PROGRAMAS[4], lugar: 'Sede Rural Vereda Mulaló', estado: 'cancelada', inscritos: 0 },
  ];
  return def.map((a, i) => {
    const f = fecha(a.off);
    return {
      id: `7f3c2a10-0000-4000-8000-00000000000${i + 1}`,
      titulo: TITULOS_ACT[i],
      descripcion: 'Actividad organizada con apoyo de voluntarios y aliados. Se solicita a los acudientes llegar 15 minutos antes con el documento de identidad del menor y el carné de la EPS.',
      programaId: a.prog?.id ?? null,
      programaNombre: a.prog ? `${a.prog.sedeNombre} — ${a.prog.nombre}` : null,
      lugar: a.lugar,
      fechaInicio: `${f}T${a.hi}:00`,
      fechaFin: `${f}T${a.hf}:00`,
      estado: a.estado,
      totalInscritos: a.inscritos,
      diasAdicionales: i === 2 ? [{ id: 'dia-001', fecha: fecha(a.off + 1), horaInicio: '09:00', horaFin: '13:00' }] : [],
    };
  });
}

const HORARIOS = [
  { id: 'hor-001', programa: PROGRAMAS[0], diaSemana: 1, horaInicio: '14:00', horaFin: '16:30', lugar: 'Aula 2 — Sede Principal Barrio Panorama', activo: true },
  { id: 'hor-002', programa: PROGRAMAS[0], diaSemana: 3, horaInicio: '14:00', horaFin: '16:30', lugar: 'Aula 2 — Sede Principal Barrio Panorama', activo: true },
  { id: 'hor-003', programa: PROGRAMAS[1], diaSemana: 6, horaInicio: '07:00', horaFin: '09:30', lugar: 'Cancha sintética del polideportivo municipal de Yumbo', activo: true },
  { id: 'hor-004', programa: PROGRAMAS[2], diaSemana: 5, horaInicio: '15:00', horaFin: '17:00', lugar: 'Salón de artes', activo: true },
  { id: 'hor-005', programa: PROGRAMAS[4], diaSemana: 2, horaInicio: '08:00', horaFin: '11:00', lugar: 'Huerta de la vereda El Pedregal', activo: false },
].map(h => ({
  id: h.id, programaId: h.programa.id, programaNombre: h.programa.nombre, sedeNombre: h.programa.sedeNombre,
  diaSemana: h.diaSemana, horaInicio: h.horaInicio, horaFin: h.horaFin, lugar: h.lugar, activo: h.activo,
  fechaInicioVigencia: '2026-01-19', fechaFinVigencia: '2026-12-11',
}));

const ASISTENCIA = [
  { beneficiarioId: 101, nombreCompleto: 'Valentina Rodríguez Gómez de la Torre', asistio: true },
  { beneficiarioId: 102, nombreCompleto: 'Santiago Alejandro Pérez Mina', asistio: false },
  { beneficiarioId: 103, nombreCompleto: 'Isabella Castro Ríos', asistio: true },
  { beneficiarioId: 104, nombreCompleto: 'Juan José Hurtado Valencia Caicedo', asistio: true },
  { beneficiarioId: 105, nombreCompleto: 'María Camila Ospina Arboleda', asistio: false },
];

// ── Voluntarios ───────────────────────────────────────────────────────────────
const VOLUNTARIOS = [
  { id: 'vol-001', nombre: 'María Fernanda Castañeda Restrepo de Villegas', tipoDocumento: 'CC', documento: '1144098765', email: 'maria.fernanda.castaneda.restrepo@correo-institucional.edu.co', telefono: '3157894561', pais: 'Colombia', departamento: 'Valle del Cauca', ciudad: 'Santiago de Cali', profesion: 'Licenciada en Educación Infantil y Pedagogía Comunitaria', fechaInicio: '2026-02-03', fechaNacimiento: '1994-06-21', activo: true, totalProgramas: 3, horasSemanales: 12, notas: 'Disponible entre semana en la tarde.' },
  { id: 'vol-002', nombre: 'Juan Sebastián Ocampo Ríos', tipoDocumento: 'CC', documento: '16789012', email: 'jsocampo@example.org', telefono: '3001112233', pais: 'Colombia', departamento: 'Valle del Cauca', ciudad: 'Yumbo', profesion: 'Entrenador deportivo', fechaInicio: '2026-03-15', fechaNacimiento: '1990-01-10', activo: true, totalProgramas: 1, horasSemanales: 6, notas: '' },
  { id: 'vol-003', nombre: 'Ana Lucía Velásquez Montoya', tipoDocumento: 'CE', documento: 'E-987654321', email: 'ana.velasquez.montoya@fundacion-aliados-del-pacifico.org', telefono: '3209876543', pais: 'Venezuela', departamento: 'Valle del Cauca', ciudad: 'Jamundí', profesion: 'Nutricionista dietista', fechaInicio: '2026-05-02', fechaNacimiento: '1988-11-30', activo: true, totalProgramas: 2, horasSemanales: 8, notas: '' },
  { id: 'vol-004', nombre: 'Carlos Andrés Mosquera Palacios', tipoDocumento: 'CC', documento: '1107456789', email: 'carlos.mosquera@example.org', telefono: '3176543210', pais: 'Colombia', departamento: 'Valle del Cauca', ciudad: 'Palmira', profesion: 'Psicólogo clínico con énfasis en infancia y adolescencia', fechaInicio: '2026-07-20', fechaNacimiento: '1992-04-05', activo: false, totalProgramas: 0, horasSemanales: 0, notas: '' },
  { id: 'vol-005', nombre: 'Luisa Fernanda Zapata', tipoDocumento: 'CC', documento: '29876543', email: 'luisa.zapata@example.org', telefono: '3014567890', pais: 'Colombia', departamento: 'Valle del Cauca', ciudad: 'Yumbo', profesion: 'Artista plástica', fechaInicio: '2026-09-01', fechaNacimiento: '1985-08-14', activo: true, totalProgramas: 1, horasSemanales: 4, notas: '' },
];

const STATS_VOLUNTARIOS = { totalVoluntarios: 128, nuevosEsteMes: 12, programasCubiertos: 17, totalHorasSemanales: 1240 };

const ASIGNACIONES = [
  { id: 'asig-001', sedeId: 'sede-001', nombreSede: SEDES[0].nombre, programaId: 'prog-001', nombrePrograma: SEDES[0].programas[0].nombre, horasSemanales: 6, fechaInicio: '2026-02-03' },
  { id: 'asig-002', sedeId: 'sede-002', nombreSede: SEDES[1].nombre, programaId: 'prog-003', nombrePrograma: SEDES[1].programas[0].nombre, horasSemanales: 4, fechaInicio: '2026-04-10' },
  { id: 'asig-003', sedeId: 'sede-003', nombreSede: SEDES[2].nombre, programaId: 'prog-005', nombrePrograma: SEDES[2].programas[0].nombre, horasSemanales: 2, fechaInicio: '2026-08-22' },
  { id: 'asig-004', sedeId: 'sede-001', nombreSede: SEDES[0].nombre, programaId: null, nombrePrograma: null, horasSemanales: 0, fechaInicio: null },
];

// ── Donantes y donaciones ─────────────────────────────────────────────────────
const DONANTES = [
  { id: 'don-001', nombre: 'Corporación Industrial de Alimentos del Valle del Cauca S.A.S.', tipo: 'empresa', tipoDocumento: 'nit', documento: '900123456-7', email: 'responsabilidad.social.empresarial@corporacionalimentosvalle.com.co', telefono: '6024859632', pais: 'Colombia', departamento: 'Valle del Cauca', ciudad: 'Santiago de Cali', notas: 'Aporte mensual recurrente.', activo: true, totalDinero: 125000000, totalDonaciones: 18, totalEspecie: 6, ultimaDonacion: '2026-10-28' },
  { id: 'don-002', nombre: 'Gabriela Inés Montenegro Salazar de Holguín', tipo: 'persona', tipoDocumento: 'cc', documento: '31987654', email: 'gabriela.montenegro@example.org', telefono: '3156789012', pais: 'Colombia', departamento: 'Antioquia', ciudad: 'Medellín', notas: '', activo: true, totalDinero: 4500000, totalDonaciones: 5, totalEspecie: 0, ultimaDonacion: '2026-09-15' },
  { id: 'don-003', nombre: 'Fundación Internacional para la Niñez y la Familia Latinoamericana', tipo: 'empresa', tipoDocumento: 'nit', documento: '830765432-1', email: 'alianzas@fundacion-ninez-latam.org', telefono: '6017654321', pais: 'Estados Unidos', departamento: 'Florida', ciudad: 'Miami', notas: '', activo: true, totalDinero: 87300000, totalDonaciones: 4, totalEspecie: 1, ultimaDonacion: '2026-08-02' },
  { id: 'don-004', nombre: 'Pedro Pablo Arango', tipo: 'persona', tipoDocumento: 'cc', documento: '16234567', email: null, telefono: '3004561234', pais: 'Colombia', departamento: 'Valle del Cauca', ciudad: 'Yumbo', notas: '', activo: true, totalDinero: 0, totalDonaciones: 3, totalEspecie: 3, ultimaDonacion: '2026-06-11' },
  { id: 'don-005', nombre: 'Distribuidora Papelera y Útiles Escolares del Pacífico Ltda.', tipo: 'empresa', tipoDocumento: 'nit', documento: '805001234-9', email: 'ventas@papeleriapacifico.co', telefono: '6023334455', pais: 'Colombia', departamento: 'Valle del Cauca', ciudad: 'Buenaventura', notas: '', activo: false, totalDinero: 2350000, totalDonaciones: 2, totalEspecie: 2, ultimaDonacion: '2026-03-20' },
];

const donacion = (id, d, extra) => ({
  id, donanteId: d.id, nombreDonante: d.nombre, tipoDonante: d.tipo,
  tipoDocDonante: d.tipoDocumento, documentoDonante: d.documento, emailDonante: d.email,
  reciboEstado: 'emitido', cantidad: null, unidadMedida: null, nombreItem: null, monto: null,
  sedeId: 'sede-001', nombreSede: SEDES[0].nombre, programaId: 'prog-001', nombrePrograma: SEDES[0].programas[0].nombre,
  ...extra,
});
const DONACIONES = [
  donacion('5b8e1f2a-0001-4000-9000-000000000001', DONANTES[0], { tipo: 'dinero', monto: 12500000, fechaDonacion: '2026-10-28', reciboNumero: 'RD-2026-000187', descripcion: 'Aporte para el programa de complemento alimentario del segundo semestre de 2026, destinado a la compra de mercados y refrigerios escolares.' }),
  donacion('5b8e1f2a-0002-4000-9000-000000000002', DONANTES[2], { tipo: 'dinero', monto: 87300000, fechaDonacion: '2026-08-02', reciboNumero: 'RD-2026-000142', sedeId: 'sede-002', nombreSede: SEDES[1].nombre, programaId: 'prog-004', nombrePrograma: SEDES[1].programas[1].nombre, descripcion: 'Donación internacional en pesos colombianos.' }),
  donacion('5b8e1f2a-0003-4000-9000-000000000003', DONANTES[3], { tipo: 'especie', cantidad: 250, unidadMedida: 'unidad', nombreItem: 'Cuadernos cuadriculados de 100 hojas cosidos, tapa dura', fechaDonacion: '2026-06-11', reciboNumero: 'RD-2026-000098', descripcion: null }),
  donacion('5b8e1f2a-0004-4000-9000-000000000004', DONANTES[1], { tipo: 'dinero', monto: 1500000, fechaDonacion: '2026-09-15', reciboNumero: 'RD-2026-000163', reciboEstado: 'anulado', nombreSede: null, sedeId: null, programaId: null, nombrePrograma: null, descripcion: null }),
  donacion('5b8e1f2a-0005-4000-9000-000000000005', DONANTES[4], { tipo: 'especie', cantidad: 1200.5, unidadMedida: 'kilogramo', nombreItem: 'Arroz blanco, fríjol cargamanto y lenteja para mercados familiares', fechaDonacion: '2026-03-20', reciboNumero: null, sedeId: 'sede-003', nombreSede: SEDES[2].nombre, programaId: null, nombrePrograma: null, descripcion: null }),
];

const STATS_DONACIONES = { totalDineroMes: 12500000, totalDineroAnio: 219450000, totalDineroTotal: 1287654321, totalEspecieMes: 37 };

const CONFIGURACION = {
  nombreFundacion: 'Fundación Panorama de Colores',
  nit: '900987654-3',
  colorPrimario: '#6735A6',
  colorSidebar: '#F4E3C1',
  fontFamily: 'Inter',
  nombreRepLegal: 'Ana María Hernández Quintero de Bermúdez',
  cargoRep: 'Representante legal y directora ejecutiva',
  firmaRep: null,
};

// ── Inventario ────────────────────────────────────────────────────────────────
const enDias = d => isoDia(desdeHoy(d));
const ITEMS = [
  { id: 'item-001', codigo: 'INV-ESC-000123', nombre: 'Cuadernos cuadriculados de 100 hojas cosidos, tapa dura', categoria: 'Material escolar', tipoTenencia: 'propio', unidadMedida: 'unidad', stockActual: 1250, stockMinimo: 300, precioUnitario: 4800, descripcion: 'Donación de la Distribuidora Papelera y Útiles Escolares del Pacífico para el año lectivo 2026.' },
  { id: 'item-002', codigo: 'INV-ELE-000045', nombre: 'Computador portátil Lenovo ThinkPad E14 Gen 5 con cargador', categoria: 'Equipos electrónicos', tipoTenencia: 'comodato', comodante: 'Secretaría de Educación Municipal de Yumbo', comodatoContrato: 'Contrato de comodato N.º SEM-2026-0457', comodatoFechaInicio: '2026-01-15', comodatoFechaFin: enDias(12), unidadMedida: 'unidad', stockActual: 8, stockMinimo: 10, precioUnitario: 3250000, descripcion: 'Equipos para la sala de sistemas.' },
  { id: 'item-003', codigo: 'INV-ALI-000310', nombre: 'Arroz blanco', categoria: 'Alimentos', tipoTenencia: 'propio', unidadMedida: 'kilogramo', stockActual: 0, stockMinimo: 200, precioUnitario: 4200, descripcion: null },
  { id: 'item-004', codigo: 'INV-DEP-000077', nombre: 'Balones de fútbol número 4 laminados', categoria: 'Deportivo', tipoTenencia: 'donacion_uso', unidadMedida: 'unidad', stockActual: 35.5, stockMinimo: 20, precioUnitario: 85000, descripcion: 'Uso exclusivo de la escuela de fútbol formativo.' },
  { id: 'item-005', codigo: null, nombre: 'Mesas plegables plásticas rectangulares de 1,80 metros para eventos comunitarios', categoria: 'Muebles y enseres', tipoTenencia: 'arrendamiento', unidadMedida: 'unidad', stockActual: 24, stockMinimo: 0, precioUnitario: 12500000, descripcion: 'Arrendadas a Eventos y Logística del Valle S.A.S.' },
].map((it, i) => {
  const sede = SEDES[i % 2];
  return { comodante: null, comodatoContrato: null, comodatoFechaInicio: null, comodatoFechaFin: null, ...it, sedeId: sede.id, nombreSede: sede.nombre, sede: { id: sede.id, nombre: sede.nombre }, activo: true };
});

const TIPOS_INV = [
  { id: 1, codigo: 'ENTRADA_COMPRA',    nombre: 'Entrada por compra',                    afectaStock: '+' },
  { id: 2, codigo: 'DONACION_RECIBIDA', nombre: 'Donación recibida',                     afectaStock: '+' },
  { id: 3, codigo: 'SALIDA_ENTREGA',    nombre: 'Entrega a beneficiarios',               afectaStock: '-' },
  { id: 4, codigo: 'AJUSTE_PERDIDA',    nombre: 'Ajuste por pérdida, daño o vencimiento', afectaStock: '-' },
  { id: 5, codigo: 'TRANSFERENCIA_SALIDA',  nombre: 'Transferencia (salida)',  afectaStock: '-' },
  { id: 6, codigo: 'TRANSFERENCIA_ENTRADA', nombre: 'Transferencia (entrada)', afectaStock: '+' },
];

const MOVIMIENTOS_INV = [
  { id: 'mov-001', fechaMovimiento: '2026-10-30T09:15:00', nombreTipo: 'Donación recibida', afectaStock: '+', cantidad: 500, stockResultante: 1250, nombreDonante: 'Distribuidora Papelera y Útiles Escolares del Pacífico Ltda.', motivo: 'Donación para el inicio del año lectivo y la jornada de entrega de kits escolares', usuarioEmail: 'coordinacion.inventarios@fundacionpanorama.org' },
  { id: 'mov-002', fechaMovimiento: '2026-10-21T14:40:00', nombreTipo: 'Entrega a beneficiarios', afectaStock: '-', cantidad: 120, stockResultante: 750, nombreDonante: null, motivo: 'Entrega kits escolares', usuarioEmail: 'ana.admin@example.org' },
  { id: 'mov-003', fechaMovimiento: '2026-09-02T11:05:00', nombreTipo: 'Transferencia (salida)', afectaStock: '-', cantidad: 80, stockResultante: 870, nombreDonante: null, nombreSedeDestino: SEDES[1].nombre, motivo: null, usuarioEmail: 'ana.admin@example.org' },
  { id: 'mov-004', fechaMovimiento: '2026-07-14T08:00:00', nombreTipo: 'Entrada por compra', afectaStock: '+', cantidad: 950, stockResultante: 950, nombreDonante: null, motivo: 'Compra con recursos del convenio 2026', usuarioEmail: null },
];

const STATS_INV = { totalItems: 1284, stockBajo: 17, sinStock: 6, movimientosMes: 342 };

// ── Contabilidad ──────────────────────────────────────────────────────────────
const CUENTAS = [
  { id: 'cta-001', nombre: 'Bancolombia cuenta corriente principal — recursos de cooperación', tipo: 'cuenta_bancaria', banco: 'Bancolombia S.A.', numeroCuenta: '123-456789-01', saldoInicial: 85000000, saldoActual: 312456789, activo: true },
  { id: 'cta-002', nombre: 'Davivienda ahorros', tipo: 'cuenta_bancaria', banco: 'Banco Davivienda', numeroCuenta: '0045-0098-7654', saldoInicial: 12000000, saldoActual: 48750000, activo: true },
  { id: 'cta-003', nombre: 'Caja menor Sede Principal Barrio Panorama', tipo: 'caja_menor', banco: null, numeroCuenta: null, saldoInicial: 2000000, saldoActual: 1385400, activo: true },
  { id: 'cta-004', nombre: 'Caja menor Sede Comunitaria Ladera de Siloé', tipo: 'caja_menor', banco: null, numeroCuenta: null, saldoInicial: 1500000, saldoActual: -125000, activo: true },
  { id: 'cta-005', nombre: 'Caja general', tipo: 'caja', banco: null, numeroCuenta: null, saldoInicial: 0, saldoActual: 7600000, activo: true },
];

const CATEGORIAS = [
  { id: 1, codigoPuc: '4120', nombre: 'Donaciones de personas naturales y jurídicas', tipo: 'ingreso' },
  { id: 2, codigoPuc: '4170', nombre: 'Convenios de cooperación internacional', tipo: 'ingreso' },
  { id: 3, codigoPuc: '4210', nombre: 'Rendimientos financieros', tipo: 'ingreso' },
  { id: 4, codigoPuc: '5105', nombre: 'Gastos de personal — honorarios y salarios', tipo: 'egreso' },
  { id: 5, codigoPuc: '5135', nombre: 'Servicios públicos, internet y telefonía', tipo: 'egreso' },
  { id: 6, codigoPuc: '5195', nombre: 'Alimentación, refrigerios y complemento nutricional', tipo: 'egreso' },
];
const cat = id => CATEGORIAS.find(c => c.id === id);
const cta = id => CUENTAS.find(c => c.id === id);

/** Movimientos contables del mes pedido (fechas 'AAAA-MM-DD'). */
function movimientosContables(mes, anio) {
  const def = [
    { d: 3,  tipo: 'ingreso', concepto: 'Donación de la Corporación Industrial de Alimentos del Valle del Cauca S.A.S. para el programa de nutrición', monto: 12500000, cat: 1, cta: 'cta-001', prog: PROGRAMAS[3], tercero: 'Corporación Industrial de Alimentos del Valle del Cauca S.A.S.', doc: '900123456-7', soporte: 'RD-2026-000187', tipoSoporte: 'recibo_caja' },
    { d: 5,  tipo: 'egreso',  concepto: 'Compra de mercados', monto: 4875300, cat: 6, cta: 'cta-001', prog: PROGRAMAS[3], tercero: 'Supermercados La Gran Colombia S.A.', doc: '890300123-4', soporte: 'FE-998877', tipoSoporte: 'factura', rte: 121883, tarifa: 2.5, conceptoRte: 'Compras generales' },
    { d: 6,  tipo: 'egreso',  concepto: 'Honorarios profesionales de psicología clínica para el acompañamiento psicosocial de familias — octubre', monto: 3200000, cat: 4, cta: 'cta-002', prog: null, tercero: 'Carlos Andrés Mosquera Palacios', doc: '1107456789', soporte: 'CC-2026-045', tipoSoporte: 'cuenta_cobro', rte: 320000, tarifa: 10, conceptoRte: 'Honorarios' },
    { d: 7,  tipo: 'egreso',  concepto: 'Refrigerios taller de lectura', monto: 185000, cat: 6, cta: 'cta-003', prog: PROGRAMAS[0], tercero: 'Panadería El Trigal', doc: null, soporte: null, tipoSoporte: 'documento_soporte', anulado: true },
    { d: 9,  tipo: 'ingreso', concepto: 'Rendimientos financieros', monto: 845320, cat: 3, cta: 'cta-002', prog: null, tercero: null, doc: null, soporte: 'EXT-11', tipoSoporte: 'extracto' },
  ];
  return def.map((m, i) => ({
    id: `mc-${anio}${pad(mes)}-${i + 1}`,
    consecutivo: 1200 + i,
    fecha: diaDelMes(anio, mes, m.d),
    tipo: m.tipo,
    concepto: m.concepto,
    descripcion: 'Registro contable con soporte digitalizado y aprobado por la dirección administrativa.',
    monto: m.monto,
    cuentaId: m.cta, cuentaNombre: cta(m.cta).nombre,
    categoriaId: m.cat, categoriaNombre: cat(m.cat).nombre, codigoPuc: cat(m.cat).codigoPuc,
    programaId: m.prog?.id ?? null, programaNombre: m.prog?.nombre ?? null,
    terceroNombre: m.tercero, terceroDocumento: m.doc,
    numeroSoporte: m.soporte, tipoSoporte: m.tipoSoporte,
    tarifaRetencion: m.tarifa ?? null, retencionPracticada: m.rte ?? null, conceptoRetencion: m.conceptoRte ?? null,
    anulado: !!m.anulado,
  }));
}

const PRESUPUESTO = [
  { id: 'pre-001', categoriaId: 6, programaId: 'prog-004', montoPresupuestado: 120000000, ejecutado: 134500000 },
  { id: 'pre-002', categoriaId: 4, programaId: null,       montoPresupuestado: 250000000, ejecutado: 231000000 },
  { id: 'pre-003', categoriaId: 5, programaId: null,       montoPresupuestado: 18000000,  ejecutado: 9450000 },
  { id: 'pre-004', categoriaId: 6, programaId: 'prog-001', montoPresupuestado: 35000000,  ejecutado: 12750000 },
  { id: 'pre-005', categoriaId: 1, programaId: null,       montoPresupuestado: 500000000, ejecutado: 219450000 },
].map(p => ({
  ...p, codigoPuc: cat(p.categoriaId).codigoPuc, categoriaNombre: cat(p.categoriaId).nombre,
  programaNombre: PROGRAMAS.find(x => x.id === p.programaId)?.nombre ?? null,
  disponible: p.montoPresupuestado - p.ejecutado,
}));

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function resumenAnual(anio) {
  const meses = MESES.map((label, i) => {
    const ingresos = i < 10 ? 18500000 + i * 2350000 : 0;
    const egresos  = i < 10 ? 15750000 + i * 2875000 : 0;
    return { mes: i + 1, label, ingresos, egresos, balance: ingresos - egresos };
  });
  const totalIngresos = meses.reduce((s, m) => s + m.ingresos, 0);
  const totalEgresos  = meses.reduce((s, m) => s + m.egresos, 0);
  return { anio, meses, totalIngresos, totalEgresos, balance: totalIngresos - totalEgresos };
}

function reporte(mes, anio) {
  const movimientos = movimientosContables(mes, anio).filter(m => !m.anulado);
  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
  const totalEgresos  = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);
  return {
    periodo: `${MESES[mes - 1]} ${anio}`, mes, anio,
    totalIngresos, totalEgresos, balance: totalIngresos - totalEgresos,
    porCuenta: CATEGORIAS.slice(0, 5).map((c, i) => ({ codigoPuc: c.codigoPuc, cuenta: c.nombre, tipo: c.tipo, total: 12500000 - i * 1750000 })),
    porPrograma: [
      { programa: PROGRAMAS[3].nombre, ingresos: 12500000, egresos: 4875300, balance: 7624700 },
      { programa: PROGRAMAS[0].nombre, ingresos: 0, egresos: 185000, balance: -185000 },
      { programa: '(Sin programa — gastos administrativos generales)', ingresos: 845320, egresos: 3200000, balance: -2354680 },
      { programa: PROGRAMAS[1].nombre, ingresos: 2000000, egresos: 950000, balance: 1050000 },
    ],
    movimientos,
  };
}

function libroCajaMenor(cuentaId, mes, anio) {
  const filas = [
    { d: 1,  tipo: 'ingreso', concepto: 'Reposición de caja menor desde Bancolombia cuenta corriente principal', cat: 1, ingreso: 2000000, egreso: 0, tercero: null, soporte: 'REP-2026-011' },
    { d: 4,  tipo: 'egreso',  concepto: 'Compra de papelería, marcadores, cartulinas y pegante para el taller de artes plásticas', cat: 6, ingreso: 0, egreso: 254600, tercero: 'Papelería y Miscelánea El Estudiante', soporte: 'FV-4521' },
    { d: 6,  tipo: 'egreso',  concepto: 'Transporte de voluntarios', cat: 4, ingreso: 0, egreso: 120000, tercero: 'Cooperativa de Transportadores de Yumbo', soporte: 'DS-0098' },
    { d: 8,  tipo: 'egreso',  concepto: 'Refrigerios reunión de acudientes', cat: 6, ingreso: 0, egreso: 240000, tercero: 'Panadería El Trigal', soporte: null },
  ];
  let saldo = 0;
  return filas.map((f, i) => {
    saldo += f.ingreso - f.egreso;
    return {
      id: `lcm-${cuentaId}-${i + 1}`, fecha: diaDelMes(anio, mes || 11, f.d), tipo: f.tipo, concepto: f.concepto,
      categoriaNombre: cat(f.cat).nombre, codigoPuc: cat(f.cat).codigoPuc,
      programaNombre: i === 1 ? PROGRAMAS[2].nombre : null,
      terceroNombre: f.tercero, numeroSoporte: f.soporte,
      ingreso: f.ingreso, egreso: f.egreso, saldoAcumulado: saldo,
    };
  });
}

const ARQUEOS = [
  { id: 'arq-001', fecha: '2026-10-31', saldoSistema: 1385400, saldoFisico: 1385400, diferencia: 0, responsable: 'María Fernanda Castañeda Restrepo', observacion: 'Arqueo de cierre de mes sin novedades; billetes y monedas contados en presencia de la coordinadora administrativa.' },
  { id: 'arq-002', fecha: '2026-09-30', saldoSistema: 1650000, saldoFisico: 1630000, diferencia: -20000, responsable: 'Juan Sebastián Ocampo Ríos', observacion: 'Faltante por cambio de devueltas en compra de refrigerios.' },
  { id: 'arq-003', fecha: '2026-08-31', saldoSistema: 980000, saldoFisico: 1005000, diferencia: 25000, responsable: 'Ana María Hernández Quintero', observacion: null },
  { id: 'arq-004', fecha: '2026-07-31', saldoSistema: 2000000, saldoFisico: 2000000, diferencia: 0, responsable: null, observacion: 'Sin novedad' },
];

function libroMayor(anio, mes, codigoPuc) {
  const m = mes || 11;
  const filas = [
    ...movimientosContables(m, anio),
    ...(m > 1 ? movimientosContables(m - 1, anio) : []),
  ].filter(x => !x.anulado && (!codigoPuc || x.codigoPuc.startsWith(codigoPuc)));
  const saldos = {};
  return filas
    .sort((a, b) => a.codigoPuc.localeCompare(b.codigoPuc) || a.fecha.localeCompare(b.fecha))
    .map(x => {
      const ingreso = x.tipo === 'ingreso' ? x.monto : 0;
      const egreso  = x.tipo === 'egreso'  ? x.monto : 0;
      saldos[x.codigoPuc] = (saldos[x.codigoPuc] ?? 0) + ingreso - egreso;
      return {
        id: `lm-${x.id}`, fecha: x.fecha, tipo: x.tipo, concepto: x.concepto,
        codigoPuc: x.codigoPuc, categoriaNombre: x.categoriaNombre, programaNombre: x.programaNombre,
        numeroSoporte: x.numeroSoporte, terceroNombre: x.terceroNombre,
        ingreso, egreso, saldoAcumulado: saldos[x.codigoPuc],
      };
    });
}

// ── Registro de manejadores ───────────────────────────────────────────────────
// El último registrado tiene prioridad: primero las RegExp genéricas, luego las rutas exactas.
export function registrar(api) {
  const hoy = () => new Date();
  const mesAnio = url => ({
    mes:  Number(url.searchParams.get('mes'))  || hoy().getMonth() + 1,
    anio: Number(url.searchParams.get('anio')) || hoy().getFullYear(),
  });
  const buscarEn = (lista, q, campos) => {
    const t = (q ?? '').toLowerCase();
    return !t ? lista : lista.filter(x => campos.some(c => String(x[c] ?? '').toLowerCase().includes(t)));
  };
  // Listados paginados en servidor: { data, total, pagina, porPagina }
  const paginar = (lista, url, extra = {}) => {
    const pagina    = Number(url.searchParams.get('pagina')) || 1;
    const porPagina = Number(url.searchParams.get('porPagina')) || 20;
    return { data: lista.slice((pagina - 1) * porPagina, pagina * porPagina), total: lista.length, pagina, porPagina, ...extra };
  };

  // Sedes (otro grupo puede sobrescribir /api/sedes con más campos)
  api
    .on('GET', /^\/api\/sedes\/[^/]+$/, ({ url }) => {
      const id = url.pathname.split('/').pop();
      return { json: SEDES.find(s => s.id === id) ?? SEDES[0] };
    })
    .on('GET', /^\/api\/sedes\/[^/]+\/programas$/, ({ url }) => {
      const id = url.pathname.split('/')[3];
      return { json: (SEDES.find(s => s.id === id) ?? SEDES[0]).programas };
    })
    .on('GET', '/api/sedes', SEDES)
    .on('GET', '/api/configuracion', CONFIGURACION);

  // Actividades
  api
    .on('GET', /^\/api\/actividades\/[^/]+$/, ({ url }) => {
      const id = url.pathname.split('/').pop();
      const lista = actividades(hoy().getMonth() + 1, hoy().getFullYear());
      return { json: lista.find(a => a.id === id) ?? lista[0] };
    })
    .on('GET', /^\/api\/actividades\/[^/]+\/asistencia$/, ASISTENCIA)
    .on('GET', '/api/actividades/horarios', ({ url }) => {
      const pid = url.searchParams.get('programaId');
      return { json: pid ? HORARIOS.filter(h => h.programaId === pid) : HORARIOS };
    })
    .on('GET', '/api/actividades', ({ url }) => {
      const { mes, anio } = mesAnio(url);
      return { json: actividades(mes, anio) };
    });

  // Voluntarios
  api
    .on('GET', /^\/api\/voluntarios\/[^/]+$/, ({ url }) => {
      const id = url.pathname.split('/').pop();
      return { json: VOLUNTARIOS.find(v => v.id === id) ?? VOLUNTARIOS[0] };
    })
    .on('GET', /^\/api\/voluntarios\/[^/]+\/asignaciones$/, ASIGNACIONES)
    .on('GET', '/api/voluntarios/stats', STATS_VOLUNTARIOS)
    .on('GET', '/api/voluntarios', ({ url }) => ({
      json: buscarEn(VOLUNTARIOS, url.searchParams.get('buscar'), ['nombre', 'documento', 'email', 'profesion']),
    }));

  // Donantes y donaciones
  api
    .on('GET', /^\/api\/donantes\/[^/]+$/, ({ url }) => {
      const id = url.pathname.split('/').pop();
      return { json: DONANTES.find(d => d.id === id) ?? DONANTES[0] };
    })
    .on('GET', '/api/donantes', ({ url }) => ({
      json: buscarEn(DONANTES, url.searchParams.get('buscar'), ['nombre', 'documento', 'email']),
    }))
    .on('GET', /^\/api\/donaciones\/[^/]+$/, ({ url }) => {
      const id = url.pathname.split('/').pop();
      return { json: DONACIONES.find(d => d.id === id) ?? DONACIONES[0] };
    })
    .on('GET', '/api/donaciones/stats', STATS_DONACIONES)
    .on('GET', '/api/donaciones', ({ url }) => {
      const p = url.searchParams;
      const lista = buscarEn(DONACIONES, p.get('buscar'), ['nombreDonante', 'reciboNumero', 'nombreItem']).filter(d =>
        (!p.get('tipo')   || d.tipo === p.get('tipo')) &&
        (!p.get('sedeId') || d.sedeId === p.get('sedeId')) &&
        (!p.get('desde')  || d.fechaDonacion >= p.get('desde')) &&
        (!p.get('hasta')  || d.fechaDonacion <= p.get('hasta')));
      return { json: paginar(lista, url) };
    });

  // Inventario (sobrescribe stats y comodatos-proximos de fixtures.js)
  api
    .on('GET', /^\/api\/inventario\/items\/[^/]+$/, ({ url }) => {
      const id = url.pathname.split('/').pop();
      return { json: ITEMS.find(i => i.id === id) ?? ITEMS[0] };
    })
    .on('GET', '/api/inventario/items', ({ url }) => {
      const p = url.searchParams;
      const json = buscarEn(ITEMS, p.get('buscar'), ['nombre', 'codigo']).filter(i =>
        (!p.get('categoria')    || i.categoria === p.get('categoria')) &&
        (!p.get('tipoTenencia') || i.tipoTenencia === p.get('tipoTenencia')));
      return { json };
    })
    .on('GET', '/api/inventario/stats', STATS_INV)
    .on('GET', '/api/inventario/tipos', TIPOS_INV)
    .on('GET', '/api/inventario/movimientos', MOVIMIENTOS_INV)
    .on('GET', '/api/inventario/donantes', ({ url }) => ({
      json: buscarEn(DONANTES, url.searchParams.get('buscar'), ['nombre', 'documento'])
        .map(d => ({ id: d.id, nombre: d.nombre, documento: d.documento })),
    }))
    .on('GET', '/api/inventario/comodatos-proximos', () => ({
      json: ITEMS.filter(i => i.tipoTenencia === 'comodato')
        .concat([{ ...ITEMS[1], id: 'item-006', nombre: 'Video beam Epson PowerLite con telón retráctil', comodatoFechaFin: isoDia(desdeHoy(25)) }]),
    }));

  // Contabilidad
  api
    .on('GET', '/api/contabilidad/stats', () => {
      const n = hoy();
      const anterior = MESES[(n.getMonth() + 11) % 12];
      return {
        json: {
          saldoTotal: CUENTAS.reduce((s, c) => s + c.saldoActual, 0),
          ingresosMes: 13345320, egresosMes: 8075300, balanceMes: 5270020,
          ultimosDosMeses: [
            { mes: anterior, ingresos: 39650000, egresos: 41625000 },
            { mes: MESES[n.getMonth()], ingresos: 13345320, egresos: 8075300 },
          ],
        },
      };
    })
    .on('GET', '/api/contabilidad/cuentas', CUENTAS)
    .on('GET', '/api/contabilidad/categorias', ({ url }) => {
      const tipo = url.searchParams.get('tipo');
      return { json: tipo ? CATEGORIAS.filter(c => c.tipo === tipo) : CATEGORIAS };
    })
    .on('GET', '/api/contabilidad/movimientos', ({ url }) => {
      const p = url.searchParams;
      const anio = num(p.get('anio')) ?? hoy().getFullYear();
      const meses = p.get('mes') ? [Number(p.get('mes'))] : [hoy().getMonth() + 1, hoy().getMonth() || 12];
      const lista = buscarEn(meses.flatMap(m => movimientosContables(m, anio)), p.get('buscar'), ['concepto', 'terceroNombre']).filter(m =>
        (!p.get('tipo')     || m.tipo === p.get('tipo')) &&
        (!p.get('cuentaId') || m.cuentaId === p.get('cuentaId')));
      const vigentes = lista.filter(m => !m.anulado);
      const suma = tipo => vigentes.filter(m => m.tipo === tipo).reduce((s, m) => s + m.monto, 0);
      return { json: paginar(lista, url, {
        totalIngresos: suma('ingreso'), totalEgresos: suma('egreso'),
        cantidadIngresos: vigentes.filter(m => m.tipo === 'ingreso').length,
        cantidadEgresos:  vigentes.filter(m => m.tipo === 'egreso').length,
      }) };
    })
    .on('GET', '/api/contabilidad/presupuesto', PRESUPUESTO)
    .on('GET', '/api/contabilidad/reporte', ({ url }) => {
      const { mes, anio } = mesAnio(url);
      return { json: reporte(mes, anio) };
    })
    .on('GET', '/api/contabilidad/resumen-anual', ({ url }) => ({
      json: resumenAnual(num(url.searchParams.get('anio')) ?? hoy().getFullYear()),
    }))
    .on('GET', '/api/contabilidad/caja-menor/libro', ({ url }) => {
      const p = url.searchParams;
      return { json: libroCajaMenor(p.get('cuentaId'), num(p.get('mes')), num(p.get('anio')) ?? hoy().getFullYear()) };
    })
    .on('GET', '/api/contabilidad/caja-menor/arqueos', ARQUEOS)
    .on('GET', '/api/contabilidad/libro-mayor', ({ url }) => {
      const p = url.searchParams;
      return { json: libroMayor(num(p.get('anio')) ?? hoy().getFullYear(), num(p.get('mes')), p.get('codigoPuc')) };
    });
}

// ── Rutas y diálogos para la auditoría ───────────────────────────────────────
// `clicTrasTab` (opcional): botón que hay que pulsar tras abrir esa pestaña para
// que cargue datos (Presupuesto y Reporte no consultan la API hasta pulsarlo).
export const RUTAS_B = [
  { nombre: 'Actividades', hash: '#/sede/actividades', tabs: ['Calendario', 'Horarios de programas'] },
  { nombre: 'Voluntarios', hash: '#/sede/voluntarios' },
  { nombre: 'Donaciones', hash: '#/sede/donaciones', tabs: ['Donantes', 'Donaciones'] },
  { nombre: 'Inventario', hash: '#/sede/inventario' },
  {
    nombre: 'Contabilidad', hash: '#/sede/contabilidad',
    tabs: ['Resumen', 'Movimientos', 'Cuentas', 'Presupuesto', 'Reporte Contador', 'Caja Menor', 'Libro Mayor'],
    clicTrasTab: { 'Presupuesto': 'Cargar', 'Reporte Contador': 'Generar Reporte' },
  },
];

const esperarDialogo = page => page.getByRole('dialog').first().waitFor();
const boton = (page, name, exact = false) => page.getByRole('button', { name, exact }).first();
const pestana = (page, name) => page.getByRole('tab', { name, exact: true }).first().click();

export const DIALOGOS_B = [
  // Actividades
  { nombre: 'Actividades - Nueva actividad', hash: '#/sede/actividades', abrir: async page => {
    await boton(page, 'Nueva actividad').click();
    await esperarDialogo(page);
  } },
  { nombre: 'Actividades - Nuevo horario (sesiones recurrentes)', hash: '#/sede/actividades', abrir: async page => {
    await boton(page, 'Nueva actividad').click();
    await esperarDialogo(page);
    await page.getByRole('dialog').getByRole('button', { name: 'Sesiones recurrentes' }).click();
    await esperarDialogo(page);
  } },
  { nombre: 'Actividades - Detalle actividad (clic en evento)', hash: '#/sede/actividades', abrir: async page => {
    await page.locator('.fc-event').filter({ hasText: TITULOS_ACT[0] }).first().click();
    await esperarDialogo(page);
  } },
  { nombre: 'Actividades - Asistencia', hash: '#/sede/actividades', abrir: async page => {
    await boton(page, 'Registrar asistencia').click();
    await esperarDialogo(page);
  } },
  { nombre: 'Actividades - Editar horario', hash: '#/sede/actividades', abrir: async page => {
    await pestana(page, 'Horarios de programas');
    await boton(page, 'Editar', true).click();
    await esperarDialogo(page);
  } },

  // Voluntarios
  { nombre: 'Voluntarios - Nuevo voluntario', hash: '#/sede/voluntarios', abrir: async page => {
    await boton(page, 'Nuevo voluntario').click();
    await esperarDialogo(page);
  } },
  { nombre: 'Voluntarios - Editar voluntario', hash: '#/sede/voluntarios', abrir: async page => {
    await boton(page, 'Editar', true).click();
    await esperarDialogo(page);
  } },
  { nombre: 'Voluntarios - Asignaciones (Programas)', hash: '#/sede/voluntarios', abrir: async page => {
    await boton(page, 'Programas', true).click();
    await esperarDialogo(page);
  } },

  // Donantes y donaciones
  { nombre: 'Donaciones - Nuevo donante', hash: '#/sede/donaciones', abrir: async page => {
    await boton(page, 'Nuevo donante').click();
    await esperarDialogo(page);
  } },
  { nombre: 'Donaciones - Editar donante', hash: '#/sede/donaciones', abrir: async page => {
    await boton(page, 'Editar', true).click();
    await esperarDialogo(page);
  } },
  { nombre: 'Donaciones - Nueva donación', hash: '#/sede/donaciones', abrir: async page => {
    await pestana(page, 'Donaciones');
    await boton(page, 'Nueva donación').click();
    await esperarDialogo(page);
  } },
  { nombre: 'Donaciones - Nueva donación desde donante', hash: '#/sede/donaciones', abrir: async page => {
    await boton(page, 'Donación', true).click();
    await esperarDialogo(page);
  } },
  { nombre: 'Donaciones - Recibo', hash: '#/sede/donaciones', abrir: async page => {
    await pestana(page, 'Donaciones');
    await boton(page, 'Ver recibo').click();
    await esperarDialogo(page);
  } },
  { nombre: 'Donaciones - Certificado tributario', hash: '#/sede/donaciones', abrir: async page => {
    await pestana(page, 'Donaciones');
    await boton(page, 'Certificado tributario').click();
    await esperarDialogo(page);
  } },

  // Inventario
  { nombre: 'Inventario - Nuevo artículo', hash: '#/sede/inventario', abrir: async page => {
    await boton(page, 'Nuevo artículo').click();
    await esperarDialogo(page);
  } },
  { nombre: 'Inventario - Editar artículo', hash: '#/sede/inventario', abrir: async page => {
    await boton(page, 'Editar', true).click();
    await esperarDialogo(page);
  } },
  { nombre: 'Inventario - Registrar movimiento', hash: '#/sede/inventario', abrir: async page => {
    await boton(page, 'Movimiento', true).click();
    await esperarDialogo(page);
  } },
  { nombre: 'Inventario - Transferencia', hash: '#/sede/inventario', abrir: async page => {
    await boton(page, 'Transferir a otra sede').click();
    await esperarDialogo(page);
  } },
  { nombre: 'Inventario - Historial', hash: '#/sede/inventario', abrir: async page => {
    await boton(page, 'Historial', true).click();
    await esperarDialogo(page);
  } },

  // Contabilidad
  { nombre: 'Contabilidad - Movimiento nuevo (ingreso)', hash: '#/sede/contabilidad', abrir: async page => {
    await boton(page, 'Registrar Ingreso').click();
    await esperarDialogo(page);
  } },
  { nombre: 'Contabilidad - Movimiento nuevo (egreso)', hash: '#/sede/contabilidad', abrir: async page => {
    await boton(page, 'Registrar Egreso').click();
    await esperarDialogo(page);
  } },
  { nombre: 'Contabilidad - Editar movimiento', hash: '#/sede/contabilidad', abrir: async page => {
    await pestana(page, 'Movimientos');
    await boton(page, 'Editar', true).click();
    await esperarDialogo(page);
  } },
  { nombre: 'Contabilidad - Ver comprobante', hash: '#/sede/contabilidad', abrir: async page => {
    await pestana(page, 'Movimientos');
    await boton(page, 'Ver comprobante').click();
    await esperarDialogo(page);
  } },
  { nombre: 'Contabilidad - Cuenta nueva', hash: '#/sede/contabilidad', abrir: async page => {
    await pestana(page, 'Cuentas');
    await boton(page, 'Nueva Cuenta').click();
    await esperarDialogo(page);
  } },
  { nombre: 'Contabilidad - Presupuesto (agregar línea)', hash: '#/sede/contabilidad', abrir: async page => {
    await pestana(page, 'Presupuesto');
    await boton(page, 'Agregar línea').click();
    await esperarDialogo(page);
  } },
  { nombre: 'Contabilidad - Arqueo de caja', hash: '#/sede/contabilidad', abrir: async page => {
    await pestana(page, 'Caja Menor');
    await boton(page, 'Arquear Caja').click();
    await esperarDialogo(page);
  } },
  { nombre: 'Contabilidad - Reposición de caja menor', hash: '#/sede/contabilidad', abrir: async page => {
    await pestana(page, 'Caja Menor');
    await boton(page, 'Reponer Caja').click();
    await esperarDialogo(page);
  } },
];

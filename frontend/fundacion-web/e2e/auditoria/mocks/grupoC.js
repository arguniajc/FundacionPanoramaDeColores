// Mocks de la auditoría responsive — grupo C: Dashboard, Talento humano (empleados,
// organigrama, nómina, novedades), Organigrama, Reportes, Configuración, Seguridad,
// Equipo y Acceso (login).
//
// Las formas de respuesta siguen lo que leen las páginas de src/ (ver comentarios).
// Datos largos y realistas a propósito: la auditoría busca desbordes de diseño.
import { CONFIG_PUBLICA, PNG_1X1 } from '../../support/datos.js';

// ── Utilidades ────────────────────────────────────────────────────────────────

// Rutas que registrarBase (fixtures.js) deja con respuestas vacías
const RUTAS_BASE = new Set([
  '/api/configuracion/publica', '/api/alertas', '/api/beneficiarios/stats-ninos',
  '/api/talento-humano/stats', '/api/inventario/stats', '/api/inventario/comodatos-proximos',
]);

/**
 * Registra una ruta compartida con páginas de otros grupos solo si ningún otro
 * grupo la definió ya (su página puede necesitar campos que esta no conoce).
 */
function compartido(api, metodo, ruta, respuesta) {
  const previos = api.manejadores.filter(h => h.metodo === metodo && String(h.ruta) === String(ruta)).length;
  if (previos > (RUTAS_BASE.has(ruta) ? 1 : 0)) return;
  api.on(metodo, ruta, respuesta);
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ── Dashboard ─────────────────────────────────────────────────────────────────

// useDashboardPage / DashboardPage: códigos PI, IN1, IN2, PA, AD (leyenda fija)
const STATS_NINOS_C = {
  totalActivos: 148,
  extranjeros: 23,
  otraRegion: 31,
  sinEdad: 4,
  porRango: [
    { codigo: 'PI',  nombre: 'Primera infancia', total: 26 },
    { codigo: 'IN1', nombre: 'Infancia inicial', total: 34 },
    { codigo: 'IN2', nombre: 'Infancia media',   total: 41 },
    { codigo: 'PA',  nombre: 'Preadolescencia',  total: 27 },
    { codigo: 'AD',  nombre: 'Adolescencia',     total: 20 },
  ],
  porGenero: [
    { genero: 'Femenino', total: 79 },
    { genero: 'Masculino', total: 66 },
    { genero: 'Otro', total: 3 },
  ],
  topPaises: [
    { pais: 'República Bolivariana de Venezuela', total: 17 },
    { pais: 'Ecuador', total: 3 },
    { pais: 'Perú', total: 2 },
    { pais: 'Estado Plurinacional de Bolivia', total: 1 },
  ],
  departamentosConCiudades: [
    { departamento: 'Valle del Cauca', total: 94, ciudades: [
      { ciudad: 'Yumbo', total: 71 }, { ciudad: 'Santiago de Cali', total: 15 },
      { ciudad: 'Guadalajara de Buga', total: 5 }, { ciudad: 'Jamundí', total: 3 },
    ] },
    { departamento: 'Cauca', total: 12, ciudades: [
      { ciudad: 'Popayán', total: 6 }, { ciudad: 'Santander de Quilichao', total: 4 }, { ciudad: 'Puerto Tejada', total: 2 },
    ] },
    { departamento: 'Nariño', total: 8, ciudades: [
      { ciudad: 'San Andrés de Tumaco', total: 5 }, { ciudad: 'San Juan de Pasto', total: 3 },
    ] },
    { departamento: 'Archipiélago de San Andrés, Providencia y Santa Catalina', total: 3, ciudades: [
      { ciudad: 'San Andrés', total: 3 },
    ] },
    { departamento: 'Chocó', total: 8, ciudades: [
      { ciudad: 'Quibdó', total: 6 }, { ciudad: 'Istmina', total: 2 },
    ] },
  ],
};

// useAlertas (campana del AdminLayout y chips del Dashboard): { tipo, modulo, nivel: warning|info|error, mensaje, valor }
const ALERTAS = [
  { tipo: 'contrato_vencimiento', modulo: 'talento_humano', nivel: 'warning', mensaje: '2 contratos de trabajo vencen en los próximos 30 días', valor: 2 },
  { tipo: 'novedad_pendiente',    modulo: 'talento_humano', nivel: 'info',    mensaje: '3 novedades de personal pendientes de aprobación por la coordinación', valor: 3 },
  { tipo: 'stock_bajo',           modulo: 'inventario',     nivel: 'warning', mensaje: '6 artículos con stock bajo el mínimo', valor: 6 },
  { tipo: 'sin_stock',            modulo: 'inventario',     nivel: 'error',   mensaje: '4 ítems del inventario están sin stock en la sede principal de Yumbo', valor: 4 },
  { tipo: 'comodato_vencimiento', modulo: 'inventario',     nivel: 'warning', mensaje: '2 comodatos vencen en los próximos 30 días', valor: 2 },
  { tipo: 'presupuesto_sobre_ejecutado', modulo: 'contabilidad', nivel: 'error', mensaje: '1 rubro del presupuesto superó lo presupuestado este año', valor: 1 },
];

// ── Talento humano ────────────────────────────────────────────────────────────

const SEDES = [
  { id: 1, nombre: 'Sede Principal Barrio Panorama — Comuna 1 de Yumbo', direccion: 'Carrera 7F # 16H-10, Barrio Panorama, Comuna 1', ciudad: 'Yumbo', activo: true,
    programas: [
      { id: 11, sedeId: 1, nombre: 'Arte, Creatividad y Expresión Corporal para la Primera Infancia', descripcion: 'Talleres semanales de pintura, música y danza.', activo: true, cupoMaximo: 40 },
      { id: 12, sedeId: 1, nombre: 'Deporte Formativo y Recreación Comunitaria', descripcion: 'Escuela de fútbol y actividades lúdicas los sábados.', activo: true, cupoMaximo: 60 },
    ] },
  { id: 2, nombre: 'Sede Comunitaria Las Américas — Salón Comunal', direccion: 'Calle 12 # 4-56, Salón Comunal Barrio Las Américas', ciudad: 'Yumbo', activo: true,
    programas: [
      { id: 21, sedeId: 2, nombre: 'Conciencia Ambiental y Huertas Urbanas Escolares', descripcion: 'Huerta comunitaria y reciclaje con familias.', activo: true, cupoMaximo: 30 },
    ] },
  { id: 3, nombre: 'Punto de Atención Psicosocial Santiago de Cali', direccion: 'Avenida 3 Norte # 45-120, Oficina 302', ciudad: 'Santiago de Cali', activo: true, programas: [] },
  { id: 4, nombre: 'Bodega de Donaciones en Especie — Zona Industrial Acopi', direccion: 'Calle 15 # 30-75, Bodega 8, Zona Industrial Acopi', ciudad: 'Yumbo', activo: false, programas: [] },
];

// TalentoHumanoPage (lista), PanelEmpleado (detalle), DialogEmpleado (edición).
// Fechas solo-fecha: PanelEmpleado hace new Date(f + 'T00:00:00').
const EMPLEADOS = [
  { id: 201, nombres: 'María Alejandra', apellidos: 'Castillo Hurtado de Mendoza', tipoDocumento: 'CC', numeroDocumento: '1144087263',
    email: 'maria.alejandra.castillo.hurtado@fundacionpanoramadecolores.org', telefono: '6026951234', celular: '3156789012',
    cargo: 'Directora Ejecutiva y Representante Legal Suplente', area: 'Administración', sedeId: 1, sedeNombre: SEDES[0].nombre,
    tipoContrato: 'indefinido', fechaIngreso: '2026-01-12', fechaFinContrato: null, salario: 7850000,
    eps: 'Entidad Promotora de Salud Sanitas S.A.S.', pension: 'Protección S.A. Fondo de Pensiones', activo: true,
    notas: 'Responsable de la relación con cooperantes internacionales y del informe anual a la DIAN.', novedadesPendientes: 0 },
  { id: 202, nombres: 'Luisa Fernanda', apellidos: 'Ospina Valderrama', tipoDocumento: 'CC', numeroDocumento: '1107523987',
    email: 'luisa.ospina.valderrama.coordinacion@fundacionpanoramadecolores.org', telefono: null, celular: '3209876543',
    cargo: 'Coordinadora de Programas Psicosociales y Nutricionales', area: 'Coordinación', sedeId: 1, sedeNombre: SEDES[0].nombre,
    tipoContrato: 'fijo', fechaIngreso: '2026-02-01', fechaFinContrato: '2026-12-01', salario: 4980000,
    eps: 'Nueva EPS', pension: 'Colpensiones', activo: true, notas: null, novedadesPendientes: 2 },
  { id: 203, nombres: 'Juan Sebastián', apellidos: 'Mosquera Angulo', tipoDocumento: 'CC', numeroDocumento: '16789345',
    email: 'juan.sebastian.mosquera.angulo@gmail.com', telefono: '6026957788', celular: '3174561230',
    cargo: 'Profesional en Trabajo Social y Acompañamiento Familiar', area: 'Trabajo Social', sedeId: 2, sedeNombre: SEDES[1].nombre,
    tipoContrato: 'prestacion_servicios', fechaIngreso: '2026-03-16', fechaFinContrato: '2026-11-30', salario: 3650000,
    eps: 'Emssanar EPS', pension: 'Porvenir S.A.', activo: true, notas: 'Contrato financiado por convenio con la Alcaldía de Yumbo.', novedadesPendientes: 1 },
  { id: 204, nombres: 'Ana Catalina', apellidos: 'Rengifo Bermúdez', tipoDocumento: 'CC', numeroDocumento: '1006234871',
    email: 'catalina.rengifo@fundacionpanoramadecolores.org', telefono: null, celular: '3012223344',
    cargo: 'Docente de Artes Plásticas y Tallerista de Expresión Corporal', area: 'Educación', sedeId: 1, sedeNombre: SEDES[0].nombre,
    tipoContrato: 'indefinido', fechaIngreso: '2026-04-06', fechaFinContrato: null, salario: 2850000,
    eps: 'Coomeva EPS', pension: 'Colfondos S.A.', activo: true, notas: null, novedadesPendientes: 0 },
  { id: 205, nombres: 'Carlos Andrés', apellidos: 'Valencia Saavedra', tipoDocumento: 'CE', numeroDocumento: '987654321',
    email: 'carlos.valencia.saavedra.contabilidad@outlook.com', telefono: '6024448899', celular: '3105557788',
    cargo: 'Contador Público y Auxiliar de Tesorería', area: 'Contabilidad', sedeId: 3, sedeNombre: SEDES[2].nombre,
    tipoContrato: 'aprendizaje', fechaIngreso: '2026-05-04', fechaFinContrato: '2026-11-20', salario: 1750905,
    eps: 'Salud Total EPS-S', pension: 'Skandia Pensiones y Cesantías', activo: true, notas: null, novedadesPendientes: 0 },
  { id: 206, nombres: 'Gloria Patricia', apellidos: 'Muñoz Caicedo', tipoDocumento: 'CC', numeroDocumento: '31987456',
    email: 'gloria.munoz.caicedo@hotmail.com', telefono: null, celular: '3167778899',
    cargo: 'Auxiliar de Servicios Generales y Manipuladora de Alimentos', area: 'Otro', sedeId: 2, sedeNombre: SEDES[1].nombre,
    tipoContrato: 'fijo', fechaIngreso: '2026-01-20', fechaFinContrato: '2026-07-20', salario: 1423500,
    eps: 'Nueva EPS', pension: 'Colpensiones', activo: false, notas: 'Contrato terminado por vencimiento del plazo.', novedadesPendientes: 0 },
];

const STATS_TH = { total: EMPLEADOS.length, activos: EMPLEADOS.filter(e => e.activo).length, contratosProximosVencer: 2, novedadesPendientes: 3 };

// PanelNovedades: { id, tipo, fechaInicio, fechaFin, dias, descripcion, estado }
const novedadesDe = (empleadoId) => [
  { id: empleadoId * 10 + 1, empleadoId, tipo: 'vacaciones', fechaInicio: '2026-12-14', fechaFin: '2026-12-31', dias: 15,
    descripcion: 'Vacaciones colectivas de fin de año acordadas con la Dirección Ejecutiva', estado: 'pendiente' },
  { id: empleadoId * 10 + 2, empleadoId, tipo: 'incapacidad', fechaInicio: '2026-09-08', fechaFin: '2026-09-12', dias: 5,
    descripcion: 'Incapacidad médica general expedida por la EPS por infección respiratoria', estado: 'aprobada' },
  { id: empleadoId * 10 + 3, empleadoId, tipo: 'permiso_no_remunerado', fechaInicio: '2026-07-17', fechaFin: '2026-07-17', dias: 1,
    descripcion: 'Diligencias personales', estado: 'rechazada' },
  { id: empleadoId * 10 + 4, empleadoId, tipo: 'comision', fechaInicio: '2026-11-18', fechaFin: '2026-11-21', dias: 4,
    descripcion: 'Comisión de servicios al Encuentro Nacional de Fundaciones en Bogotá D.C.', estado: 'pendiente' },
];

// PanelNomina: periodos { id, mes, anio, estado, totalEmpleados, totalNeto }
const periodosDe = (anio) => [
  { id: anio * 100 + 10, mes: 10, anio, estado: 'borrador', totalEmpleados: 5, totalNeto: 19873450, observacion: 'Incluye horas extra de la jornada de vacunación' },
  { id: anio * 100 + 9,  mes: 9,  anio, estado: 'cerrado',  totalEmpleados: 5, totalNeto: 19412300, observacion: null },
  { id: anio * 100 + 8,  mes: 8,  anio, estado: 'cerrado',  totalEmpleados: 6, totalNeto: 20987600, observacion: null },
  { id: anio * 100 + 7,  mes: 7,  anio, estado: 'cerrado',  totalEmpleados: 6, totalNeto: 21034500, observacion: null },
  { id: anio * 100 + 6,  mes: 6,  anio, estado: 'cerrado',  totalEmpleados: 6, totalNeto: 32456780, observacion: 'Incluye prima de servicios de mitad de año' },
];

// NominaLiquidacionDto (FilaLiquidacion, EditarLiquidacionDialog, Excel y desprendibles)
const liquidacionesDe = (periodoId) => EMPLEADOS.filter(e => e.activo).map((e, i) => {
  const aux = e.salario <= 2847000 ? 200000 : 0;
  const devengado = e.salario + aux;
  const salud = Math.round(e.salario * 0.04);
  const deducciones = salud * 2;
  return {
    id: periodoId * 10 + i, periodoId, empleadoId: e.id,
    empleadoNombre: `${e.nombres} ${e.apellidos}`, cargo: e.cargo, numeroDocumento: e.numeroDocumento ?? null,
    diasTrabajados: 30, salarioBase: e.salario, auxilioTransporte: aux, horasExtras: 0, bonificaciones: 0,
    deduccionSalud: salud, deduccionPension: salud, retencionFuente: 0, otrasDeducciones: 0,
    totalDevengado: devengado, totalDeducciones: deducciones, netoPagar: devengado - deducciones,
    observacion: null,
  };
});

// OrgChartTab: ids string (se comparan con dataTransfer). fotoUrl null: nada que firmar.
const ORGANIGRAMA = [
  { id: 'org-01', parentId: null,     orden: 0, cargo: 'Presidente de Junta Directiva', empleadoId: null, empleadoNombre: null, nombreExterno: 'Hernando José Restrepo Villegas', fotoUrl: null },
  { id: 'org-02', parentId: 'org-01', orden: 1, cargo: 'Directora Ejecutiva y Representante Legal Suplente', empleadoId: 201, empleadoNombre: 'María Alejandra Castillo Hurtado de Mendoza', nombreExterno: null, fotoUrl: null },
  { id: 'org-03', parentId: 'org-01', orden: 2, cargo: 'Revisor(a) Fiscal', empleadoId: null, empleadoNombre: null, nombreExterno: 'Martha Lucía Benavides Ortiz', fotoUrl: null },
  { id: 'org-04', parentId: 'org-02', orden: 3, cargo: 'Coordinadora de Programas Psicosociales y Nutricionales', empleadoId: 202, empleadoNombre: 'Luisa Fernanda Ospina Valderrama', nombreExterno: null, fotoUrl: null },
  { id: 'org-05', parentId: 'org-02', orden: 4, cargo: 'Contador Público y Auxiliar de Tesorería', empleadoId: 205, empleadoNombre: 'Carlos Andrés Valencia Saavedra', nombreExterno: null, fotoUrl: null },
  { id: 'org-06', parentId: 'org-04', orden: 5, cargo: 'Profesional en Trabajo Social y Acompañamiento Familiar', empleadoId: 203, empleadoNombre: 'Juan Sebastián Mosquera Angulo', nombreExterno: null, fotoUrl: null },
  { id: 'org-07', parentId: 'org-04', orden: 6, cargo: 'Docente de Artes Plásticas y Tallerista de Expresión Corporal', empleadoId: 204, empleadoNombre: 'Ana Catalina Rengifo Bermúdez', nombreExterno: null, fotoUrl: null },
];

// ── Reportes ──────────────────────────────────────────────────────────────────

const PROGRAMAS_LARGOS = [
  'Arte, Creatividad y Expresión Corporal',
  'Deporte Formativo y Recreación Comunitaria',
  'Conciencia Ambiental y Huertas Urbanas',
  'Refuerzo Escolar y Lectoescritura',
  'Acompañamiento Psicosocial a Familias',
];

const reporteBeneficiarios = (anio) => ({
  anio,
  resumen: { total: 163, activos: 148, inactivos: 15, conDiscapacidad: 7, conAutorizacion: 139 },
  porEdad: [
    { etiqueta: '0 – 5 años', cantidad: 26 }, { etiqueta: '6 – 8 años', cantidad: 34 },
    { etiqueta: '9 – 11 años', cantidad: 41 }, { etiqueta: '12 – 13 años', cantidad: 27 },
    { etiqueta: '14 – 16 años', cantidad: 20 },
  ],
  porGenero: [{ etiqueta: 'Femenino', cantidad: 79 }, { etiqueta: 'Masculino', cantidad: 66 }, { etiqueta: 'Otro', cantidad: 3 }],
  porPrograma: PROGRAMAS_LARGOS.map((p, i) => ({ etiqueta: p, cantidad: [52, 47, 31, 28, 19][i] })),
  porGrado: [
    { etiqueta: 'Transición', cantidad: 14 }, { etiqueta: '1°', cantidad: 18 }, { etiqueta: '2°', cantidad: 16 },
    { etiqueta: '3°', cantidad: 21 }, { etiqueta: '4°', cantidad: 19 }, { etiqueta: '5°', cantidad: 22 },
    { etiqueta: '6° a 9° (básica secundaria)', cantidad: 29 }, { etiqueta: 'Sin escolarizar', cantidad: 9 },
  ],
  nuevosPorMes: MESES_CORTOS.map((mes, i) => ({ mes, cantidad: [12, 18, 9, 14, 7, 5, 11, 16, 8, 13, 6, 0][i] })),
});

const REPORTE_PROGRAMAS = {
  resumen: { total: 9, activos: 7, totalInscritos: 177 },
  inscritosPorPrograma: PROGRAMAS_LARGOS.map((programa, i) => ({
    programa, inscritos: [58, 51, 36, 30, 22][i], inscritosActivos: [52, 47, 31, 28, 19][i],
  })),
  estadoInscripciones: [
    { etiqueta: 'Activa', cantidad: 177 }, { etiqueta: 'Pendiente de autorización', cantidad: 14 },
    { etiqueta: 'Retirada', cantidad: 9 }, { etiqueta: 'Finalizada', cantidad: 23 },
  ],
  porSede: SEDES.map((s, i) => ({ etiqueta: s.nombre, cantidad: [4, 2, 2, 1][i] })),
};

const REPORTE_INVENTARIO = {
  resumen: { totalItems: 342, itemsBajoStock: 6, categorias: 8, stockTotal: 12875 },
  porCategoria: [
    { categoria: 'Materiales de arte y papelería', items: 98, stockTotal: 4520 },
    { categoria: 'Implementos deportivos', items: 47, stockTotal: 610 },
    { categoria: 'Alimentos no perecederos', items: 63, stockTotal: 5230 },
    { categoria: 'Equipos de cómputo y audiovisuales', items: 21, stockTotal: 38 },
    { categoria: 'Kits de aseo personal', items: 113, stockTotal: 2477 },
  ],
  movimientosPorTipo: [
    { etiqueta: 'Entrada por donación', cantidad: 84 }, { etiqueta: 'Salida a programas', cantidad: 126 },
    { etiqueta: 'Transferencia entre sedes', cantidad: 17 }, { etiqueta: 'Ajuste de inventario', cantidad: 5 },
  ],
  itemsCriticos: [
    { nombre: 'Témperas escolares x 6 colores (frasco 30 ml)', categoria: 'Materiales de arte y papelería', stockActual: 4, stockMinimo: 40 },
    { nombre: 'Balón de fútbol N.º 4 laminado', categoria: 'Implementos deportivos', stockActual: 2, stockMinimo: 10 },
    { nombre: 'Leche en polvo entera bolsa 380 g', categoria: 'Alimentos no perecederos', stockActual: 12, stockMinimo: 60 },
    { nombre: 'Cepillo dental infantil cerdas suaves', categoria: 'Kits de aseo personal', stockActual: 0, stockMinimo: 100 },
  ],
};

const reporteActividades = (anio) => ({
  anio,
  resumen: { total: 86, completadas: 61, enCurso: 7, planificadas: 18, totalAsistencia: 2314, promedioAsistencia: 37.9 },
  porEstado: [
    { etiqueta: 'Completada', cantidad: 61 }, { etiqueta: 'En curso', cantidad: 7 },
    { etiqueta: 'Planificada', cantidad: 18 }, { etiqueta: 'Cancelada', cantidad: 3 },
  ],
  asistenciaPorActividad: [
    { titulo: 'Festival de Talentos Panorama 2026', inscritos: 120, asistieron: 104 },
    { titulo: 'Jornada de Vacunación y Tamizaje Nutricional', inscritos: 95, asistieron: 88 },
    { titulo: 'Taller de Reciclaje Creativo con Familias', inscritos: 60, asistieron: 41 },
    { titulo: 'Torneo Interbarrial de Fútbol Infantil', inscritos: 80, asistieron: 77 },
    { titulo: 'Escuela de Padres: Crianza Amorosa', inscritos: 45, asistieron: 29 },
  ],
  porMes: MESES_CORTOS.map((mes, i) => ({ mes, cantidad: [4, 6, 8, 9, 7, 5, 6, 10, 9, 11, 8, 3][i] })),
});

const reporteDonaciones = (anio) => ({
  anio,
  resumen: { total: 214, totalMonto: 487650000, promedioMonto: 2278738 },
  porTipo: [
    { tipo: 'Monetaria (transferencia bancaria)', cantidad: 96 }, { tipo: 'En especie', cantidad: 71 },
    { tipo: 'Voluntariado corporativo', cantidad: 28 }, { tipo: 'Comodato de equipos', cantidad: 19 },
  ],
  montosPorMes: MESES_CORTOS.map((mes, i) => ({ mes, monto: [18500000, 22300000, 41250000, 35800000, 29900000, 64750000,
    27300000, 38900000, 45600000, 71200000, 92150000, 0][i] })),
  topDonantes: [
    { nombre: 'Fundación Empresarial Cartón de Colombia Smurfit Westrock', totalMonto: 120000000 },
    { nombre: 'Alcaldía Municipal de Yumbo — Secretaría de Bienestar Social', totalMonto: 95500000 },
    { nombre: 'Cooperativa Multiactiva de Trabajadores del Valle', totalMonto: 48750000 },
    { nombre: 'Rotary Club Cali Occidente', totalMonto: 31200000 },
    { nombre: 'Familia Restrepo Villegas', totalMonto: 18000000 },
  ],
});

// TabContabilidadEsal (y ContabilidadPage, que además usa `periodo`)
const reporteContable = (mes, anio) => {
  const porCuenta = [
    { codigoPuc: '4170', cuenta: 'Donaciones recibidas de personas jurídicas', tipo: 'ingreso', total: 98500000 },
    { codigoPuc: '4175', cuenta: 'Donaciones recibidas de personas naturales', tipo: 'ingreso', total: 27350000 },
    { codigoPuc: '4210', cuenta: 'Rendimientos financieros de cuentas de ahorro', tipo: 'ingreso', total: 1287450 },
    { codigoPuc: '5105', cuenta: 'Gastos de personal (nómina y prestaciones sociales)', tipo: 'egreso', total: 19873450 },
    { codigoPuc: '5110', cuenta: 'Honorarios profesionales — revisoría fiscal y asesoría', tipo: 'egreso', total: 6400000 },
    { codigoPuc: '5135', cuenta: 'Servicios públicos, arrendamientos y conectividad', tipo: 'egreso', total: 3215800 },
    { codigoPuc: '5195', cuenta: 'Materiales, refrigerios y transporte para programas', tipo: 'egreso', total: 24760300 },
  ];
  const totalIngresos = porCuenta.filter(c => c.tipo === 'ingreso').reduce((s, c) => s + c.total, 0);
  const totalEgresos  = porCuenta.filter(c => c.tipo === 'egreso').reduce((s, c) => s + c.total, 0);
  const mm = String(mes).padStart(2, '0');
  return {
    mes, anio,
    periodo: `${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][mes - 1] ?? ''} ${anio}`,
    totalIngresos, totalEgresos, balance: totalIngresos - totalEgresos,
    porCuenta,
    porPrograma: PROGRAMAS_LARGOS.map((programa, i) => {
      const ingresos = [42000000, 31500000, 22800000, 18650000, 12187450][i];
      const egresos  = [17300000, 14250000, 9800000, 7650000, 5249550][i];
      return { programa, ingresos, egresos, balance: ingresos - egresos };
    }),
    movimientos: [
      { id: 'mov-9001', fecha: `${anio}-${mm}-05`, tipo: 'egreso', descripcion: 'Honorarios revisoría fiscal', valor: 3200000,
        terceroNombre: 'Benavides Ortiz Auditores y Consultores S.A.S.', terceroDocumento: '901234567-8',
        conceptoRetencion: 'Honorarios y comisiones (personas jurídicas)', tarifaRetencion: 11, retencionPracticada: 352000 },
      { id: 'mov-9002', fecha: `${anio}-${mm}-12`, tipo: 'egreso', descripcion: 'Compra de materiales de arte', valor: 8450000,
        terceroNombre: 'Papelería y Distribuciones Artísticas del Pacífico Ltda.', terceroDocumento: '805067891-2',
        conceptoRetencion: 'Compras generales (declarantes)', tarifaRetencion: 2.5, retencionPracticada: 211250 },
      { id: 'mov-9003', fecha: `${anio}-${mm}-20`, tipo: 'egreso', descripcion: 'Servicio de transporte para salida pedagógica', valor: 2600000,
        terceroNombre: 'Transportes Especiales Yumbo Express S.A.S.', terceroDocumento: '900876543-1',
        conceptoRetencion: 'Servicios de transporte de pasajeros', tarifaRetencion: 3.5, retencionPracticada: 91000 },
      { id: 'mov-9004', fecha: `${anio}-${mm}-25`, tipo: 'ingreso', descripcion: 'Donación corporativa', valor: 50000000,
        terceroNombre: 'Fundación Empresarial Cartón de Colombia', terceroDocumento: '890300406-3',
        conceptoRetencion: null, tarifaRetencion: null, retencionPracticada: 0 },
    ],
  };
};

// ── Configuración ─────────────────────────────────────────────────────────────

const WEB_CONTENIDO = {
  slider: [
    { titulo: 'Transformando vidas a través del arte, el deporte y la conciencia ambiental en Yumbo', subtitulo: 'Descubre el potencial creativo de más de ciento cincuenta niños, niñas y adolescentes del barrio Panorama, Comuna 1', cta: 'Conoce nuestros programas', ctaHref: '#que-hacemos', imagen: '' },
    { titulo: 'Deporte formativo para el desarrollo integral', subtitulo: 'Fomentamos valores de respeto, disciplina y trabajo en equipo con escuelas deportivas gratuitas', cta: 'Ver nuestras actividades', ctaHref: '#galeria', imagen: '' },
    { titulo: 'Conciencia ambiental para un futuro mejor', subtitulo: 'Huertas urbanas, reciclaje creativo y cuidado del río Yumbo con las familias del sector', cta: 'Únete a nuestra causa', ctaHref: '#donaciones', imagen: '' },
  ],
  quienesSomos: {
    imagen: '',
    mision: 'Transformar la vida de niños, niñas, adolescentes y sus familias en el barrio Panorama de la Comuna 1 de Yumbo, Valle del Cauca, a través del arte, el deporte y la conciencia ambiental, promoviendo su desarrollo integral, la garantía de sus derechos y la construcción de un futuro sostenible.',
    vision: 'En 2030 seremos una fundación líder en el Valle del Cauca en la transformación social de comunidades vulnerables, reconocida por su transparencia, su trabajo en red con el sector público y privado y su compromiso con la niñez.',
    historia: 'La Fundación Panorama de Colores nació en 2023 como una iniciativa de madres comunitarias y líderes del barrio que querían ofrecer a sus hijos espacios seguros después de la jornada escolar. Hoy acompañamos a más de 150 niños y 120 familias con un equipo de profesionales, voluntarios y aliados.',
  },
  programas: [
    { icono: 'fa-palette', titulo: 'Arte, Creatividad y Expresión Corporal', descripcion: 'Talleres de pintura, música, danza y teatro para la primera infancia y la infancia media.' },
    { icono: 'fa-futbol', titulo: 'Deporte Formativo y Recreación', descripcion: 'Escuela de fútbol mixta, atletismo y juegos tradicionales todos los sábados.' },
    { icono: 'fa-leaf', titulo: 'Conciencia Ambiental', descripcion: 'Huertas urbanas, reciclaje y recorridos ecológicos con las familias.' },
    { icono: 'fa-users', titulo: 'Acompañamiento Psicosocial', descripcion: 'Atención psicológica, trabajo social y escuela de padres.' },
  ],
  impacto: {
    visible: true,
    titulo: 'NUESTRO IMPACTO EN EL BARRIO PANORAMA DE YUMBO, VALLE DEL CAUCA',
    items: [
      { numero: 163, label: 'Niñas, niños y adolescentes formados en nuestros programas' },
      { numero: 124, label: 'Familias beneficiadas con acompañamiento psicosocial' },
      { numero: 3, label: 'Años trabajando por la niñez del barrio Panorama de Yumbo' },
      { numero: 286, label: 'Talleres y actividades comunitarias realizadas' },
    ],
  },
  galeria: [
    { imagen: '', titulo: 'Taller de arte infantil en el salón comunal' },
    { imagen: '', titulo: 'Torneo interbarrial de fútbol infantil' },
    { imagen: '', titulo: 'Jornada de siembra en la huerta comunitaria' },
    { imagen: '', titulo: 'Exposición de las creaciones de los niños' },
  ],
  donaciones: {
    whatsapp: '573226012056',
    email: 'donaciones.fundacionpanoramadecolores@gmail.com',
    textoVoluntariado: 'Únete como voluntario o voluntaria y comparte tus habilidades artísticas, deportivas o profesionales con nuestra comunidad; te acompañamos con inducción y certificado de horas.',
    textoEspecie: 'Recibimos materiales de arte, implementos deportivos, útiles escolares, alimentos no perecederos y kits de aseo para nuestros talleres y familias.',
    textoMonetario: 'Si deseas realizar una donación monetaria y recibir el certificado de donación para descontar en tu declaración de renta, escríbenos por WhatsApp o correo electrónico. Con tu aporte seguimos ampliando nuestro impacto.',
  },
  contacto: {
    direccion: 'Carrera 7F # 16H-10, Barrio Panorama, Comuna 1 — Yumbo, Valle del Cauca, Colombia',
    telefono: '+57 322 602 2056',
    email: 'contacto.fundacionpanoramadecolores@gmail.com',
    instagram: 'https://www.instagram.com/fundacionpanoramadecolores/',
    tiktok: 'https://www.tiktok.com/@fundapanoramadecolores',
    whatsapp: '573226012056',
  },
  footer: {
    nombre: 'FUNDACIÓN PANORAMA DE COLORES',
    eslogan: 'Transformamos vidas a través del arte, el deporte y la conciencia ambiental.',
    copyright: '© 2026 Fundación Panorama de Colores. Todos los derechos reservados. Entidad Sin Ánimo de Lucro vigilada por la Gobernación del Valle del Cauca.',
  },
};

// ConfiguracionPage: lee todos estos campos (la clave SMTP nunca viaja: smtpClaveGuardada)
const CONFIGURACION = {
  ...CONFIG_PUBLICA,
  nombreFundacion: 'Fundación Panorama de Colores — Entidad Sin Ánimo de Lucro para la Niñez y la Familia',
  nit: '901456789-3',
  direccion: 'Carrera 7F # 16H-10, Barrio Panorama, Comuna 1, Yumbo, Valle del Cauca, Colombia',
  telefono: '6026951234',
  nombreRepLegal: 'María Alejandra Castillo Hurtado de Mendoza',
  tipoDocRep: 'CC',
  documentoRep: '1144087263',
  cargoRep: 'Directora Ejecutiva y Representante Legal Principal',
  firmaRep: PNG_1X1,
  colorSecundario: '#51A432',
  colorGradiente: '#085A9D',
  colorAccento: '#FAA112',
  colorOscuroFondo: '#121212',
  colorOscuroPaper: '#1E1A28',
  colorOscuroSidebar: '#1B1035',
  tagline: 'Transformamos vidas a través del arte, el deporte y la conciencia ambiental en la Comuna 1 de Yumbo',
  mision: WEB_CONTENIDO.quienesSomos.mision,
  vision: WEB_CONTENIDO.quienesSomos.vision,
  emailContacto: 'contacto.fundacionpanoramadecolores@gmail.com',
  sitioWeb: 'https://www.fundacionpanoramadecolores.org/quienes-somos/transparencia',
  mensajeBienvenida: 'Bienvenido al panel administrativo de la Fundación Panorama de Colores. Recuerda proteger los datos personales de los niños, niñas y sus familias conforme a la Ley 1581 de 2012.',
  footerTexto: '© 2026 Fundación Panorama de Colores · NIT 901.456.789-3 · Carrera 7F # 16H-10, Yumbo, Valle del Cauca',
  webContenido: JSON.stringify(WEB_CONTENIDO),
  smtpHost: 'smtp.office365.com.correo-institucional.fundacionpanoramadecolores.org',
  smtpPuerto: 587,
  smtpUsuario: 'notificaciones.donaciones@fundacionpanoramadecolores.org',
  smtpClaveGuardada: true,
  smtpDeNombre: 'Fundación Panorama de Colores — Área de Donaciones y Certificados',
  smtpDeEmail: 'certificados.donaciones@fundacionpanoramadecolores.org',
  smtpSsl: true,
};

// ConfiguracionContext.actualizar: colores + textos públicos (compatible con CONFIG_PUBLICA)
const CONFIG_PUBLICA_C = {
  ...CONFIG_PUBLICA,
  colorSecundario: CONFIGURACION.colorSecundario,
  colorGradiente: CONFIGURACION.colorGradiente,
  colorAccento: CONFIGURACION.colorAccento,
  colorOscuroFondo: CONFIGURACION.colorOscuroFondo,
  colorOscuroPaper: CONFIGURACION.colorOscuroPaper,
  colorOscuroSidebar: CONFIGURACION.colorOscuroSidebar,
  nit: CONFIGURACION.nit,
  direccion: CONFIGURACION.direccion,
  telefono: CONFIGURACION.telefono,
  tagline: CONFIGURACION.tagline,
  mision: CONFIGURACION.mision,
  vision: CONFIGURACION.vision,
  emailContacto: CONFIGURACION.emailContacto,
  sitioWeb: CONFIGURACION.sitioWeb,
  mensajeBienvenida: CONFIGURACION.mensajeBienvenida,
  footerTexto: CONFIGURACION.footerTexto,
};

// ── Seguridad ─────────────────────────────────────────────────────────────────

const TIPOS_AUDITORIA = [
  'beneficiario', 'donacion', 'donante', 'inventario_item', 'inventario_movimiento', 'inventario_transferencia',
  'contabilidad_cuenta', 'contabilidad_movimiento', 'contabilidad_presupuesto', 'contabilidad_arqueo',
  'nomina_periodo', 'nomina_liquidacion',
];

// TabAuditoria: { datos: [{ id, fecha, entidadTipo, entidadId, entidadNombre, accion, usuarioEmail, detalle }], total, pagina }
const EVENTOS_AUDITORIA = [
  { id: 'aud-0001', fecha: '2026-11-06T17:42:10', entidadTipo: 'nomina_liquidacion', entidadId: '7f3c2a10-5b9e-4c1d-9a8e-2b6f4d1e0c77',
    entidadNombre: 'Liquidación Octubre 2026 — Luisa Fernanda Ospina Valderrama', accion: 'auto-liquidado',
    usuarioEmail: 'maria.alejandra.castillo.hurtado@fundacionpanoramadecolores.org',
    detalle: 'Se liquidaron automáticamente 5 empleados activos con salario registrado; neto total $19.873.450' },
  { id: 'aud-0002', fecha: '2026-11-05T09:15:33', entidadTipo: 'donacion', entidadId: '0a9b8c7d-6e5f-4a3b-2c1d-0e9f8a7b6c5d',
    entidadNombre: 'Donación de Fundación Empresarial Cartón de Colombia Smurfit Westrock', accion: 'creado',
    usuarioEmail: 'carlos.valencia.saavedra.contabilidad@outlook.com',
    detalle: 'Monto $50.000.000 COP — transferencia bancaria con certificado de donación solicitado' },
  { id: 'aud-0003', fecha: '2026-11-04T14:03:51', entidadTipo: 'beneficiario', entidadId: '5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a',
    entidadNombre: null, accion: 'editado', usuarioEmail: 'luisa.ospina.valderrama.coordinacion@fundacionpanoramadecolores.org',
    detalle: 'Cambió EPS, dirección de residencia, talla de camisa y acudiente responsable' },
  { id: 'aud-0004', fecha: '2026-11-03T11:27:08', entidadTipo: 'inventario_transferencia', entidadId: '9e8d7c6b-5a4f-4e3d-2c1b-0a9f8e7d6c5b',
    entidadNombre: 'Transferencia de 40 kits de aseo personal a Sede Comunitaria Las Américas', accion: 'transferencia',
    usuarioEmail: 'ana.admin@example.org', detalle: 'Desde Sede Principal Barrio Panorama — Comuna 1 de Yumbo' },
  { id: 'aud-0005', fecha: '2026-11-01T08:00:00', entidadTipo: 'contabilidad_movimiento', entidadId: '3b2a1f0e-9d8c-4b7a-6f5e-4d3c2b1a0f9e',
    entidadNombre: 'Pago honorarios revisoría fiscal octubre', accion: 'anulado',
    usuarioEmail: 'carlos.valencia.saavedra.contabilidad@outlook.com', detalle: 'Anulado por doble registro del comprobante de egreso CE-2026-0457' },
];

const TODO = ['ver', 'crear', 'editar', 'eliminar', 'exportar', 'autorizar'];
// SeguridadPage: [{ rol, permisos: { modulo: [acciones] } }]
const PERMISOS_ROLES = [
  { rol: 'representante_legal', permisos: {
    dashboard: ['ver'], beneficiarios: ['ver', 'exportar'], donantes: ['ver', 'crear', 'editar'], donaciones: TODO,
    programas: ['ver', 'crear', 'editar', 'autorizar'], inscripciones: ['ver'], sedes: ['ver'], actividades: ['ver'],
    voluntarios: ['ver'], talento_humano: ['ver', 'crear', 'editar'], contabilidad: ['ver', 'exportar'],
    inventario: ['ver'], reportes: ['ver', 'exportar'], documentos: ['ver', 'crear'], log_descargas: ['ver'],
    configuracion: ['ver', 'editar'], seguridad: ['ver'],
  } },
  { rol: 'sistemas', permisos: { dashboard: ['ver'], configuracion: ['ver', 'editar'], seguridad: ['ver', 'editar'], log_descargas: ['ver'] } },
  { rol: 'coordinador_programas', permisos: {
    dashboard: ['ver'], beneficiarios: ['ver', 'crear', 'editar', 'exportar'], programas: ['ver', 'crear', 'editar'],
    inscripciones: ['ver', 'crear', 'editar', 'eliminar'], actividades: ['ver', 'crear', 'editar', 'eliminar'], reportes: ['ver'],
  } },
  { rol: 'trabajador_social', permisos: { dashboard: ['ver'], beneficiarios: ['ver', 'crear', 'editar'], inscripciones: ['ver', 'crear'], actividades: ['ver'] } },
  { rol: 'tesorero', permisos: { dashboard: ['ver'], donantes: ['ver', 'crear', 'editar'], donaciones: ['ver', 'crear', 'editar', 'exportar'], contabilidad: ['ver', 'crear'] } },
  { rol: 'contador', permisos: { dashboard: ['ver'], contabilidad: ['ver', 'crear', 'editar', 'eliminar', 'exportar'], reportes: ['ver', 'exportar'], talento_humano: ['ver'] } },
  { rol: 'secretario', permisos: { dashboard: ['ver'], documentos: ['ver', 'crear', 'editar'], beneficiarios: ['ver'] } },
  { rol: 'talento_humano', permisos: { dashboard: ['ver'], talento_humano: ['ver', 'crear', 'editar', 'eliminar'], voluntarios: ['ver', 'crear', 'editar'] } },
  { rol: 'auditor', permisos: Object.fromEntries(['dashboard', 'beneficiarios', 'donantes', 'donaciones', 'programas', 'inscripciones',
    'sedes', 'actividades', 'voluntarios', 'talento_humano', 'contabilidad', 'inventario', 'reportes', 'documentos',
    'log_descargas', 'configuracion', 'seguridad'].map(m => [m, ['ver']])) },
];

// ── Equipo ────────────────────────────────────────────────────────────────────

// EquipoPage: [{ id, email, nombre, rol, activo, fechaCreacion }]
const EQUIPO = [
  { id: 1, email: 'ana.admin@example.org', nombre: 'Ana Prueba', rol: 'administrador', activo: true, fechaCreacion: '2026-01-05T13:00:00Z' },
  { id: 2, email: 'maria.alejandra.castillo.hurtado@fundacionpanoramadecolores.org', nombre: 'María Alejandra Castillo Hurtado de Mendoza',
    rol: 'representante_legal', activo: true, fechaCreacion: '2026-01-12T15:30:00Z' },
  { id: 3, email: 'luisa.ospina.valderrama.coordinacion@fundacionpanoramadecolores.org', nombre: 'Luisa Fernanda Ospina Valderrama',
    rol: 'coordinador_programas', activo: true, fechaCreacion: '2026-02-01T14:10:00Z' },
  { id: 4, email: 'carlos.valencia.saavedra.contabilidad@outlook.com', nombre: 'Carlos Andrés Valencia Saavedra',
    rol: 'contador', activo: true, fechaCreacion: '2026-05-04T16:45:00Z' },
  { id: 5, email: 'voluntario.sistemas.temporal.2026@gmail.com', nombre: null, rol: 'auditor', activo: false, fechaCreacion: '2026-08-19T20:05:00Z' },
];

// ── Registro de mocks ─────────────────────────────────────────────────────────

export function registrar(api) {
  // Layout, login y dashboard
  api.on('GET', '/api/configuracion/publica', CONFIG_PUBLICA_C);
  api.on('GET', '/api/alertas', ALERTAS);
  api.on('GET', '/api/beneficiarios/stats-ninos', STATS_NINOS_C);
  compartido(api, 'GET', '/api/inventario/stats', { totalItems: 342, stockBajo: 6, sinStock: 4, categorias: 8, stockTotal: 12875 });
  compartido(api, 'GET', '/api/inventario/comodatos-proximos', [
    { id: 701, itemNombre: 'Computador portátil Lenovo ThinkPad E14 para sala de sistemas', comodante: 'Cooperativa Multiactiva de Trabajadores del Valle', fechaFin: '2026-11-25', cantidad: 4 },
    { id: 702, itemNombre: 'Video beam Epson PowerLite con telón retráctil', comodante: 'Rotary Club Cali Occidente', fechaFin: '2026-12-02', cantidad: 1 },
  ]);
  compartido(api, 'GET', '/api/sedes', SEDES);

  // Talento humano (genéricos primero: el último registrado tiene prioridad)
  // Paginado: { data, total, pagina, porPagina } (filtros activo / buscar)
  api.on('GET', '/api/talento-humano', ({ url }) => {
    const p      = url.searchParams;
    const activo = p.get('activo');
    const q      = (p.get('buscar') ?? '').toLowerCase();
    const lista = EMPLEADOS.filter(e =>
      (activo === null || String(e.activo) === activo) &&
      (!q || `${e.nombres} ${e.apellidos} ${e.cargo ?? ''} ${e.area ?? ''} ${e.numeroDocumento ?? ''}`.toLowerCase().includes(q)));
    const pagina    = Number(p.get('pagina')) || 1;
    const porPagina = Number(p.get('porPagina')) || 20;
    return { json: { data: lista.slice((pagina - 1) * porPagina, pagina * porPagina), total: lista.length, pagina, porPagina } };
  });
  api.on('GET', /^\/api\/talento-humano\/[^/]+$/, ({ url }) => {
    const id = Number(url.pathname.split('/').pop());
    const emp = EMPLEADOS.find(e => e.id === id);
    return emp ? { json: emp } : { status: 404, json: { mensaje: 'Empleado no encontrado' } };
  });
  api.on('GET', /^\/api\/talento-humano\/[^/]+\/novedades$/, ({ url }) => ({
    json: novedadesDe(Number(url.pathname.split('/')[3]) || 201),
  }));
  api.on('GET', '/api/talento-humano/stats', STATS_TH);

  // Organigrama
  api.on('GET', '/api/organigrama', ORGANIGRAMA);

  // Nómina
  api.on('GET', '/api/nomina/periodos', ({ url }) => ({
    json: periodosDe(Number(url.searchParams.get('anio')) || 2026),
  }));
  api.on('GET', /^\/api\/nomina\/periodos\/\d+$/, ({ url }) => {
    const id = Number(url.pathname.split('/').pop());
    const p = periodosDe(Math.floor(id / 100)).find(x => x.id === id) ?? periodosDe(2026)[0];
    return { json: p };
  });
  api.on('GET', /^\/api\/nomina\/periodos\/\d+\/liquidaciones$/, ({ url }) => ({
    json: liquidacionesDe(Number(url.pathname.split('/')[4])),
  }));

  // Reportes
  api.on('GET', '/api/reportes/beneficiarios', ({ url }) => ({ json: reporteBeneficiarios(Number(url.searchParams.get('anio')) || 2026) }));
  api.on('GET', '/api/reportes/programas', REPORTE_PROGRAMAS);
  api.on('GET', '/api/reportes/inventario', REPORTE_INVENTARIO);
  api.on('GET', '/api/reportes/actividades', ({ url }) => ({ json: reporteActividades(Number(url.searchParams.get('anio')) || 2026) }));
  api.on('GET', '/api/reportes/donaciones', ({ url }) => ({ json: reporteDonaciones(Number(url.searchParams.get('anio')) || 2026) }));
  compartido(api, 'GET', '/api/contabilidad/reporte', ({ url }) => ({
    json: reporteContable(Number(url.searchParams.get('mes')) || 10, Number(url.searchParams.get('anio')) || 2026),
  }));

  // Configuración
  api.on('GET', '/api/configuracion', CONFIGURACION);

  // Seguridad
  api.on('GET', '/api/permisos/roles', PERMISOS_ROLES);
  api.on('GET', '/api/auditoria/tipos', TIPOS_AUDITORIA);
  api.on('GET', '/api/auditoria', ({ url }) => {
    const p = url.searchParams;
    const tipo = p.get('tipo'), accion = p.get('accion'), usuario = (p.get('usuario') ?? '').toLowerCase();
    const filtrados = EVENTOS_AUDITORIA.filter(ev =>
      (!tipo || ev.entidadTipo === tipo) && (!accion || ev.accion === accion) &&
      (!usuario || (ev.usuarioEmail ?? '').toLowerCase().includes(usuario)));
    const hayFiltros = tipo || accion || usuario || p.get('desde') || p.get('hasta');
    // Sin filtros se simula un historial largo (137 eventos → 3 páginas de 50)
    return { json: { datos: filtrados, total: hayFiltros ? filtrados.length : 137, pagina: Number(p.get('pagina')) || 1, tamano: Number(p.get('tamano')) || 50 } };
  });

  // Equipo
  api.on('GET', '/api/equipo', EQUIPO);
}

// ── Rutas y diálogos para la auditoría ───────────────────────────────────────

export const RUTAS_C = [
  { nombre: 'Acceso (login)', hash: '#/acceso', sinSesion: true },
  { nombre: 'Dashboard', hash: '#/sede' },
  { nombre: 'Talento humano', hash: '#/sede/talento-humano', tabs: ['Empleados', 'Organigrama', 'Nómina'] },
  { nombre: 'Organigrama', hash: '#/sede/organigrama' },
  { nombre: 'Reportes', hash: '#/sede/reportes',
    tabs: ['Beneficiarios', 'Programas', 'Inventario', 'Actividades', 'Donaciones', 'Contabilidad ESAL'] },
  { nombre: 'Configuración', hash: '#/sede/configuracion',
    tabs: ['Fundación', 'Representante Legal', 'Apariencia', 'Textos admin', 'Página Web', 'Correo'] },
  { nombre: 'Seguridad', hash: '#/sede/seguridad', tabs: ['Permisos', 'Auditoría', 'Almacenamiento'] },
  { nombre: 'Equipo', hash: '#/sede/equipo' },
];

const visible = async (page) => { await page.getByRole('dialog').first().waitFor(); };
const EMPLEADO_1 = `${EMPLEADOS[0].nombres} ${EMPLEADOS[0].apellidos}`;

export const DIALOGOS_C = [
  { nombre: 'Talento humano — Nuevo empleado', hash: '#/sede/talento-humano', abrir: async (page) => {
    await page.getByRole('button', { name: 'Nuevo empleado' }).click();
    await visible(page);
  } },
  { nombre: 'Talento humano — Editar empleado', hash: '#/sede/talento-humano', abrir: async (page) => {
    await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
    await visible(page);
  } },
  { nombre: 'Talento humano — Nueva novedad', hash: '#/sede/talento-humano', abrir: async (page) => {
    // El detalle del empleado es un panel en línea (no un diálogo); desde su pestaña Novedades se abre el diálogo
    await page.getByText(EMPLEADO_1, { exact: true }).first().click();
    await page.getByRole('tab', { name: 'Novedades' }).click();
    await page.getByRole('button', { name: 'Nueva novedad' }).click();
    await visible(page);
  } },
  { nombre: 'Talento humano — Nuevo período de nómina', hash: '#/sede/talento-humano', abrir: async (page) => {
    await page.getByRole('tab', { name: 'Nómina' }).click();
    await page.getByRole('button', { name: 'Nuevo período' }).click();
    await visible(page);
  } },
  { nombre: 'Talento humano — Confirmar auto-liquidación', hash: '#/sede/talento-humano', abrir: async (page) => {
    await page.getByRole('tab', { name: 'Nómina' }).click();
    await page.getByRole('button', { name: 'Auto-liquidar empleados' }).first().click();
    await visible(page);
  } },
  { nombre: 'Talento humano — Editar liquidación de nómina', hash: '#/sede/talento-humano', abrir: async (page) => {
    await page.getByRole('tab', { name: 'Nómina' }).click();
    // El período en borrador (Octubre) es el primero; al expandirlo se ven sus liquidaciones
    await page.getByText(/^Octubre \d{4}$/).first().click();
    await page.getByRole('button', { name: 'Editar liquidación' }).first().click();
    await visible(page);
  } },
  { nombre: 'Talento humano — Agregar persona al organigrama', hash: '#/sede/talento-humano', abrir: async (page) => {
    await page.getByRole('tab', { name: 'Organigrama' }).click();
    await page.getByRole('button', { name: 'Agregar persona' }).click();
    await visible(page);
  } },
  { nombre: 'Organigrama — Agregar persona', hash: '#/sede/organigrama', abrir: async (page) => {
    await page.getByRole('button', { name: 'Agregar persona' }).click();
    await visible(page);
  } },
  { nombre: 'Organigrama — Editar persona', hash: '#/sede/organigrama', abrir: async (page) => {
    // El lápiz de cada tarjeta no tiene etiqueta: se ubica por el ícono de MUI
    await page.locator('button:has(svg[data-testid="EditIcon"])').first().click();
    await visible(page);
  } },
  { nombre: 'Equipo — Agregar usuario', hash: '#/sede/equipo', abrir: async (page) => {
    await page.getByRole('button', { name: 'Agregar usuario' }).click();
    await visible(page);
  } },
  { nombre: 'Equipo — Editar usuario', hash: '#/sede/equipo', abrir: async (page) => {
    await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
    await visible(page);
  } },
];

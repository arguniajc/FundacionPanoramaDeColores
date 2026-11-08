export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function fmtCOP(n) {
  return Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

/**
 * Salario devengado en el período (proporcional a los días). salarioBase guarda el
 * salario MENSUAL; el del período se deduce de los totales guardados, así coincide al peso.
 */
export const salarioPeriodo = l =>
  Number(l?.totalDevengado ?? 0) - Number(l?.auxilioTransporte ?? 0)
  - Number(l?.horasExtras ?? 0) - Number(l?.bonificaciones ?? 0);

/**
 * Valores por defecto de los parámetros de nómina (ParametrosNomina.Predeterminados del servidor).
 * Los vigentes se guardan en Configuración → Nómina y llegan por GET /api/nomina/parametros;
 * estos solo se usan mientras cargan o si no se pudieron leer. Tasas como fracción (0.04 = 4 %).
 */
export const PARAMETROS_NOMINA_DEFECTO = Object.freeze({
  smlmv: 1_423_500, auxilioTransporte: 200_000, tasaSalud: 0.04, tasaPension: 0.04,
});

const num = v => Number(v) || 0;

/** Completa los parámetros que falten (o no sean números válidos) con los valores por defecto. */
export function normalizarParametrosNomina(p) {
  const d = PARAMETROS_NOMINA_DEFECTO;
  const valor = (x, def) => (x === null || x === undefined || x === '' || Number.isNaN(Number(x)) ? def : Number(x));
  return {
    smlmv:             valor(p?.smlmv, d.smlmv),
    auxilioTransporte: valor(p?.auxilioTransporte, d.auxilioTransporte),
    tasaSalud:         valor(p?.tasaSalud, d.tasaSalud),
    tasaPension:       valor(p?.tasaPension, d.tasaPension),
  };
}

/** 0.04 → "4 %" (para las etiquetas de la vista previa). */
export const fmtPorcentaje = tasa =>
  `${(Math.round(num(tasa) * 10000) / 100).toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`;

/**
 * Vista previa de una liquidación con la misma fórmula que el servidor (CalculoNomina.cs):
 * salario y auxilio proporcionales a los días (mes de 30); auxilio si el salario MENSUAL
 * es de hasta 2 SMLMV. Recibe los valores del formulario (texto o número) y los parámetros
 * vigentes (SMLMV, auxilio y tasas de la configuración); sin ellos usa los valores por defecto.
 */
export function calcularLiquidacion(f, parametros = PARAMETROS_NOMINA_DEFECTO) {
  const p         = normalizarParametrosNomina(parametros);
  const mensual   = num(f.salario);
  const dias      = Math.min(Math.max(num(f.diasTrabajados), 0), 30);
  const salario   = Math.round(mensual * dias / 30);
  const aux       = mensual <= 2 * p.smlmv ? Math.round(p.auxilioTransporte * dias / 30) : 0;
  const salud     = Math.round(salario * p.tasaSalud);
  const pension   = Math.round(salario * p.tasaPension);
  const devengado = salario + aux + num(f.horasExtras) + num(f.bonificaciones);
  const deduccion = salud + pension + num(f.retencionFuente) + num(f.otrasDeducciones);
  return { salario, aux, salud, pension, devengado, deduccion, neto: devengado - deduccion };
}

/** "Octubre 2026" */
export const nombrePeriodo = p => `${MESES[(p?.mes ?? 1) - 1]} ${p?.anio ?? ''}`.trim();

/**
 * Mensaje tras auto-liquidar: el servidor solo crea las liquidaciones que faltan y no modifica las
 * existentes (pueden tener días y novedades editados a mano).
 */
export function mensajeAutoLiquidacion(antes, despues) {
  const nuevas = Math.max(0, (despues ?? 0) - (antes ?? 0));
  if (nuevas === 0) return 'No había empleados por liquidar: las liquidaciones existentes no se modificaron.';
  const n = nuevas === 1 ? '1 liquidación nueva' : `${nuevas} liquidaciones nuevas`;
  if (!antes) return `${n}.`;
  return antes === 1 ? `${n}. La existente no se modificó.` : `${n}. Las ${antes} existentes no se modificaron.`;
}

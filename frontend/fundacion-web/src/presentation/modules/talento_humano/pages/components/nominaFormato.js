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

// Mismos valores que NominaConstants del servidor: solo para la vista previa, el servidor recalcula.
const SMLMV = 1_423_500;
const AUXILIO_TRANSPORTE = 200_000;
const TASA_SALUD = 0.04;
const TASA_PENSION = 0.04;

const num = v => Number(v) || 0;

/**
 * Vista previa de una liquidación con la misma fórmula que el servidor (CalculoNomina.cs):
 * salario y auxilio proporcionales a los días (mes de 30); auxilio si el salario MENSUAL
 * es de hasta 2 SMLMV. Recibe los valores del formulario (texto o número).
 */
export function calcularLiquidacion(f) {
  const mensual   = num(f.salario);
  const dias      = Math.min(Math.max(num(f.diasTrabajados), 0), 30);
  const salario   = Math.round(mensual * dias / 30);
  const aux       = mensual <= 2 * SMLMV ? Math.round(AUXILIO_TRANSPORTE * dias / 30) : 0;
  const salud     = Math.round(salario * TASA_SALUD);
  const pension   = Math.round(salario * TASA_PENSION);
  const devengado = salario + aux + num(f.horasExtras) + num(f.bonificaciones);
  const deduccion = salud + pension + num(f.retencionFuente) + num(f.otrasDeducciones);
  return { salario, aux, salud, pension, devengado, deduccion, neto: devengado - deduccion };
}

/** "Octubre 2026" */
export const nombrePeriodo = p => `${MESES[(p?.mes ?? 1) - 1]} ${p?.anio ?? ''}`.trim();

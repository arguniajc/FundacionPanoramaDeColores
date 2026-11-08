export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function fmtCOP(n) {
  return Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

/** "Octubre 2026" */
export const nombrePeriodo = p => `${MESES[(p?.mes ?? 1) - 1]} ${p?.anio ?? ''}`.trim();

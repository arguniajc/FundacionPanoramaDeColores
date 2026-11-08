import { UNIDADES_MEDIDA, CATEGORIAS_INVENTARIO } from '@/shared/utils/geodata';
export { UNIDADES_MEDIDA as UNIDADES };
export { CATEGORIAS_INVENTARIO as CATEGORIAS };

export const COLOR = 'var(--color-primario)';

export const CAT_COLOR = {
  'Material escolar':    '#7c3aed',
  'Equipos electrónicos':'#0ea5e9',
  'Deportivo':           '#16a34a',
  'Ropa y calzado':      '#d97706',
  'Alimentos':           '#dc2626',
  'Medicamentos':        '#db2777',
  'Muebles y enseres':   '#64748b',
  'Herramientas':        '#A16207',
  'Otros':               '#6b7280',
};

export function fmtNum(n) {
  const v = Number(n);
  return v % 1 === 0 ? v.toLocaleString('es-CO') : v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function fmtFecha(d) {
  return new Date(d).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}
export function estadoStock(item) {
  if (item.stockActual <= 0)
    return { label: 'Sin stock', color: 'error', pct: 0 };
  if (item.stockMinimo > 0 && item.stockActual < item.stockMinimo)
    return { label: 'Stock bajo', color: 'warning', pct: Math.min(99, (item.stockActual / item.stockMinimo) * 100) };
  return {
    label: 'En stock', color: 'success',
    pct: item.stockMinimo > 0 ? Math.min(100, (item.stockActual / (item.stockMinimo * 2)) * 100) : 100,
  };
}

/**
 * Cantidad escrita en un campo type="text" (teclado numérico): deja solo dígitos y, si se
 * permiten decimales, un punto (la coma se toma como punto). '12,5' → '12.5'; 'abc3' → '3'.
 */
export function limpiarCantidad(texto, { decimales = true } = {}) {
  let s = String(texto ?? '').replace(/,/g, '.').replace(decimales ? /[^\d.]/g : /\D/g, '');
  const punto = s.indexOf('.');
  if (punto >= 0) s = s.slice(0, punto + 1) + s.slice(punto + 1).replace(/\./g, '');
  return s;
}

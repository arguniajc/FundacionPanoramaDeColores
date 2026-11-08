import { fechaLocalISO } from '@/shared/utils/fecha';
export const COLOR_DONANTES   = 'var(--color-secundario)';
export const COLOR_DONACIONES = '#d97706';
export const COLOR_ESPECIE    = '#0ea5e9';

export function fmtMoney(n) {
  return Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}
export function fmtFecha(d) {
  return new Date(d).toLocaleDateString('es-CO', { dateStyle: 'medium' });
}
// Fecha local (no UTC): ver fechaLocalISO
export function hoy() {
  return fechaLocalISO();
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

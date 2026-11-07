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

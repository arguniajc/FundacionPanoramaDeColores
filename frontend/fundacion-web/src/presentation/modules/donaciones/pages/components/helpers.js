export const COLOR_DONANTES   = 'var(--color-secundario)';
export const COLOR_DONACIONES = '#d97706';
export const COLOR_ESPECIE    = '#0ea5e9';

export function fmtMoney(n) {
  return Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}
export function fmtFecha(d) {
  return new Date(d).toLocaleDateString('es-CO', { dateStyle: 'medium' });
}
export function hoy() {
  return new Date().toISOString().slice(0, 10);
}

import { fechaLocalISO } from '@/shared/utils/fecha';

export const fmt = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v ?? 0);

export const fmtFecha = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

// Fecha local (no UTC): ver fechaLocalISO
export const hoy = () => fechaLocalISO();

export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const ANIOS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

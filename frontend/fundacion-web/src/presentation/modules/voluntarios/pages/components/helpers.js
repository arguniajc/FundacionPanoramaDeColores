import { fechaLocalISO } from '@/shared/utils/fecha';

export const COLOR = 'var(--color-primario)';

export function fmtFecha(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('es-CO', { dateStyle: 'medium' });
}

export function toInputDate(d) {
  if (!d) return '';
  // 'AAAA-MM-DD…' ya trae la fecha; con fecha y hora se usa el día local (no UTC)
  return /^\d{4}-\d{2}-\d{2}/.test(String(d)) ? String(d).slice(0, 10) : fechaLocalISO(new Date(d));
}

export const VACIO_VOL = {
  nombre: '', tipoDocumento: '', documento: '', email: '', telefono: '',
  pais: 'Colombia', departamento: '', ciudad: '',
  fechaNacimiento: '', fechaInicio: '', profesion: '', notas: '',
};

export const FORM_VACIO_ASIG = { sedeId: '', programaId: '', horasSemanales: '', fechaInicio: '' };

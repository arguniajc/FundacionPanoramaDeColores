export const COLOR = 'var(--color-primario)';

export function fmtFecha(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('es-CO', { dateStyle: 'medium' });
}

export function toInputDate(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

export const VACIO_VOL = {
  nombre: '', tipoDocumento: '', documento: '', email: '', telefono: '',
  ciudad: '', fechaNacimiento: '', fechaInicio: '', profesion: '', notas: '',
};

export const FORM_VACIO_ASIG = { sedeId: '', programaId: '', horasSemanales: '', fechaInicio: '' };

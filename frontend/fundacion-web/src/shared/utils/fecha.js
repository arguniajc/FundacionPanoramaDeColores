export function calcularEdad(fechaNac) {
  if (!fechaNac) return '—';
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return `${edad} años`;
}

/**
 * Fecha local en formato 'AAAA-MM-DD' (por defecto, hoy).
 * No usar toISOString() para esto: convierte a UTC y en Colombia (UTC-5)
 * después de las 7 p. m. devuelve el día siguiente.
 */
export function fechaLocalISO(d = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Convierte 'AAAA-MM-DD' en una fecha local, o null si no existe.
 * new Date('2026-02-30') no falla: se corre en silencio al 2 de marzo.
 */
export function parsearFechaISO(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto ?? ''));
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(anio, mes - 1, dia);
  return d.getFullYear() === anio && d.getMonth() === mes - 1 && d.getDate() === dia ? d : null;
}

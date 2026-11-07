export const COLOR = 'var(--color-primario)';

export const ESTADOS = [
  { value: 'activa',     label: 'Activa',     color: 'success' },
  { value: 'suspendida', label: 'Suspendida', color: 'warning' },
  { value: 'completada', label: 'Completada', color: 'info'    },
  { value: 'baja',       label: 'Baja',       color: 'error'   },
];

export function calcEdad(fechaNac) {
  if (!fechaNac) return null;
  const nac = new Date(fechaNac + 'T00:00:00');
  const hoy = new Date();
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
  return e;
}

export function fmtFechaCorta(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

export function agruparPorSeccion(campos) {
  const orden = [];
  const mapa  = new Map();
  for (const c of campos) {
    const sec = c.seccion?.trim() || '';
    if (!mapa.has(sec)) { mapa.set(sec, []); orden.push(sec); }
    mapa.get(sec).push(c);
  }
  return orden.map(sec => ({ seccion: sec, campos: mapa.get(sec) }));
}

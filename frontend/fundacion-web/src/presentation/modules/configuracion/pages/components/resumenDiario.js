/** 7 → "7:00 a. m.", 0 → "12:00 a. m.", 13 → "1:00 p. m." */
export function etiquetaHora(h) {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

/** "2026-11-07" → "07/11/2026" (sin pasar por Date para no correr el día por zona horaria). */
export function formatoFechaISO(iso) {
  const [a, m, d] = String(iso ?? '').split('-');
  return d && m && a ? `${d}/${m}/${a}` : String(iso ?? '');
}

/**
 * sessionCache
 * Caché de sesión para la lista de beneficiarios.
 * Estrategia stale-while-revalidate: sirve datos cacheados inmediatamente
 * y los refresca en segundo plano. TTL de 2 minutos.
 * Se invalida manualmente al crear, editar o cambiar estado de un beneficiario.
 */
const PREFIX = 'ben_';
const TTL_MS = 2 * 60 * 1000;

export const cacheKey = (estado, pagina, buscar) =>
  `${PREFIX}${estado}_${pagina}_${buscar ?? ''}`;

export function leerCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, total, ts } = JSON.parse(raw);
    return Date.now() - ts < TTL_MS ? { data, total } : null;
  } catch {
    return null;
  }
}

export function escribirCache(key, data, total) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, total, ts: Date.now() }));
  } catch { /* sessionStorage llena — se ignora silenciosamente */ }
}

export function limpiarCache() {
  Object.keys(sessionStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(k => sessionStorage.removeItem(k));
}

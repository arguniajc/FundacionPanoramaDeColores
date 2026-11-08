// Borrador de "Nueva inscripción" en sessionStorage, por beneficiario + programa.
// Si se cierra el diálogo (o se recarga la pestaña) a mitad del formulario, al volver a elegir
// el mismo beneficiario y programa se recupera lo escrito. Se borra al inscribir con éxito.
// Todo acceso a sessionStorage va en try/catch (modo privado, almacenamiento lleno o bloqueado).
//
//   guardarBorrador(benefId, progId, { datos, panelActivo, observaciones });
//   leerBorrador(benefId, progId);   // → { datos, panelActivo, observaciones } | null
//   borrarBorrador(benefId, progId);
import { hayCambiosEn } from '@/shared/utils/cierreDialogo';

export const claveBorrador = (beneficiarioId, programaId) =>
  `inscripcion-borrador:${beneficiarioId}:${programaId}`;

// Claves de firma (imágenes dataURL que pueden ser grandes)
const esFirma = (clave, valor) => clave === '__firma_padre__' || (typeof valor === 'string' && valor.startsWith('data:image/'));

/** Guarda el borrador; si no cabe con las firmas, lo intenta sin ellas. Devuelve true si quedó guardado. */
export function guardarBorrador(beneficiarioId, programaId, borrador) {
  const clave = claveBorrador(beneficiarioId, programaId);
  try {
    sessionStorage.setItem(clave, JSON.stringify(borrador));
    return true;
  } catch {
    try {
      const datos = Object.fromEntries(Object.entries(borrador.datos ?? {}).filter(([k, v]) => !esFirma(k, v)));
      sessionStorage.setItem(clave, JSON.stringify({ ...borrador, datos }));
      return true;
    } catch { return false; /* sin almacenamiento disponible: no hay borrador */ }
  }
}

/** Lee el borrador (null si no hay o está dañado). */
export function leerBorrador(beneficiarioId, programaId) {
  try {
    const raw = sessionStorage.getItem(claveBorrador(beneficiarioId, programaId));
    if (!raw) return null;
    const b = JSON.parse(raw);
    return b && typeof b === 'object' && b.datos && typeof b.datos === 'object' ? b : null;
  } catch { return null; /* borrador ilegible o sessionStorage bloqueado */ }
}

export function borrarBorrador(beneficiarioId, programaId) {
  try { sessionStorage.removeItem(claveBorrador(beneficiarioId, programaId)); } catch { /* sin almacenamiento */ }
}

/**
 * true si en el formulario hay algo escrito por la persona (no solo lo auto-completado).
 * Ignora "¿Quién firma?" que se elige solo cuando hay un único responsable.
 */
export function hayContenidoPropio(datos, datosIniciales, observaciones = '') {
  if (String(observaciones ?? '').trim()) return true;
  const { __firma_meta__: meta, ...resto } = datos ?? {};
  const { __firma_meta__: _ignorado, ...restoInicial } = datosIniciales ?? {};
  if (hayCambiosEn(resto, restoInicial)) return true;
  try {
    const m = JSON.parse(meta || '{}');
    return !!(String(m.nombre ?? '').trim() || String(m.documento ?? '').trim());
  } catch { return false; }
}

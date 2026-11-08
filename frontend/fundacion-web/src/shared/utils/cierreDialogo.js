/**
 * Lógica pura del cierre de diálogos con formulario (la usa useCerrarConCambios). Sin React.
 *
 *   accionAlCerrar({ hayCambios: false, bloqueado: false }) // → 'cerrar'
 *   accionAlCerrar({ hayCambios: true })                    // → 'confirmar'  (preguntar antes)
 *   accionAlCerrar({ bloqueado: true, reason: 'backdropClick' }) // → 'ignorar' (está guardando)
 *
 *   hayCambiosEn({ nombre: 'Ana ' }, { nombre: 'Ana' })     // → false (ignora espacios de los extremos)
 */

/** Textos del diálogo de confirmación. */
export const TEXTOS_DESCARTAR = Object.freeze({
  titulo:         '¿Descartar los cambios?',
  mensaje:        'Hay datos que no se han guardado. Si cierras ahora, se perderán.',
  textoConfirmar: 'Descartar',
  textoCancelar:  'Seguir editando',
});

/**
 * Qué hacer cuando se pide cerrar.
 * @param {{ hayCambios?: boolean, bloqueado?: boolean, reason?: string }} p
 *   reason: el de MUI ('backdropClick' | 'escapeKeyDown') o undefined (botón Cancelar / X).
 * @returns {'cerrar'|'confirmar'|'ignorar'}
 */
export function accionAlCerrar({ hayCambios = false, bloqueado = false } = {}) {
  if (bloqueado)  return 'ignorar';
  if (hayCambios) return 'confirmar';
  return 'cerrar';
}

const normalizar = v => {
  if (typeof v === 'string') return v.trim();
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(normalizar);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    // Archivos/Blobs no se comparan por contenido: cualquier archivo nuevo cuenta como cambio.
    if (typeof Blob !== 'undefined' && v instanceof Blob) return `[archivo ${v.size}]`;
    return Object.fromEntries(Object.keys(v).sort().map(k => [k, normalizar(v[k])]));
  }
  return v;
};

/**
 * true si `actual` difiere de `inicial` (comparación profunda; null, undefined y '' cuentan
 * igual, y se ignoran espacios en los extremos de los textos).
 * Úsalo con un snapshot tomado al abrir:  const hayCambios = hayCambiosEn(form, formInicial);
 */
export function hayCambiosEn(actual, inicial) {
  return JSON.stringify(normalizar(actual)) !== JSON.stringify(normalizar(inicial));
}

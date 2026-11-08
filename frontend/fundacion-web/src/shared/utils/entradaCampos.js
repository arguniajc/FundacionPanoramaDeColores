/**
 * Lógica pura de los campos con formato (CampoMoneda, CampoTelefono). Sin React.
 *
 * Moneda — dos representaciones:
 *   valor LIMPIO  (lo que se guarda en el form y llega a onChange): string con solo dígitos
 *                 y, si se permiten decimales, punto decimal: '1500000', '1500.5', ''.
 *                 Es compatible con r.monto / r.numero y con Number(valor) al enviar.
 *   texto VISIBLE (lo que ve el usuario, es-CO): '1.500.000', '1.500,5'.
 *
 *   limpiarMoneda('1.500.000')                 // → '1500000'
 *   limpiarMoneda('$ 1.500,75', { decimales: 2 }) // → '1500.75'
 *   formatearMoneda('1500000')                 // → '1.500.000'
 *   formatearMoneda(1500.5, { decimales: 2 })  // → '1.500,5'
 */

const agruparMiles = enteros => enteros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/**
 * Texto escrito por el usuario (con puntos de miles, $, espacios, coma decimal) → valor limpio.
 * Con decimales = 0 se descarta todo lo que no sea dígito. Con decimales > 0 la primera coma
 * es el separador decimal y se recortan los decimales sobrantes.
 */
export function limpiarMoneda(texto, { decimales = 0 } = {}) {
  if (texto === null || texto === undefined) return '';
  const s = String(texto);
  let enteros;
  let fraccion;
  if (decimales > 0 && s.includes(',')) {
    const i = s.indexOf(',');
    enteros  = s.slice(0, i).replace(/\D/g, '');
    fraccion = s.slice(i + 1).replace(/\D/g, '').slice(0, decimales);
  } else {
    enteros = s.replace(/\D/g, '');
  }
  enteros = enteros.replace(/^0+(?=\d)/, '');
  if (fraccion === undefined) return enteros;
  return `${enteros || '0'}.${fraccion}`;
}

/** Valor que llega por props (número o string limpio) → string limpio. NaN / null → ''. */
export function aValorLimpio(valor, { decimales = 0 } = {}) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return '';
    return decimales > 0 ? String(Number(valor.toFixed(decimales))) : String(Math.trunc(valor));
  }
  const s = String(valor).trim();
  if (!/^-?\d*(\.\d*)?$/.test(s)) return limpiarMoneda(s, { decimales });
  const [ent, frac] = s.replace(/^-/, '').split('.');
  const enteros = ent.replace(/^0+(?=\d)/, '');
  if (decimales === 0 || frac === undefined) return enteros;
  return `${enteros || '0'}.${frac.slice(0, decimales)}`;
}

/** Valor limpio (o número) → texto visible con puntos de miles y coma decimal. */
export function formatearMoneda(valor, { decimales = 0 } = {}) {
  const limpio = aValorLimpio(valor, { decimales });
  if (limpio === '') return '';
  const [ent, frac] = limpio.split('.');
  const miles = agruparMiles(ent || '0');
  return frac === undefined ? miles : `${miles},${frac}`;
}

/** Cuántos caracteres significativos (dígitos y coma decimal) hay antes de la posición `pos`. */
export function significativosAntes(texto, pos, { decimales = 0 } = {}) {
  const re = decimales > 0 ? /[\d,]/ : /\d/;
  let n = 0;
  for (let i = 0; i < Math.min(pos, texto.length); i++) if (re.test(texto[i])) n++;
  return n;
}

/**
 * Posición del cursor en el texto ya formateado para que quede detrás del mismo número de
 * caracteres significativos que tenía antes de formatear (así el cursor no salta al final).
 *   posicionCursor('1.500.000', 4) // → 5   ('1.500|.000')
 */
export function posicionCursor(textoFormateado, significativos, { decimales = 0 } = {}) {
  if (significativos <= 0) return 0;
  const re = decimales > 0 ? /[\d,]/ : /\d/;
  let n = 0;
  for (let i = 0; i < textoFormateado.length; i++) {
    if (re.test(textoFormateado[i])) n++;
    if (n === significativos) return i + 1;
  }
  return textoFormateado.length;
}

/**
 * Teléfono: deja solo dígitos, espacios, guiones, paréntesis y un '+' inicial (máx. 20 caracteres).
 *   limpiarTelefono('300 123 4567')   // → '300 123 4567'
 *   limpiarTelefono('300-abc-4567')   // → '300--4567'
 *   limpiarTelefono('+57 (300) 1234') // → '+57 (300) 1234'
 */
export function limpiarTelefono(texto) {
  if (texto === null || texto === undefined) return '';
  const s = String(texto);
  const mas = /^\s*\+/.test(s) ? '+' : '';
  const resto = s.replace(/[^\d\s()-]/g, '').replace(/^\s+/, '');
  return (mas + resto).slice(0, 20);
}

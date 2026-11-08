/**
 * Reglas de validación reutilizables para todos los formularios del panel.
 * Cada regla devuelve '' si el valor está bien, o un mensaje que explica qué está mal
 * y cómo llenarlo, con un ejemplo. Sin React, sin MUI — solo lógica.
 *
 * Uso:
 *   const ESQUEMA = {
 *     nombre: { etiqueta: 'Nombre', reglas: [r.obligatorio('Ana Gómez'), r.texto({ min: 3 })] },
 *     email:  { etiqueta: 'Correo', reglas: [r.correo()] },
 *   };
 *   validarEsquema(ESQUEMA, form) // → { campo: mensaje } solo con los que fallan
 */

import { parsearFechaISO } from './fecha';
import { normalizarTipoDocumento, esDocumentoNumerico } from '../constants/tiposDocumento';

// Pesos DIAN del dígito de verificación, aplicados a los dígitos de derecha a izquierda.
const PESOS_DV_NIT = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/**
 * Dígito de verificación (DV) de un NIT según la DIAN (módulo 11).
 * Acepta puntos, espacios o un DV ya escrito (se ignora lo que va después del guion).
 *   calcularDvNit('900123456')     // → 8
 *   calcularDvNit('800.197.268')   // → 4   (DIAN)
 *   calcularDvNit('abc')           // → null (no es un NIT)
 * @returns {number|null}
 */
export function calcularDvNit(nit) {
  if (nit === null || nit === undefined) return null;
  const base = String(nit).split('-')[0].replace(/[\s.]/g, '');
  if (!/^\d{1,15}$/.test(base)) return null;
  let suma = 0;
  for (let i = 0; i < base.length; i++) suma += Number(base[base.length - 1 - i]) * PESOS_DV_NIT[i];
  const residuo = suma % 11;
  return residuo > 1 ? 11 - residuo : residuo;
}

/** NIT con su DV: nitConDv('900123456') → '900123456-8' ('' si no es un NIT). */
export function nitConDv(nit) {
  const base = String(nit ?? '').split('-')[0].replace(/[\s.]/g, '');
  const dv = calcularDvNit(base);
  return dv === null ? '' : `${base}-${dv}`;
}

export const vacio = v => v === null || v === undefined || String(v).trim() === '';
const num = v => (vacio(v) ? NaN : Number(String(v).replace(',', '.')));
const ej  = ejemplo => (ejemplo !== undefined && ejemplo !== '' ? ` Ejemplo: ${ejemplo}` : '');

const LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/;

/** Constructores de reglas: (valor, form) => '' | mensaje */
export const r = {
  /** Campo requerido. */
  obligatorio: (ejemplo) => v => (vacio(v) || v === false ? `Es obligatorio.${ej(ejemplo)}` : ''),

  /** Selección requerida en una lista. */
  seleccion: (ejemplo) => v => (vacio(v) ? `Selecciona una opción.${ej(ejemplo)}` : ''),

  /** Texto libre con largo mínimo/máximo y, opcionalmente, solo letras. */
  texto: ({ min = 0, max = Infinity, soloLetras = false, ejemplo } = {}) => v => {
    if (vacio(v)) return '';
    const s = String(v).trim();
    if (soloLetras && !LETRAS.test(s)) return `Escribe solo letras, sin números ni símbolos.${ej(ejemplo)}`;
    if (s.length < min) return `Debe tener al menos ${min} caracteres.${ej(ejemplo)}`;
    if (s.length > max) return `Debe tener máximo ${max} caracteres.`;
    return '';
  },

  /** Nombre y apellido (al menos dos palabras). */
  nombreCompleto: (ejemplo = 'Ana Gómez') => v => {
    if (vacio(v)) return '';
    const s = String(v).trim();
    if (!LETRAS.test(s)) return `Escribe solo letras, sin números ni símbolos. Ejemplo: ${ejemplo}`;
    if (s.split(/\s+/).length < 2) return `Escribe nombre y apellido. Ejemplo: ${ejemplo}`;
    return '';
  },

  /** Correo electrónico. */
  correo: (ejemplo = 'nombre@correo.com') => v => {
    if (vacio(v)) return '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim())
      ? '' : `El correo no es válido: debe tener @ y dominio. Ejemplo: ${ejemplo}`;
  },

  /** Celular colombiano: 10 dígitos empezando por 3. */
  celular: (ejemplo = '3001234567') => v => {
    if (vacio(v)) return '';
    return /^3\d{9}$/.test(String(v).replace(/\s/g, ''))
      ? '' : `Debe ser un celular de 10 dígitos que empiece por 3, sin espacios. Ejemplo: ${ejemplo}`;
  },

  /** Teléfono: celular (3XXXXXXXXX), fijo nacional (60X XXXXXXX) o fijo local de 7 dígitos. */
  telefono: (ejemplo = '3001234567 o 6024441234') => v => {
    if (vacio(v)) return '';
    return /^(3\d{9}|60\d{8}|\d{7})$/.test(String(v).replace(/[\s-]/g, ''))
      ? '' : `Escribe un celular de 10 dígitos o un fijo con indicativo, solo números. Ejemplo: ${ejemplo}`;
  },

  /**
   * NIT: 6 a 10 dígitos con dígito de verificación (DV) opcional tras un guion.
   * Si trae DV, se comprueba con el cálculo DIAN (ver calcularDvNit):
   *   '900123456'   → ''        (sin DV se acepta; el formulario puede sugerirlo)
   *   '900123456-8' → ''
   *   '900123456-7' → 'El dígito de verificación no corresponde; debería ser 8. Ejemplo: 900123456-8'
   */
  nit: (ejemplo = '900123456-8') => v => {
    if (vacio(v)) return '';
    const s = String(v).trim();
    if (!/^\d{6,10}(-\d)?$/.test(s))
      return `El NIT lleva solo números y, si aplica, guion y dígito de verificación. Ejemplo: ${ejemplo}`;
    const [base, dv] = s.split('-');
    if (dv === undefined) return '';
    const correcto = calcularDvNit(base);
    return Number(dv) === correcto
      ? '' : `El dígito de verificación no corresponde; debería ser ${correcto}. Ejemplo: ${base}-${correcto}`;
  },

  /** Documento de identidad: solo números (6 a 11) o, si se permite, letras y números (pasaporte). */
  documento: ({ alfanumerico = false, ejemplo = '1144123456' } = {}) => v => {
    if (vacio(v)) return '';
    const s = String(v).trim();
    if (alfanumerico)
      return /^[A-Za-z0-9]{4,15}$/.test(s) ? '' : `Escribe de 4 a 15 letras o números, sin espacios ni guiones. Ejemplo: ${ejemplo}`;
    return /^\d{6,11}$/.test(s) ? '' : `Escribe de 6 a 11 dígitos, sin puntos ni espacios. Ejemplo: ${ejemplo}`;
  },

  /**
   * Número de documento según el tipo elegido en otro campo. Usa el catálogo
   * (constants/tiposDocumento) y entiende alias viejos y minúsculas ('Pasaporte', 'PP', 'nit'…):
   * NIT → regla de NIT con DV; RC/TI/CC/NUIP → solo dígitos; el resto → letras y números.
   */
  documentoSegunTipo: (campoTipo) => (v, form) => {
    const tipo = normalizarTipoDocumento(form?.[campoTipo]);
    if (tipo === 'NIT') return r.nit()(v);
    if (esDocumentoNumerico(tipo)) return r.documento({ ejemplo: tipo === 'CC' ? '1144123456' : '1107123456' })(v);
    return r.documento({ alfanumerico: true, ejemplo: 'AB123456' })(v);
  },

  /** Número con rango; entero opcional. */
  numero: ({ min = -Infinity, max = Infinity, entero = false, unidad = '', ejemplo } = {}) => v => {
    if (vacio(v)) return '';
    const n = num(v);
    const u = unidad ? ` ${unidad}` : '';
    if (Number.isNaN(n)) return `Escribe solo números.${ej(ejemplo)}`;
    if (entero && !Number.isInteger(n)) return `Escribe un número entero, sin decimales.${ej(ejemplo)}`;
    if (n < min && max !== Infinity) return `Debe estar entre ${min} y ${max}${u}.${ej(ejemplo)}`;
    if (n < min) return `Debe ser mínimo ${min}${u}.${ej(ejemplo)}`;
    if (n > max) return `Debe ser máximo ${max}${u}.${ej(ejemplo)}`;
    return '';
  },

  /** Monto en pesos mayor que cero. */
  monto: (ejemplo = '50000') => v => {
    if (vacio(v)) return '';
    const n = num(v);
    if (Number.isNaN(n)) return `Escribe solo números, sin puntos ni signo $. Ejemplo: ${ejemplo}`;
    if (n <= 0) return `El monto debe ser mayor que 0. Ejemplo: ${ejemplo}`;
    return '';
  },

  /** Fecha 'AAAA-MM-DD' con límites opcionales. */
  fecha: ({ noFutura = false, noPasada = false, ejemplo } = {}) => v => {
    if (vacio(v)) return '';
    const d = parsearFechaISO(v);
    if (!d) return `La fecha no es válida.${ej(ejemplo)}`;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    if (noFutura && d > hoy) return 'La fecha no puede ser futura. Revisa el día y el año.';
    if (noPasada && d < hoy) return 'La fecha no puede ser anterior a hoy.';
    return '';
  },

  /** Fecha que no puede ser anterior a otra del mismo formulario. */
  fechaDesde: (campoInicio, etiquetaInicio) => (v, form) => {
    if (vacio(v) || vacio(form[campoInicio])) return '';
    return new Date(`${v}T00:00:00`) < new Date(`${form[campoInicio]}T00:00:00`)
      ? `No puede ser anterior a ${etiquetaInicio}.` : '';
  },

  /** Regla que solo aplica cuando se cumple una condición del formulario. */
  si: (condicion, regla) => (v, form) => (condicion(form) ? regla(v, form) : ''),

  /** Regla propia: fn(valor, form) => '' | mensaje. */
  propia: fn => fn,
};

/** Primer mensaje de error de un campo ('' si está bien). */
export function validarCampo(esquema, campo, form) {
  for (const regla of esquema[campo]?.reglas ?? []) {
    const msg = regla(form[campo], form);
    if (msg) return msg;
  }
  return '';
}

/** Errores de todo el esquema (o de los campos indicados): { campo: mensaje }. */
export function validarEsquema(esquema, form, campos = Object.keys(esquema)) {
  const errores = {};
  for (const c of campos) {
    const msg = validarCampo(esquema, c, form);
    if (msg) errores[c] = msg;
  }
  return errores;
}

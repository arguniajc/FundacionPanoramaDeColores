/**
 * validacionBeneficiario
 * Reglas únicas de validación del formulario de beneficiario (niño y adulto).
 * Las usan el registro (por pasos) y la edición, para que ambos digan lo mismo.
 * Cada mensaje explica qué está mal y cómo llenarlo, con un ejemplo.
 * Sin React, sin Axios, sin MUI — solo lógica.
 */

const NO_REGISTRA = 'No registra';

/** Tipos de documento que solo llevan números. */
export const DOCS_NUMERICOS = ['RC', 'TI', 'CC', 'NUIP'];

const DOC_EJEMPLO = {
  RC: '1107654321', TI: '1107123456', CC: '1144123456', NUIP: '1107654321',
  CE: '123456', PA: 'AB123456', PPT: '1234567', RAMV: '1234567',
};

const LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;

const vacio  = v => v === null || v === undefined || String(v).trim() === '';
const numero = v => (vacio(v) ? NaN : Number(String(v).replace(',', '.')));

/** Edad en años cumplidos a partir de 'AAAA-MM-DD' (null si la fecha no es válida). */
export function edadDesde(fecha) {
  if (!fecha) return null;
  const fn = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(fn.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - fn.getFullYear();
  const m  = hoy.getMonth() - fn.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fn.getDate())) edad--;
  return edad;
}

const esNino = form => form.tipo !== 'adulto';

function nombre(v, ejemplo, obligatorio) {
  const s = String(v ?? '').trim();
  if (!s) return obligatorio ? `Es obligatorio. Ejemplo: ${ejemplo}` : '';
  if (!LETRAS.test(s)) return `Escribe solo letras, sin números ni símbolos. Ejemplo: ${ejemplo}`;
  if (s.length < 2)    return `Debe tener al menos 2 letras. Ejemplo: ${ejemplo}`;
  return '';
}

function entero(v, min, max, ejemplo) {
  if (vacio(v)) return `Es obligatorio. Ejemplo: ${ejemplo}`;
  const n = numero(v);
  if (!Number.isInteger(n) || n < min || n > max)
    return `Escribe un número entero entre ${min} y ${max}. Ejemplo: ${ejemplo}`;
  return '';
}

/**
 * Regla por campo: (valor, form) => '' si está bien, o el mensaje con el ejemplo.
 * `etiqueta` es el nombre que se muestra en el resumen de errores.
 */
export const REGLAS = {
  primerNombre:    { etiqueta: 'Primer nombre',    validar: v => nombre(v, 'María', true) },
  segundoNombre:   { etiqueta: 'Segundo nombre',   validar: v => nombre(v, 'José', false) },
  primerApellido:  { etiqueta: 'Primer apellido',  validar: v => nombre(v, 'Rodríguez', true) },
  segundoApellido: { etiqueta: 'Segundo apellido', validar: v => nombre(v, 'Gómez', false) },

  fechaNacimiento: {
    etiqueta: 'Fecha de nacimiento',
    validar: (v, form) => {
      const ej = esNino(form) ? '15/03/2016' : '20/08/1985';
      if (vacio(v)) return `Es obligatoria. Ejemplo: ${ej}`;
      const edad = edadDesde(v);
      if (edad === null)  return `La fecha no es válida. Ejemplo: ${ej}`;
      if (edad < 0)       return 'La fecha no puede ser futura. Revisa el año.';
      if (edad > 110)     return `La edad calculada es ${edad} años. Revisa el año. Ejemplo: ${ej}`;
      if (esNino(form) && edad >= 18)
        return `Tiene ${edad} años: un niño debe ser menor de 18. Cambia el tipo a "Adulto" o revisa la fecha.`;
      if (!esNino(form) && edad < 18)
        return `Tiene ${edad} años: un adulto debe tener 18 o más. Cambia el tipo a "Niño" o revisa la fecha.`;
      return '';
    },
  },

  tipoDocumento: {
    etiqueta: 'Tipo de documento',
    validar: (v, form) => {
      if (vacio(v)) return 'Selecciona el tipo de documento. Ejemplo: CC';
      if (!esNino(form) && (v === 'RC' || v === 'TI'))
        return 'Un adulto no usa Registro Civil ni Tarjeta de Identidad. Usa CC, CE, PPT o PA.';
      if (esNino(form) && v === 'CC')
        return 'Un menor de edad no tiene Cédula. Usa RC (0 a 6 años), TI (7 a 17 años) o NUIP.';
      return '';
    },
  },

  numeroDocumento: {
    etiqueta: 'Número de documento',
    validar: (v, form) => {
      const tipo = form.tipoDocumento;
      const ej   = DOC_EJEMPLO[tipo] ?? '1144123456';
      const s    = String(v ?? '').trim();
      if (!s) return `Es obligatorio. Ejemplo: ${ej}`;
      if (DOCS_NUMERICOS.includes(tipo)) {
        if (!/^\d+$/.test(s))            return `Escribe solo números, sin puntos ni espacios. Ejemplo: ${ej}`;
        if (s.length < 6 || s.length > 11) return `Un documento ${tipo} tiene entre 6 y 11 dígitos. Ejemplo: ${ej}`;
      } else if (!/^[A-Za-z0-9]{4,15}$/.test(s)) {
        return `Escribe letras y números, sin espacios ni guiones (4 a 15 caracteres). Ejemplo: ${ej}`;
      }
      return '';
    },
  },

  genero: { etiqueta: 'Género', validar: v => (vacio(v) ? 'Selecciona una opción. Ejemplo: Femenino' : '') },

  departamentoNacimiento: {
    etiqueta: 'Departamento',
    validar: v => (vacio(v) ? 'Selecciona el departamento de nacimiento. Ejemplo: Valle del Cauca' : ''),
  },
  ciudadNacimiento: {
    etiqueta: 'Ciudad / Municipio',
    validar: v => (vacio(v) ? 'Selecciona la ciudad de nacimiento. Ejemplo: Yumbo' : ''),
  },
  barrio: {
    etiqueta: 'Barrio',
    validar: v => {
      const s = String(v ?? '').trim();
      if (!s) return 'Es obligatorio. Ejemplo: Panorama (o marca "No registra")';
      if (s !== NO_REGISTRA && s.length < 3) return 'Escribe el nombre completo del barrio. Ejemplo: Panorama';
      return '';
    },
  },
  numPersonasVive: { etiqueta: 'Personas con quienes vive', validar: v => entero(v, 1, 20, '4') },
  numHermanos: {
    etiqueta: 'Hermanos / hijos',
    validar: v => entero(v, 0, 20, '2'),
  },

  tallaCamisa:   { etiqueta: 'Talla de camisa',   validar: v => (vacio(v) ? 'Selecciona la talla. Ejemplo: 10' : '') },
  tallaPantalon: { etiqueta: 'Talla de pantalón', validar: v => (vacio(v) ? 'Es obligatoria. Ejemplo: 12' : '') },
  tallaZapatos: {
    etiqueta: 'Talla de zapatos',
    validar: v => {
      if (vacio(v)) return 'Es obligatoria. Ejemplo: 32';
      const n = numero(v);
      if (!Number.isNaN(n) && (n < 15 || n > 48)) return 'La talla de zapatos va entre 15 y 48. Ejemplo: 32';
      return '';
    },
  },
  pesoKg: {
    etiqueta: 'Peso',
    validar: (v, form) => {
      const [min, max, ej] = esNino(form) ? [2, 150, '25.5'] : [30, 250, '65'];
      if (vacio(v)) return `Es obligatorio, en kilogramos. Ejemplo: ${ej}`;
      const n = numero(v);
      if (Number.isNaN(n) || n < min || n > max)
        return `El peso debe estar entre ${min} y ${max} kg. Ejemplo: ${ej}`;
      return '';
    },
  },
  tallaCm: {
    etiqueta: 'Estatura',
    validar: (v, form) => {
      const [min, max, ej] = esNino(form) ? [40, 200, '120'] : [120, 230, '165'];
      if (vacio(v)) return `Es obligatoria, en centímetros. Ejemplo: ${ej}`;
      const n = numero(v);
      if (!Number.isInteger(n) || n < min || n > max)
        return `La estatura va entre ${min} y ${max} cm, en números enteros. Ejemplo: ${ej}`;
      return '';
    },
  },

  eps: { etiqueta: 'EPS', validar: v => (vacio(v) ? 'Es obligatoria. Ejemplo: Nueva EPS (o marca "No registra")' : '') },
  descripcionAlergia: {
    etiqueta: 'Descripción de la alergia',
    validar: (v, form) => (form.tieneAlergia === 'si' && vacio(v)
      ? 'Describe a qué es alérgico. Ejemplo: Alergia al maní' : ''),
  },
  descripcionDiscapacidad: {
    etiqueta: 'Descripción de la discapacidad',
    validar: (v, form) => (form.tieneDiscapacidad && vacio(v)
      ? 'Describe la condición. Ejemplo: Discapacidad auditiva leve' : ''),
  },

  nombreAcudiente: {
    etiqueta: 'Nombre del acudiente',
    validar: (v, form) => {
      if (!esNino(form)) return '';
      const err = nombre(v, 'Ana Gómez', true);
      if (err) return err;
      if (String(v).trim().split(/\s+/).length < 2) return 'Escribe nombre y apellido. Ejemplo: Ana Gómez';
      return '';
    },
  },
  parentesco: {
    etiqueta: 'Parentesco',
    validar: (v, form) => (esNino(form) && vacio(v) ? 'Selecciona el parentesco. Ejemplo: Madre' : ''),
  },
  whatsapp: {
    etiqueta: 'WhatsApp',
    validar: (v, form) => {
      if (!esNino(form)) return '';
      const s = String(v ?? '').trim();
      if (!s) return 'Es obligatorio. Ejemplo: 3001234567';
      if (!/^3\d{9}$/.test(s)) return 'Debe ser un celular de 10 dígitos que empiece por 3. Ejemplo: 3001234567';
      return '';
    },
  },
  viveConNino: {
    etiqueta: '¿Vive con el niño?',
    validar: (v, form) => (esNino(form) && vacio(v) ? 'Selecciona Sí o No.' : ''),
  },
  direccion: {
    etiqueta: 'Dirección',
    validar: (v, form) => {
      if (!esNino(form)) return '';
      const s = String(v ?? '').trim();
      if (!s) return 'Es obligatoria. Ejemplo: Calle 5 # 10-20 (o marca "No registra")';
      if (s !== NO_REGISTRA && s.length < 5) return 'Escribe la dirección completa. Ejemplo: Calle 5 # 10-20';
      return '';
    },
  },

  autorizacion: {
    etiqueta: 'Autorización',
    validar: v => (v ? '' : 'Debes marcar la casilla de autorización para poder inscribir.'),
  },
};

/** Campos que se revisan en cada paso del registro. */
export const CAMPOS_POR_PASO = [
  ['primerNombre', 'segundoNombre', 'primerApellido', 'segundoApellido', 'fechaNacimiento',
   'tipoDocumento', 'numeroDocumento', 'genero', 'departamentoNacimiento', 'ciudadNacimiento',
   'barrio', 'numPersonasVive', 'numHermanos'],
  ['tallaCamisa', 'tallaPantalon', 'tallaZapatos', 'pesoKg', 'tallaCm'],
  ['eps', 'descripcionAlergia', 'descripcionDiscapacidad'],
  ['nombreAcudiente', 'parentesco', 'whatsapp', 'viveConNino', 'direccion'],
  ['autorizacion'],
];

/** Mensaje de error de un campo ('' si está bien). */
export function validarCampo(campo, form) {
  return REGLAS[campo]?.validar(form[campo], form) ?? '';
}

/** Errores de una lista de campos: { campo: mensaje } solo con los que fallan. */
export function validarCampos(campos, form) {
  const errores = {};
  for (const c of campos) {
    const msg = validarCampo(c, form);
    if (msg) errores[c] = msg;
  }
  return errores;
}

/** Errores de un paso del registro. */
export const validarPaso = (paso, form) => validarCampos(CAMPOS_POR_PASO[paso] ?? [], form);

/** Errores de todo el formulario (sin la autorización, que solo aplica al registro). */
export const validarFormulario = (form, { conAutorizacion = false } = {}) =>
  validarCampos(CAMPOS_POR_PASO.flat().filter(c => conAutorizacion || c !== 'autorizacion'), form);

/** Primer paso que tiene errores (o -1 si todo está bien). */
export function primerPasoConErrores(form) {
  return CAMPOS_POR_PASO.findIndex((_, i) => Object.keys(validarPaso(i, form)).length > 0);
}

/** Texto "Etiqueta: mensaje" para mostrar en el resumen. */
export const describirError = (campo, mensaje) => `${REGLAS[campo]?.etiqueta ?? campo}: ${mensaje}`;

/**
 * Catálogo ÚNICO de tipos de documento del panel. Las listas de cada formulario se
 * derivan de aquí (no escribas listas nuevas a mano).
 *
 *   codigo   — valor que se guarda en el formulario / API ('CC', 'PA', 'Sin documento'…)
 *   nombre   — nombre legible
 *   numerico — true si el número lleva SOLO dígitos (teclado numérico en celular)
 *   aplicaA  — dónde se ofrece:
 *     'menor'   beneficiario niño/niña/adolescente
 *     'adulto'  beneficiario adulto
 *     'persona' lista general de personas del panel (donantes, voluntarios, empleados,
 *               representantes y campo "tipo de documento" de las inscripciones)
 *     'empresa' persona jurídica (donante empresa, tercero de un programa)
 *
 * Listas derivadas (mismo contenido que tenían antes de existir el catálogo):
 *   TIPOS_DOC (constants/beneficiarios)   = codigosTipoDocumento(['menor', 'adulto'])
 *   TIPOS_DOCUMENTO (utils/geodata)       = codigosTipoDocumento('persona')
 *
 * Ejemplos:
 *   opcionesTipoDocumento('empresa')
 *     // → [{ value: 'NIT', label: 'NIT – Número de identificación tributaria', … }, { value: 'Otro', label: 'Otro', … }]
 *   <TextField select …>
 *     {opcionesTipoDocumento(['persona', 'empresa']).map(o =>
 *       <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
 *   </TextField>
 *   esDocumentoNumerico('CC')        // → true
 *   tecladoDocumento('NIT')          // → 'tel' (dígitos + guion del DV)
 *   normalizarTipoDocumento('Pasaporte') // → 'PA'   (alias viejos: 'PP', 'PAS', 'pasaporte', 'nit'…)
 *
 * Cómo migrar las listas que todavía están escritas a mano (tanda 2):
 *   - talento_humano/.../DialogEmpleado.jsx  TIPOS_DOCUMENTO = ['CC','TI','CE','Pasaporte','NIT','Otro']
 *       → opcionesTipoDocumento('persona'). Los empleados guardados con 'Pasaporte' se siguen
 *         mostrando: usa `opcionConValorActual(opciones, form.tipoDocumento)` y, al guardar,
 *         `normalizarTipoDocumento(form.tipoDocumento)` (→ 'PA').
 *   - programas/pages/ProgramasPage.jsx  TIPOS_DOC = ['CC','CE','NIT','Pasaporte','TI','PEP','PPT','Otro']
 *       → opcionesTipoDocumento(['persona', 'empresa']) (mismo tratamiento de 'Pasaporte').
 *   - configuracion/pages/components/helpers.js  TIPOS_DOC = ['CC','CE','PP','NIT','Otro']
 *       → opcionesTipoDocumento(['adulto', 'empresa']) o 'persona'; 'PP' es alias de 'PA'.
 *   `r.documentoSegunTipo` ya entiende los alias, así que la validación no cambia al migrar.
 */

/** @typedef {'menor'|'adulto'|'persona'|'empresa'} AplicaA */
/** @typedef {{ codigo: string, nombre: string, numerico: boolean, aplicaA: AplicaA[] }} TipoDocumento */

/** @type {readonly TipoDocumento[]} */
export const TIPOS_DOCUMENTO_CATALOGO = Object.freeze([
  { codigo: 'RC',            nombre: 'Registro civil',                                   numerico: true,  aplicaA: ['menor', 'persona'] },
  { codigo: 'TI',            nombre: 'Tarjeta de identidad',                             numerico: true,  aplicaA: ['menor', 'persona'] },
  { codigo: 'CC',            nombre: 'Cédula de ciudadanía',                             numerico: true,  aplicaA: ['adulto', 'persona'] },
  { codigo: 'CE',            nombre: 'Cédula de extranjería',                            numerico: false, aplicaA: ['menor', 'adulto', 'persona'] },
  { codigo: 'NUIP',          nombre: 'Número único de identificación personal',          numerico: true,  aplicaA: ['menor', 'adulto'] },
  { codigo: 'PA',            nombre: 'Pasaporte',                                        numerico: false, aplicaA: ['menor', 'adulto', 'persona'] },
  { codigo: 'PEP',           nombre: 'Permiso especial de permanencia',                  numerico: false, aplicaA: ['persona'] },
  { codigo: 'PPT',           nombre: 'Permiso por protección temporal',                  numerico: false, aplicaA: ['menor', 'adulto', 'persona'] },
  { codigo: 'RAMV',          nombre: 'Registro administrativo de migrantes venezolanos', numerico: false, aplicaA: ['menor', 'adulto'] },
  { codigo: 'NIT',           nombre: 'Número de identificación tributaria',              numerico: false, aplicaA: ['persona', 'empresa'] },
  { codigo: 'Sin documento', nombre: 'Sin documento',                                    numerico: false, aplicaA: ['menor', 'adulto'] },
  { codigo: 'Otro',          nombre: 'Otro',                                             numerico: false, aplicaA: ['persona', 'empresa'] },
].map(t => Object.freeze({ ...t, aplicaA: Object.freeze(t.aplicaA) })));

// Alias de valores viejos o escritos de otra forma → código del catálogo (claves en MAYÚSCULAS).
const ALIAS = {
  PASAPORTE: 'PA', PP: 'PA', PAS: 'PA',
  'SIN DOCUMENTO': 'Sin documento', SD: 'Sin documento', NINGUNO: 'Sin documento',
  OTRO: 'Otro',
};
const POR_CODIGO = new Map(TIPOS_DOCUMENTO_CATALOGO.map(t => [t.codigo.toUpperCase(), t]));

/** Código del catálogo para un valor (acepta minúsculas y alias viejos). Desconocido → el mismo valor recortado. */
export function normalizarTipoDocumento(valor) {
  if (valor === null || valor === undefined) return '';
  const s = String(valor).trim();
  const k = s.toUpperCase();
  return ALIAS[k] ?? POR_CODIGO.get(k)?.codigo ?? s;
}

/** Entrada del catálogo para un código o alias (o undefined). */
export function tipoDocumento(codigo) {
  return POR_CODIGO.get(normalizarTipoDocumento(codigo).toUpperCase());
}

/** true si el documento de ese tipo lleva solo dígitos (RC, TI, CC, NUIP). */
export function esDocumentoNumerico(codigo) {
  return !!tipoDocumento(codigo)?.numerico;
}

/** inputMode recomendado para el número: 'numeric' (solo dígitos), 'tel' (NIT: dígitos y guion) o 'text'. */
export function tecladoDocumento(codigo) {
  const t = tipoDocumento(codigo);
  if (t?.numerico) return 'numeric';
  if (t?.codigo === 'NIT') return 'tel';
  return 'text';
}

/** Etiqueta para listas: "CC – Cédula de ciudadanía" (o solo el nombre si coincide con el código). */
export function etiquetaTipoDocumento(codigo) {
  const t = tipoDocumento(codigo);
  if (!t) return codigo ? String(codigo) : '';
  return t.nombre === t.codigo ? t.nombre : `${t.codigo} – ${t.nombre}`;
}

const filtrar = aplicaA => {
  if (aplicaA === undefined || aplicaA === null) return [...TIPOS_DOCUMENTO_CATALOGO];
  const grupos = Array.isArray(aplicaA) ? aplicaA : [aplicaA];
  return TIPOS_DOCUMENTO_CATALOGO.filter(t => t.aplicaA.some(g => grupos.includes(g)));
};

/** Códigos (string[]) de los tipos que aplican a uno o varios grupos, en el orden del catálogo. Sin argumento: todos. */
export function codigosTipoDocumento(aplicaA) {
  return filtrar(aplicaA).map(t => t.codigo);
}

/**
 * Opciones para un select: [{ value, label, codigo, nombre, numerico, aplicaA }].
 * @param {AplicaA|AplicaA[]} [aplicaA] grupo(s); sin argumento, todo el catálogo.
 */
export function opcionesTipoDocumento(aplicaA) {
  return filtrar(aplicaA).map(t => ({ ...t, value: t.codigo, label: etiquetaTipoDocumento(t.codigo) }));
}

/**
 * Agrega a `opciones` el valor actual del registro si no está en la lista (p. ej. un dato
 * viejo guardado como 'Pasaporte'), para que el select lo muestre en vez de quedar vacío.
 */
export function opcionConValorActual(opciones, valorActual) {
  if (!valorActual || opciones.some(o => o.value === valorActual)) return opciones;
  return [...opciones, { value: valorActual, label: etiquetaTipoDocumento(valorActual), codigo: valorActual, nombre: String(valorActual), numerico: false, aplicaA: [] }];
}

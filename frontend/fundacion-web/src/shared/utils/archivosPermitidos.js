/**
 * Tipos y tamaños de archivo que acepta el servidor. Se valida ANTES de subir para
 * no gastar la subida en un archivo que el backend va a rechazar.
 *
 *   const err = validarArchivo(file, { tipos: 'imagen' });
 *   if (err) { notificar.error(err); return; }
 *
 * Sin React, sin MUI — solo lógica.
 */

const MB = 1024 * 1024;

export const LIMITES_ARCHIVO = {
  imagen: { maxMB: 5,  mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] },
  pdf:    { maxMB: 10, mimes: ['application/pdf'] },
};

/** Extensiones de respaldo: algunos navegadores (HEIC en Windows, PDFs desde ciertos apps) dejan file.type vacío. */
const EXTENSIONES = {
  imagen: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'],
  pdf:    ['pdf'],
};

/** Valor para el atributo `accept` de un <input type="file">. */
export const ACCEPT_ARCHIVO = {
  imagen: 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif',
  pdf:    'application/pdf,.pdf',
  ambos:  'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,application/pdf,.pdf',
};

const extension = nombre => (String(nombre ?? '').split('.').pop() || '').toLowerCase();

/** 'imagen' | 'pdf' | null según el tipo MIME (o la extensión si el navegador no informa el tipo). */
export function clasificarArchivo(file) {
  const tipo = String(file?.type ?? '').toLowerCase();
  if (tipo) {
    if (LIMITES_ARCHIVO.imagen.mimes.includes(tipo)) return 'imagen';
    if (LIMITES_ARCHIVO.pdf.mimes.includes(tipo))    return 'pdf';
    return null;
  }
  const ext = extension(file?.name);
  if (EXTENSIONES.imagen.includes(ext)) return 'imagen';
  if (EXTENSIONES.pdf.includes(ext))    return 'pdf';
  return null;
}

const MSG_TIPO = {
  imagen: 'Solo se permiten imágenes JPG, PNG o WEBP.',
  pdf:    'Solo se permiten archivos PDF.',
  ambos:  'Solo se permiten imágenes JPG, PNG o WEBP, o archivos PDF.',
};

/**
 * Valida un archivo contra lo que acepta el servidor.
 * @param {File} file
 * @param {{ tipos?: 'imagen'|'pdf'|'ambos' }} opciones
 * @returns {string|null} null si está bien, o un mensaje en español.
 */
export function validarArchivo(file, { tipos = 'ambos' } = {}) {
  if (!file) return 'Selecciona un archivo.';
  const clase = clasificarArchivo(file);
  const permitidas = tipos === 'ambos' ? ['imagen', 'pdf'] : [tipos];
  if (!clase || !permitidas.includes(clase)) return MSG_TIPO[tipos] ?? MSG_TIPO.ambos;

  const { maxMB } = LIMITES_ARCHIVO[clase];
  if (file.size > maxMB * MB) {
    const pesa = (file.size / MB).toFixed(1);
    return clase === 'imagen'
      ? `La imagen no puede superar ${maxMB} MB (pesa ${pesa} MB). Redúcela o toma la foto con menor resolución.`
      : `El PDF no puede superar ${maxMB} MB (pesa ${pesa} MB). Comprímelo o divídelo.`;
  }
  if (file.size === 0) return 'El archivo está vacío. Selecciona otro.';
  return null;
}

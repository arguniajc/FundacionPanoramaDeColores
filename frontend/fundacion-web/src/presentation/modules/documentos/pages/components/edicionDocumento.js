import { r } from '@/shared/utils/validacion';
import { CATEGORIAS } from './helpers';

/**
 * Edición de documentos: solo los datos, nunca el archivo (para cambiarlo se sube otro).
 * Mismas reglas que el servidor (DocumentosService.EditarAsync / EditarArchivoAsync):
 * título obligatorio de hasta 200, categoría de la lista, descripción de hasta 1000;
 * en los de un beneficiario solo se cambia el nombre visible (hasta 200).
 */
export const ESQUEMA_EDITAR_INSTITUCIONAL = {
  titulo:      { etiqueta: 'Título',      reglas: [r.obligatorio('Acta de asamblea 2025'), r.texto({ max: 200 })] },
  categoria:   { etiqueta: 'Categoría',   reglas: [r.seleccion('Actas'), r.propia(v => (!v || CATEGORIAS.includes(v) ? '' : 'Elige una categoría de la lista. Ejemplo: Actas'))] },
  descripcion: { etiqueta: 'Descripción', reglas: [r.texto({ max: 1000 })] },
};

export const ESQUEMA_EDITAR_BENEFICIARIO = {
  titulo: { etiqueta: 'Nombre del documento', reglas: [r.obligatorio('Certificado médico 2025.pdf'), r.texto({ max: 200 })] },
};

/** Formulario inicial a partir del documento de la tabla. */
export function formEdicion(doc, conCategoria) {
  return conCategoria
    ? { titulo: doc?.titulo ?? '', categoria: doc?.categoria ?? 'Otros', descripcion: doc?.descripcion ?? '' }
    : { titulo: doc?.nombreOriginal ?? '' };
}

/** Cuerpo del PUT: textos sin espacios sobrantes y descripción vacía como null. */
export function datosEdicion(form, conCategoria) {
  if (!conCategoria) return { nombre: form.titulo.trim() };
  return {
    titulo:      form.titulo.trim(),
    categoria:   form.categoria,
    descripcion: form.descripcion?.trim() || null,
  };
}

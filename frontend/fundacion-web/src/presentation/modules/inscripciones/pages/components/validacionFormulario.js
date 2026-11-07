// Validación del formulario dinámico de inscripción (campos definidos por programa).
// Mensajes claros: qué falta y cómo llenarlo, con ejemplo. Sin React — solo lógica.
import { r } from '@/shared/utils/validacion';
import {
  TIPOS_DOCUMENTO, GENEROS, TIPOS_SANGRE, ESTRATOS, NIVELES_EDUCATIVOS,
  TALLAS_ROPA, TALLAS_PANTALON, TALLAS_ZAPATOS, VALORACIONES, AUTOIDENTIFICACION,
} from '@/shared/utils/geodata';

// Listas de opciones de los campos de selección predefinidos.
export const LISTAS_POR_TIPO = {
  tipo_documento: TIPOS_DOCUMENTO, genero: GENEROS,
  tipo_sangre: TIPOS_SANGRE, estrato: ESTRATOS, nivel_educativo: NIVELES_EDUCATIVOS,
  talla_ropa: TALLAS_ROPA, talla_pantalon: TALLAS_PANTALON,
  talla_zapatos: TALLAS_ZAPATOS, valoracion: VALORACIONES,
  autoidentificacion: AUTOIDENTIFICACION,
};

export const esPanelResponsable = tipo => tipo === 'datos_padre' || tipo === 'datos_madre' || tipo === 'datos_tutor';

// Sub-campos obligatorios de los paneles de padre / madre / tutor.
const SUBCAMPOS_PANEL = [
  ['nombres', 'nombres'], ['apellidos', 'apellidos'], ['fechaNac', 'fecha de nacimiento'], ['pais', 'país'],
  ['departamento', 'departamento'], ['ciudad', 'ciudad'], ['tipoDoc', 'tipo de documento'],
  ['numDoc', 'número de documento'], ['celular', 'celular'], ['direccion', 'dirección'], ['barrio', 'barrio'],
  ['eps', 'EPS'], ['escolaridad', 'nivel de escolaridad'], ['ocupacion', 'ocupación'],
  ['empresa', 'empresa / lugar de trabajo'], ['autoidentificacion', 'autoidentificación étnica'],
];

/** Sub-campos sin llenar de un panel de responsable (lista vacía = completo). */
export function faltantesPanel(d, tipo) {
  const t = s => !!(s?.trim());
  const faltan = SUBCAMPOS_PANEL
    .filter(([k]) => k !== 'departamento' || d.pais?.trim() === 'Colombia')
    .filter(([k]) => !t(d[k]))
    .map(([, nombre]) => nombre);
  if (tipo === 'datos_tutor' && !t(d.relacion)) faltan.unshift('relación / parentesco');
  return faltan;
}

// Ejemplo para el mensaje de "obligatorio" según el tipo de campo.
const EJEMPLO_POR_TIPO = {
  number: '10', date: '15/03/2026', email: 'nombre@correo.com', telefono: '3001234567',
  talla: '120', altura: '120', peso: '25.5', edad: '8', fecha_nac: '15/03/2015',
  pais: 'Colombia', departamento: 'Valle del Cauca', ciudad: 'Cali',
};

/** Error de un campo dinámico ('' si está bien): obligatorio + formato según el tipo. */
export function errorCampoDinamico(campo, valor) {
  const { tipo, obligatorio } = campo;
  if (!valor) {
    if (!obligatorio) return '';
    if (tipo === 'document') return 'Falta el documento: pulsa "Seleccionar PDF" y sube el archivo en formato PDF.';
    if (tipo === 'firma')    return 'Falta la firma: firma dentro del recuadro con el dedo o el mouse.';
    if (esPanelResponsable(tipo)) return 'Completa los datos de esta persona: todos los campos marcados con *.';
    if (tipo === 'daterange') return 'Escribe las fechas Desde y Hasta. Ejemplo: 01/02/2026 — 30/11/2026';
    if (tipo === 'documento_id') return 'Selecciona el tipo y escribe el número de documento. Ejemplo: TI 1107123456';
    if (tipo === 'grado_escolar') return 'Selecciona el grado. Ejemplo: Grado 3°';
    if (tipo === 'select') return r.seleccion(campo.opciones?.[0])('');
    if (LISTAS_POR_TIPO[tipo]) return r.seleccion(LISTAS_POR_TIPO[tipo][0])('');
    return r.obligatorio(EJEMPLO_POR_TIPO[tipo])('');
  }

  const json = () => { try { return JSON.parse(valor); } catch { return null; } };
  switch (tipo) {
    case 'daterange': {
      const rng = json();
      if (!rng) return 'Las fechas no son válidas. Vuelve a escribirlas. Ejemplo: 01/02/2026 — 30/11/2026';
      if (obligatorio && !rng.desde) return 'Falta la fecha Desde. Ejemplo: 01/02/2026';
      if (obligatorio && !rng.hasta) return 'Falta la fecha Hasta. Ejemplo: 30/11/2026';
      return r.fechaDesde('desde', 'la fecha Desde')(rng.hasta, rng);
    }
    case 'documento_id': {
      const doc = json();
      if (!doc) return 'El documento no es válido. Vuelve a escribirlo. Ejemplo: TI 1107123456';
      if (obligatorio && !doc.tipo)   return 'Selecciona el tipo de documento. Ejemplo: TI';
      if (obligatorio && !doc.numero) return 'Escribe el número de documento, sin puntos ni espacios. Ejemplo: 1107123456';
      return r.documentoSegunTipo('tipo')(doc.numero, doc);
    }
    case 'grado_escolar': {
      const ge = json();
      return obligatorio && !ge?.grado ? 'Selecciona el grado. Ejemplo: Grado 3°' : '';
    }
    case 'datos_padre': case 'datos_madre': case 'datos_tutor': {
      const d = json();
      if (!d) return 'Los datos no son válidos. Vuelve a escribirlos.';
      const faltan = obligatorio ? faltantesPanel(d, tipo) : [];
      if (faltan.length) return `Falta llenar: ${faltan.join(', ')}.`;
      if (d.fechaNac) { const m = r.fecha({ noFutura: true })(d.fechaNac); if (m) return `Fecha de nacimiento: ${m}`; }
      if (d.celular && (!d.pais || d.pais === 'Colombia')) { const m = r.celular()(d.celular); if (m) return `Celular: ${m}`; }
      return '';
    }
    case 'email':     return r.correo()(valor);
    case 'telefono':  return r.telefono()(valor);
    case 'number':    return r.numero({ ejemplo: '10' })(valor);
    case 'talla':
    case 'altura':    return r.numero({ min: 1, max: 250, unidad: 'cm', ejemplo: '120' })(valor);
    case 'peso':      return r.numero({ min: 1, max: 300, unidad: 'kg', ejemplo: '25.5' })(valor);
    case 'edad':      return r.numero({ min: 0, max: 120, entero: true, unidad: 'años', ejemplo: '8' })(valor);
    case 'date':      return r.fecha({ ejemplo: '15/03/2026' })(valor);
    case 'fecha_nac': return r.fecha({ noFutura: true, ejemplo: '15/03/2015' })(valor);
    default:          return '';
  }
}

/** Errores de todos los campos dinámicos visibles: { idCampo: mensaje }. Los paneles desactivados no se validan. */
export function erroresCamposDinamicos(campos, datos, panelActivo = {}) {
  const errores = {};
  for (const c of campos) {
    if (esPanelResponsable(c.tipo) && panelActivo[c.id] === false) continue;
    const msg = errorCampoDinamico(c, datos[c.id]);
    if (msg) errores[c.id] = msg;
  }
  return errores;
}

/** Nombre de los datos de la firma de autorización, para el resumen de errores. */
export const ETIQUETAS_FIRMA = {
  __firma_quien__:     '¿Quién firma?',
  __firma_nombre__:    'Nombre de quien firma',
  __firma_documento__: 'Documento de quien firma',
  __firma_padre__:     'Firma de autorización',
};

/** Errores de la autorización del padre / acudiente: { clave de ETIQUETAS_FIRMA: mensaje }. */
export function erroresFirma(datos) {
  let meta = {};
  try { meta = JSON.parse(datos.__firma_meta__ || '{}'); } catch { /* metadatos ilegibles: se tratan como vacíos */ }
  const errores = {};
  if (!meta.quien) errores.__firma_quien__ = 'Selecciona quién firma la autorización. Ejemplo: Madre';
  const nombre = r.obligatorio('Ana Gómez')(meta.nombre);
  if (nombre) errores.__firma_nombre__ = nombre;
  const documento = r.obligatorio('1144123456')(meta.documento) || r.documento()(meta.documento);
  if (documento) errores.__firma_documento__ = documento;
  if (!datos.__firma_padre__) errores.__firma_padre__ = 'Falta la firma: pide a quien autoriza que firme dentro del recuadro.';
  return errores;
}

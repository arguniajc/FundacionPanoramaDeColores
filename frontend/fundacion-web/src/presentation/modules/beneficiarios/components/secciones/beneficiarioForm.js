/**
 * Datos y conversiones del formulario de beneficiario que comparten "Nuevo beneficiario"
 * (wizard) y "Editar inscripción". Sin React: solo listas, el formulario vacío, la carga
 * desde la ficha y el cuerpo que se envía a la API.
 */
import { edadDesde, esSinDocumento, NO_REGISTRA } from '@/domain/beneficiarios/validacionBeneficiario';

export { NO_REGISTRA };

export const GRADOS = ['Prejardín', 'Jardín', 'Transición', '1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°', '9°', '10°', '11°'];
export const NIVELES_EDUCATIVOS = [
  'Sin estudios formales', 'Primaria incompleta', 'Primaria completa',
  'Bachillerato incompleto', 'Bachillerato completo',
  'Técnico/a', 'Tecnólogo/a', 'Profesional', 'Especialización', 'Maestría', 'Doctorado',
];
export const GENEROS = ['Masculino', 'Femenino', 'No binario', 'Prefiero no decir'];

/** Nombres de los pasos del registro. El paso 3 es "Acudiente" (niño) o "Contacto" (adulto). */
export const pasosRegistro = esNino => ['Datos personales', 'Tallas', 'Salud', esNino ? 'Acudiente' : 'Contacto', 'Autorización'];

/** Tipo de documento que se propone por defecto según el tipo de beneficiario. */
export const docPorDefecto = tipo => (tipo === 'adulto' ? 'CC' : 'RC');

/** Categoría de edad que se muestra como chip debajo de la fecha (null si no hay fecha válida). */
export function calcularCategoria(fecha) {
  const edad = edadDesde(fecha);
  if (edad === null || edad < 0 || edad > 120) return null;
  if (edad <=  5) return { edad, label: 'Primera infancia', color: '#e3f2fd', tc: '#0d47a1', rango: '0 a 5 años'   };
  if (edad <= 11) return { edad, label: 'Infancia',          color: '#e8f5e9', tc: '#1b5e20', rango: '6 a 11 años'  };
  if (edad <= 17) return { edad, label: 'Adolescencia',      color: '#fff8e1', tc: '#e65100', rango: '12 a 17 años' };
  if (edad <= 28) return { edad, label: 'Joven',             color: '#fce4ec', tc: '#880e4f', rango: '18 a 28 años' };
  if (edad <= 59) return { edad, label: 'Adulto',            color: '#f3e5f5', tc: '#4a148c', rango: '29 a 59 años' };
  return           { edad, label: 'Adulto mayor',            color: '#efebe9', tc: '#3e2723', rango: '60+ años'     };
}

/** Formulario vacío del registro, según el tipo con el que se abre. */
export const formVacio = (tipo = 'niño') => ({
  tipo,
  primerNombre: '', segundoNombre: '', primerApellido: '', segundoApellido: '',
  fechaNacimiento: '', tipoDocumento: docPorDefecto(tipo), numeroDocumento: '',
  genero: '',
  paisNacimiento: 'Colombia', departamentoNacimiento: '', ciudadNacimiento: '',
  barrio: '', direccion: '', numPersonasVive: '', numHermanos: '',
  tallaCamisa: '', tallaPantalon: '', tallaZapatos: '', pesoKg: '', tallaCm: '',
  eps: '', tieneAlergia: 'no', descripcionAlergia: '', observacionesSalud: '',
  tieneDiscapacidad: false, descripcionDiscapacidad: '',
  nombreColegio: '', gradoEscolar: '',
  nombreAcudiente: '', parentesco: tipo === 'adulto' ? '' : 'Madre', whatsapp: '', viveConNino: '',
  celular: '',
  autorizacion: false,
  fotoMenorUrl: null, fotoDocumentoUrl: null, fotoDocumentoReversoUrl: null,
});

const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

/** Nombres por separado; los registros viejos solo traen `nombreMenor` completo. */
function separarNombre(ins) {
  if (ins.primerNombre) {
    return {
      primerNombre:    cap(ins.primerNombre),
      segundoNombre:   ins.segundoNombre   ? cap(ins.segundoNombre)   : '',
      primerApellido:  cap(ins.primerApellido),
      segundoApellido: ins.segundoApellido ? cap(ins.segundoApellido) : '',
    };
  }
  const p = (ins.nombreMenor || '').trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return { primerNombre: '', segundoNombre: '', primerApellido: '', segundoApellido: '' };
  if (p.length === 1) return { primerNombre: cap(p[0]), segundoNombre: '', primerApellido: '', segundoApellido: '' };
  if (p.length === 2) return { primerNombre: cap(p[0]), segundoNombre: '', primerApellido: cap(p[1]), segundoApellido: '' };
  if (p.length === 3) return { primerNombre: cap(p[0]), segundoNombre: '', primerApellido: cap(p[1]), segundoApellido: cap(p[2]) };
  return { primerNombre: cap(p[0]), segundoNombre: cap(p[1]), primerApellido: cap(p[2]), segundoApellido: p.slice(3).map(cap).join(' ') };
}

const texto  = v => (v === null || v === undefined ? '' : String(v));
const boolSN = v => (v === true ? 'si' : v === false ? 'no' : '');

/** Formulario de edición a partir de la ficha (GET /api/beneficiarios/{id}). */
export function formDesdeBeneficiario(ins) {
  return {
    ...formVacio(ins.tipo || 'niño'),
    ...separarNombre(ins),
    tipo:                    ins.tipo || 'niño',
    fechaNacimiento:         texto(ins.fechaNacimiento),
    tipoDocumento:           texto(ins.tipoDocumento),
    numeroDocumento:         texto(ins.numeroDocumento),
    genero:                  texto(ins.genero),
    paisNacimiento:          ins.paisNacimiento || 'Colombia',
    departamentoNacimiento:  texto(ins.departamentoNacimiento),
    ciudadNacimiento:        texto(ins.ciudadNacimiento),
    barrio:                  texto(ins.barrio),
    direccion:               texto(ins.direccion),
    numPersonasVive:         texto(ins.numPersonasVive),
    numHermanos:             texto(ins.numHermanos),
    eps:                     texto(ins.eps),
    tallaCamisa:             texto(ins.tallaCamisa),
    tallaPantalon:           texto(ins.tallaPantalon),
    tallaZapatos:            texto(ins.tallaZapatos),
    pesoKg:                  texto(ins.pesoKg),
    tallaCm:                 texto(ins.tallaCm),
    tieneAlergia:            ins.tieneAlergia || 'no',
    descripcionAlergia:      texto(ins.descripcionAlergia),
    observacionesSalud:      texto(ins.observacionesSalud),
    tieneDiscapacidad:       !!ins.tieneDiscapacidad,
    descripcionDiscapacidad: texto(ins.descripcionDiscapacidad),
    nombreColegio:           texto(ins.nombreColegio),
    gradoEscolar:            texto(ins.gradoEscolar),
    nombreAcudiente:         texto(ins.nombreAcudiente),
    parentesco:              texto(ins.parentesco),
    whatsapp:                texto(ins.whatsapp),
    viveConNino:             boolSN(ins.viveConNino),
    celular:                 texto(ins.celular),
    autorizacion:            !!ins.autorizacion,
    fotoMenorUrl:            ins.fotoMenorUrl            || null,
    fotoDocumentoUrl:        ins.fotoDocumentoUrl        || null,
    fotoDocumentoReversoUrl: ins.fotoDocumentoReversoUrl || null,
  };
}

const limpio = v => String(v ?? '').trim();
const oNull  = v => limpio(v) || null;

/**
 * Cuerpo de POST /api/beneficiarios y PUT /api/beneficiarios/{id}. Los campos de conteo y medidas
 * viajan como número (el formulario los guarda como texto). "Sin documento" va sin número; el
 * acudiente solo para niños y el celular propio solo para adultos.
 */
export function payloadBeneficiario(form) {
  const esNino = form.tipo !== 'adulto';
  const entero  = v => (limpio(v) ? parseInt(limpio(v), 10) : null);
  const decimal = v => (limpio(v) ? parseFloat(limpio(v).replace(',', '.')) : null);
  return {
    tipo:                    form.tipo,
    primerNombre:            limpio(form.primerNombre),
    segundoNombre:           oNull(form.segundoNombre),
    primerApellido:          limpio(form.primerApellido),
    segundoApellido:         oNull(form.segundoApellido),
    fechaNacimiento:         form.fechaNacimiento,
    tipoDocumento:           form.tipoDocumento,
    numeroDocumento:         esSinDocumento(form.tipoDocumento) ? null : oNull(form.numeroDocumento),
    genero:                  oNull(form.genero),
    paisNacimiento:          oNull(form.paisNacimiento),
    departamentoNacimiento:  oNull(form.departamentoNacimiento),
    ciudadNacimiento:        oNull(form.ciudadNacimiento),
    barrio:                  oNull(form.barrio),
    direccion:               oNull(form.direccion),
    numPersonasVive:         entero(form.numPersonasVive),
    numHermanos:             entero(form.numHermanos),
    eps:                     oNull(form.eps),
    tallaCamisa:             oNull(form.tallaCamisa),
    tallaPantalon:           oNull(form.tallaPantalon),
    tallaZapatos:            oNull(form.tallaZapatos),
    pesoKg:                  decimal(form.pesoKg),
    tallaCm:                 entero(form.tallaCm),
    tieneAlergia:            form.tieneAlergia,
    descripcionAlergia:      form.tieneAlergia === 'si' ? oNull(form.descripcionAlergia) : null,
    observacionesSalud:      oNull(form.observacionesSalud),
    tieneDiscapacidad:       !!form.tieneDiscapacidad,
    descripcionDiscapacidad: form.tieneDiscapacidad ? oNull(form.descripcionDiscapacidad) : null,
    nombreColegio:           oNull(form.nombreColegio),
    gradoEscolar:            oNull(form.gradoEscolar),
    nombreAcudiente:         esNino ? limpio(form.nombreAcudiente) : null,
    parentesco:              esNino ? oNull(form.parentesco) : null,
    whatsapp:                esNino ? oNull(form.whatsapp) : null,
    viveConNino:             esNino ? (form.viveConNino === 'si' ? true : form.viveConNino === 'no' ? false : null) : null,
    celular:                 esNino ? null : oNull(form.celular),
    autorizacion:            !!form.autorizacion,
    fotoMenorUrl:            form.fotoMenorUrl            || null,
    fotoDocumentoUrl:        form.fotoDocumentoUrl        || null,
    fotoDocumentoReversoUrl: form.fotoDocumentoReversoUrl || null,
  };
}

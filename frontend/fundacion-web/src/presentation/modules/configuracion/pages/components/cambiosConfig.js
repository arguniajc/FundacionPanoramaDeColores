import { hayCambiosEn } from '@/shared/utils/cierreDialogo';

/**
 * Campos del formulario de Configuración que edita cada pestaña (índice = pestaña).
 * La pestaña Página Web (4) edita `webForm` aparte (ver pestanasConCambios).
 */
export const CAMPOS_POR_PESTANA = Object.freeze([
  /* 0 Fundación */      ['nombreFundacion', 'nit', 'telefono', 'direccion'],
  /* 1 Representante */  ['nombreRepLegal', 'tipoDocRep', 'documentoRep', 'cargoRep', 'firmaRep'],
  /* 2 Apariencia */     ['colorPrimario', 'colorSidebar', 'colorSecundario', 'colorGradiente',
    'colorOscuroFondo', 'colorOscuroPaper', 'colorOscuroSidebar', 'colorAccento', 'fontFamily'],
  /* 3 Textos */         ['tagline', 'emailContacto', 'sitioWeb', 'mision', 'vision', 'mensajeBienvenida', 'footerTexto'],
  /* 4 Página Web */     [],
  /* 5 Correo */         ['smtpHost', 'smtpPuerto', 'smtpUsuario', 'smtpClave', 'smtpDeNombre', 'smtpDeEmail', 'smtpSsl'],
  /* 6 Nómina */         ['nominaSmlmv', 'nominaAuxilioTransporte', 'nominaTasaSalud', 'nominaTasaPension'],
]);
export const PESTANA_WEB = 4;

const tomar = (obj, campos) => Object.fromEntries(campos.map(c => [c, obj?.[c]]));

/**
 * Para cada pestaña, true si tiene cambios sin guardar respecto a lo cargado/guardado.
 *   pestanasConCambios(form, formGuardado, webForm, webGuardado) // → [false, true, false, …]
 */
export function pestanasConCambios(form, formGuardado, webForm, webGuardado) {
  return CAMPOS_POR_PESTANA.map((campos, i) => (i === PESTANA_WEB
    ? hayCambiosEn(webForm, webGuardado)
    : hayCambiosEn(tomar(form, campos), tomar(formGuardado, campos))));
}

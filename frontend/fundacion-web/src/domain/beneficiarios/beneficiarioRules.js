/**
 * beneficiarioRules
 * Reglas de negocio puras del dominio de beneficiarios.
 * Sin React, sin Axios, sin MUI — solo lógica.
 */

/** Calcula la edad a partir de una fecha ISO (ej. "2015-06-20"). */
export function calcularEdad(fechaNac) {
  if (!fechaNac) return '—';
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m  = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return `${edad} años`;
}

/** Devuelve las iniciales (máx. 2 letras) del nombre del beneficiario. */
export function calcularIniciales(nombre) {
  if (!nombre) return '??';
  return nombre
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

/** Indica si el beneficiario tiene alergias registradas. */
export function tieneAlergia(beneficiario) {
  return beneficiario?.tieneAlergia === 'si';
}

/** Indica si le faltan datos obligatorios al beneficiario. */
export function datosCompletos(beneficiario) {
  return !!(
    beneficiario.nombreMenor &&
    beneficiario.fechaNacimiento &&
    beneficiario.tipoDocumento &&
    beneficiario.nombreAcudiente &&
    beneficiario.whatsapp
  );
}

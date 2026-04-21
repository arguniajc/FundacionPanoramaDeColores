/**
 * authRules
 * Reglas de dominio de autenticación.
 */

/** Indica si el usuario tiene una sesión activa. */
export function estaAutenticado(user) {
  return !!user;
}

/** Devuelve el primer nombre del usuario para saludos. */
export function primerNombre(nombre) {
  if (!nombre) return '';
  return nombre.split(' ')[0];
}

/** Saludo según la hora del día. */
export function saludo() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

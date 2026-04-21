/**
 * authStorage
 * Abstrae el acceso a localStorage para la sesión del administrador.
 * El resto del código nunca toca localStorage directamente.
 */
const TOKEN_KEY = 'admin_token';
const USER_KEY  = 'admin_user';

export const getToken     = ()             => localStorage.getItem(TOKEN_KEY);

export const getUser      = ()             => {
  try   { return JSON.parse(localStorage.getItem(USER_KEY)); }
  catch { return null; }
};

export const saveSession  = (token, user)  => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY,  JSON.stringify(user));
};

export const clearSession = ()             => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

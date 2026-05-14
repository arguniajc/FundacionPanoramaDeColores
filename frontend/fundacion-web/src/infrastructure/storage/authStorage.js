const TOKEN_KEY    = 'admin_token';
const USER_KEY     = 'admin_user';
const ROL_KEY      = 'admin_rol';
const PERMISOS_KEY = 'admin_permisos';

export const getToken    = () => localStorage.getItem(TOKEN_KEY);
export const getRol      = () => localStorage.getItem(ROL_KEY) ?? '';
export const getPermisos = () => {
  try   { return JSON.parse(localStorage.getItem(PERMISOS_KEY) ?? '{}'); }
  catch { return {}; }
};
export const getUser = () => {
  try   { return JSON.parse(localStorage.getItem(USER_KEY)); }
  catch { return null; }
};

export const saveSession = (token, user, rol, permisos) => {
  localStorage.setItem(TOKEN_KEY,    token);
  localStorage.setItem(USER_KEY,     JSON.stringify(user));
  localStorage.setItem(ROL_KEY,      rol ?? '');
  localStorage.setItem(PERMISOS_KEY, JSON.stringify(permisos ?? {}));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROL_KEY);
  localStorage.removeItem(PERMISOS_KEY);
};

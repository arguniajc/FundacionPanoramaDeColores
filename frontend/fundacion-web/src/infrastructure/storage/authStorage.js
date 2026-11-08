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

// Datos de trabajo que no deben quedar en el navegador al cerrar sesión (computadores
// compartidos): borrador del formulario de un menor —también el que antes se guardaba
// en localStorage— y el donante elegido para una nueva donación.
const DATOS_DE_SESION = ['nuevo_beneficiario_draft', 'nuevaDonacionDonanteId', 'nuevaDonacionDonanteNombre'];

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROL_KEY);
  localStorage.removeItem(PERMISOS_KEY);
  DATOS_DE_SESION.forEach(k => localStorage.removeItem(k));
  // Caché de listados (beneficiarios, etc.) y borrador actual: todo lo de sessionStorage es del panel
  try { sessionStorage.clear(); } catch { /* sin acceso a sessionStorage: nada que limpiar */ }
};

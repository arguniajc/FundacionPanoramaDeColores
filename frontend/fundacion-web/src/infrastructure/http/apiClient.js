import axios from 'axios';
import { getToken, clearSession, saveSession } from '../storage/authStorage';
import logger from '@/shared/utils/logger';
import { LOGIN_URL } from '@/shared/constants/routes';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 30000,
});

// ── Request: inyectar JWT + log ───────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  logger.api.request(config.method, config.url, config.data);
  return config;
});

// ── Response: log + mensaje para el usuario + manejar 401 ────────────────────
// Cada error rechazado lleva `error.mensajeUsuario`: un texto claro en español
// listo para mostrar. Para un mensaje más específico (p. ej. el verbo de la
// acción o el texto de un duplicado) usar mensajeErrorApi(err, opciones).
apiClient.interceptors.response.use(
  (response) => {
    logger.api.response(response.config.method, response.config.url, response.status, response.data);
    return response;
  },
  (error) => {
    const { config, response } = error;
    logger.api.error(
      config?.method,
      config?.url,
      response?.status,
      response?.data,
      error.message
    );
    error.mensajeUsuario = mensajeErrorApi(error, { accion: 'completar la operación' });
    if (response?.status === 401 && !window.location.hash.includes('/acceso')) {
      // El servidor rechaza el token si al usuario le cambiaron el rol o lo desactivaron.
      // Se intenta renovar una vez: con rol nuevo, se recarga con el menú correcto;
      // si está desactivado (o la renovación falla) se cierra la sesión como siempre.
      if (!config?.url?.includes('/api/auth/renovar')) return renovarORedirigir(error);
      cerrarYSalir();
    }
    return Promise.reject(error);
  }
);

function cerrarYSalir() {
  clearSession();
  window.location.href = LOGIN_URL;
}

let renovacion = null; // una sola renovación aunque fallen varias peticiones a la vez
const ULTIMA_RENOVACION_401 = 'renovacion401';
async function renovarORedirigir(error) {
  // Evita un ciclo renovar → recargar → 401 si el problema no es el rol
  let reciente = false;
  try { reciente = Date.now() - Number(sessionStorage.getItem(ULTIMA_RENOVACION_401) ?? 0) < 30_000; } catch { /* sin sessionStorage */ }
  if (reciente) { cerrarYSalir(); return Promise.reject(error); }
  try {
    try { sessionStorage.setItem(ULTIMA_RENOVACION_401, String(Date.now())); } catch { /* sin sessionStorage */ }
    renovacion ??= apiClient.post('/api/auth/renovar').finally(() => { renovacion = null; });
    const { data } = await renovacion;
    saveSession(data.token, { email: data.email, nombre: data.nombre, avatarUrl: data.avatarUrl }, data.rol, data.permisos);
    window.location.reload();
  } catch {
    cerrarYSalir();
  }
  return Promise.reject(error);
}

export default apiClient;

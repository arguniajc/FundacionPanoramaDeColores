/**
 * apiClient
 * Instancia de Axios configurada para el backend de la fundación.
 * Responsabilidades:
 *   - Adjuntar el JWT en cada petición.
 *   - Redirigir a /acceso al recibir 401, sin entrar en loop si ya estamos ahí.
 */
import axios from 'axios';
import { getToken, clearSession } from '../storage/authStorage';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

// ── Request: inyectar JWT ─────────────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response: manejar 401 sin loop ───────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const enLogin = window.location.hash.includes('/acceso');
      if (!enLogin) {
        clearSession();
        window.location.href = '/#/acceso';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

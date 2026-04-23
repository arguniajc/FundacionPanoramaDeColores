import axios from 'axios';
import { getToken, clearSession } from '../storage/authStorage';
import logger from '../../shared/utils/logger';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

// ── Request: inyectar JWT + log ───────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  logger.api.request(config.method, config.url, config.data);
  return config;
});

// ── Response: log + manejar 401 ──────────────────────────────────────────────
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
    if (response?.status === 401) {
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

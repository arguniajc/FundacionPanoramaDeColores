// Cliente Axios preconfigurado con la URL del backend y JWT automático.
// Redirige a /acceso si el servidor responde 401 (token expirado o inválido).
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

// Adjunta el JWT en cada petición si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el servidor responde 401, limpia la sesión y redirige al login.
// La guarda estaEnLogin evita el loop: si /api/auth/google devuelve 401
// (credencial inválida), no redirigimos porque ya estamos en la pantalla de acceso.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const estaEnLogin = window.location.hash.includes('/acceso');
      if (!estaEnLogin) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/#/acceso';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

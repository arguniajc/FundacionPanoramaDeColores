import apiClient from '../http/apiClient';

export const configuracionRepository = {
  // Endpoint público — sin auth — incluye colores para la página de login
  obtenerPublica: () => apiClient.get('/api/configuracion/publica'),
  // Endpoint admin — requiere auth — datos completos para el panel
  obtener:  ()        => apiClient.get('/api/configuracion'),
  guardar:  (datos)   => apiClient.put('/api/configuracion', datos),
};

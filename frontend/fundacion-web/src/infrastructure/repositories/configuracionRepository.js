import apiClient from '../http/apiClient';

export const configuracionRepository = {
  // Endpoint público — sin auth — incluye colores para la página de login
  obtenerPublica: () => apiClient.get('/api/configuracion/publica'),
  // Endpoint admin — requiere auth — datos completos para el panel
  obtener:    ()       => apiClient.get('/api/configuracion'),
  guardar:    (datos)  => apiClient.put('/api/configuracion', datos),
  probarSmtp: ()       => apiClient.post('/api/configuracion/probar-smtp'),
  // Resumen diario de alertas por correo: { activo, hora (0–23, Colombia), ultimoEnvio }
  obtenerResumenDiario: ()      => apiClient.get('/api/configuracion/resumen-diario'),
  guardarResumenDiario: (datos) => apiClient.put('/api/configuracion/resumen-diario', datos),
};

import apiClient from '../http/apiClient';

export const configuracionRepository = {
  obtener: ()       => apiClient.get('/api/configuracion'),
  guardar: (datos)  => apiClient.put('/api/configuracion', datos),
};

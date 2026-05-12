import apiClient from '../http/apiClient';

export const donantesRepository = {
  listar:   (params)    => apiClient.get('/api/donantes', { params }),
  obtener:  (id)        => apiClient.get(`/api/donantes/${id}`),
  crear:    (datos)     => apiClient.post('/api/donantes', datos),
  editar:   (id, datos) => apiClient.put(`/api/donantes/${id}`, datos),
  toggle:   (id)        => apiClient.patch(`/api/donantes/${id}/toggle`),
  eliminar: (id)        => apiClient.delete(`/api/donantes/${id}`),
};

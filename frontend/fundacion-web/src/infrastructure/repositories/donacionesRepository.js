import apiClient from '../http/apiClient';

export const donacionesRepository = {
  listar:   (params)    => apiClient.get('/api/donaciones', { params }),
  obtener:  (id)        => apiClient.get(`/api/donaciones/${id}`),
  crear:    (datos)     => apiClient.post('/api/donaciones', datos),
  editar:   (id, datos) => apiClient.put(`/api/donaciones/${id}`, datos),
  eliminar: (id)        => apiClient.delete(`/api/donaciones/${id}`),
  stats:    ()          => apiClient.get('/api/donaciones/stats'),
};

import apiClient from '../http/apiClient';

export const donacionesRepository = {
  listar:        (params)    => apiClient.get('/api/donaciones', { params }),
  obtener:       (id)        => apiClient.get(`/api/donaciones/${id}`),
  crear:         (datos)     => apiClient.post('/api/donaciones', datos),
  editar:        (id, datos) => apiClient.put(`/api/donaciones/${id}`, datos),
  eliminar:      (id)        => apiClient.delete(`/api/donaciones/${id}`),
  stats:         ()          => apiClient.get('/api/donaciones/stats'),
  anular:        (id)        => apiClient.patch(`/api/donaciones/${id}/anular`),
  enviarRecibo:  (id)        => apiClient.post(`/api/donaciones/${id}/enviar-recibo`),
  logEmision:    (id, datos) => apiClient.post(`/api/donaciones/${id}/log-emision`, datos),
};

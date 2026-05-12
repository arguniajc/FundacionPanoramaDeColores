import apiClient from '../http/apiClient';

export const voluntariosRepository = {
  listar:             (params)    => apiClient.get('/api/voluntarios', { params }),
  obtener:            (id)        => apiClient.get(`/api/voluntarios/${id}`),
  crear:              (datos)     => apiClient.post('/api/voluntarios', datos),
  editar:             (id, datos) => apiClient.put(`/api/voluntarios/${id}`, datos),
  toggle:             (id)        => apiClient.patch(`/api/voluntarios/${id}/toggle`),
  eliminar:           (id)        => apiClient.delete(`/api/voluntarios/${id}`),
  stats:              ()          => apiClient.get('/api/voluntarios/stats'),
  listarAsignaciones: (id)        => apiClient.get(`/api/voluntarios/${id}/asignaciones`),
  agregarAsignacion:  (id, datos) => apiClient.post(`/api/voluntarios/${id}/asignaciones`, datos),
  editarAsignacion:   (asigId, datos) => apiClient.put(`/api/voluntarios/asignaciones/${asigId}`, datos),
  eliminarAsignacion: (asigId)        => apiClient.delete(`/api/voluntarios/asignaciones/${asigId}`),
};

import apiClient from '../http/apiClient';

export const inscripcionesRepository = {
  listar:        (params)    => apiClient.get('/api/inscripciones', { params }),
  obtener:       (id)        => apiClient.get(`/api/inscripciones/${id}`),
  crear:         (datos)     => apiClient.post('/api/inscripciones', datos),
  actualizar:    (id, datos) => apiClient.put(`/api/inscripciones/${id}`, datos),
  cambiarEstado: (id, estado) => apiClient.patch(`/api/inscripciones/${id}/estado`, { estado }),
  eliminar:      (id)        => apiClient.delete(`/api/inscripciones/${id}`),
};

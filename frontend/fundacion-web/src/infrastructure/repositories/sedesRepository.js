/**
 * sedesRepository
 * Único punto de contacto entre la aplicación y la API de sedes y programas.
 */
import apiClient from '../http/apiClient';

export const sedesRepository = {
  listar:           (params)    => apiClient.get('/api/sedes', { params }),
  obtener:          (id)        => apiClient.get(`/api/sedes/${id}`),
  crear:            (datos)     => apiClient.post('/api/sedes', datos),
  editar:           (id, datos) => apiClient.put(`/api/sedes/${id}`, datos),
  toggle:           (id)        => apiClient.patch(`/api/sedes/${id}/toggle`),
  eliminar:         (id)        => apiClient.delete(`/api/sedes/${id}`),

  listarProgramas:  (sedeId)    => apiClient.get(`/api/sedes/${sedeId}/programas`),
  crearPrograma:    (datos)     => apiClient.post('/api/sedes/programas', datos),
  editarPrograma:   (id, datos) => apiClient.put(`/api/sedes/programas/${id}`, datos),
  togglePrograma:   (id)        => apiClient.patch(`/api/sedes/programas/${id}/toggle`),
  eliminarPrograma: (id)        => apiClient.delete(`/api/sedes/programas/${id}`),

  listarCampos:     (programaId)           => apiClient.get(`/api/sedes/programas/${programaId}/campos`),
  crearCampo:       (programaId, datos)    => apiClient.post(`/api/sedes/programas/${programaId}/campos`, datos),
  editarCampo:      (programaId, id, datos) => apiClient.put(`/api/sedes/programas/${programaId}/campos/${id}`, datos),
  eliminarCampo:    (programaId, id)       => apiClient.delete(`/api/sedes/programas/${programaId}/campos/${id}`),
};

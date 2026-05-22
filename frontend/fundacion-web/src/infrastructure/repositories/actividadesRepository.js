import apiClient from '../http/apiClient';

export const actividadesRepository = {
  listar:  (params)    => apiClient.get('/api/actividades', { params }),
  obtener: (id)        => apiClient.get(`/api/actividades/${id}`),
  crear:   (dto)       => apiClient.post('/api/actividades', dto),
  actualizar: (id, dto) => apiClient.put(`/api/actividades/${id}`, dto),
  eliminar:   (id)     => apiClient.delete(`/api/actividades/${id}`),
  asistencia:          (id)       => apiClient.get(`/api/actividades/${id}/asistencia`),
  registrarAsistencia: (id, dto)  => apiClient.post(`/api/actividades/${id}/asistencia`, dto),

  // Horarios recurrentes por programa
  listarHorarios:     (programaId) => apiClient.get('/api/actividades/horarios', { params: programaId ? { programaId } : {} }),
  crearHorario:       (dto)        => apiClient.post('/api/actividades/horarios', dto),
  actualizarHorario:  (id, dto)    => apiClient.put(`/api/actividades/horarios/${id}`, dto),
  eliminarHorario:    (id)         => apiClient.delete(`/api/actividades/horarios/${id}`),
};

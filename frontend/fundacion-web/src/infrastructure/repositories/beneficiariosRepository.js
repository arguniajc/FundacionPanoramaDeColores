/**
 * beneficiariosRepository
 * Único punto de contacto entre la aplicación y la API de beneficiarios.
 * Si la URL del endpoint cambia, solo se toca este archivo.
 */
import apiClient from '../http/apiClient';

export const beneficiariosRepository = {
  listar:          (params)      => apiClient.get('/api/beneficiarios', { params }),
  obtener:         (id)          => apiClient.get(`/api/beneficiarios/${id}`),
  stats:           ()            => apiClient.get('/api/beneficiarios/stats'),
  verificarDoc:    (numero)      => apiClient.get(`/api/beneficiarios/verificar-documento/${numero}`),
  crear:           (datos)       => apiClient.post('/api/beneficiarios', datos),
  editar:          (id, datos)   => apiClient.put(`/api/beneficiarios/${id}`, datos),
  baja:            (id, motivo)  => apiClient.patch(`/api/beneficiarios/${id}/baja`, { motivo }),
  reactivar:       (id)          => apiClient.patch(`/api/beneficiarios/${id}/reactivar`),
  eliminar:        (id)          => apiClient.delete(`/api/beneficiarios/${id}`),
};

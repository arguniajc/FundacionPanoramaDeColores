import apiClient from '../http/apiClient';

export const nominaRepository = {
  listarPeriodos:    (anio)         => apiClient.get('/api/nomina/periodos', { params: anio ? { anio } : {} }),
  obtenerPeriodo:    (id)           => apiClient.get(`/api/nomina/periodos/${id}`),
  crearPeriodo:      (datos)        => apiClient.post('/api/nomina/periodos', datos),
  cerrarPeriodo:     (id)           => apiClient.post(`/api/nomina/periodos/${id}/cerrar`),
  eliminarPeriodo:   (id)           => apiClient.delete(`/api/nomina/periodos/${id}`),
  listarLiquidaciones: (periodoId)  => apiClient.get(`/api/nomina/periodos/${periodoId}/liquidaciones`),
  autoLiquidar:      (periodoId, datos) => apiClient.post(`/api/nomina/periodos/${periodoId}/auto-liquidar`, datos),
  liquidarEmpleado:  (periodoId, datos) => apiClient.post(`/api/nomina/periodos/${periodoId}/liquidaciones`, datos),
  eliminarLiquidacion: (id)         => apiClient.delete(`/api/nomina/liquidaciones/${id}`),
};

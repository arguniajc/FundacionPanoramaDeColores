import apiClient from '../http/apiClient';

export const contabilidadRepository = {
  listarCuentas:    ()           => apiClient.get('/api/contabilidad/cuentas'),
  listarCategorias: (tipo)       => apiClient.get('/api/contabilidad/categorias', { params: tipo ? { tipo } : {} }),
  crearMovimiento:  (datos)      => apiClient.post('/api/contabilidad/movimientos', datos),
  reporte:          (mes, anio)  => apiClient.get('/api/contabilidad/reporte', { params: { mes, anio } }),
  resumenAnual:     (anio)       => apiClient.get('/api/contabilidad/resumen-anual', { params: { anio } }),
};

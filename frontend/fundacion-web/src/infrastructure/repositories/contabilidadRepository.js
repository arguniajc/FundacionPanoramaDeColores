import apiClient from '../http/apiClient';

export const contabilidadRepository = {
  listarCuentas:    ()      => apiClient.get('/api/contabilidad/cuentas'),
  listarCategorias: (tipo)  => apiClient.get('/api/contabilidad/categorias', { params: tipo ? { tipo } : {} }),
  crearMovimiento:  (datos) => apiClient.post('/api/contabilidad/movimientos', datos),
};

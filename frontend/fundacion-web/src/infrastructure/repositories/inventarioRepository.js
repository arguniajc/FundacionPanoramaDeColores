import apiClient from '../http/apiClient';

export const inventarioRepository = {
  // Items
  listarItems:     (params)    => apiClient.get('/api/inventario/items', { params }),
  obtenerItem:     (id)        => apiClient.get(`/api/inventario/items/${id}`),
  crearItem:       (datos)     => apiClient.post('/api/inventario/items', datos),
  actualizarItem:  (id, datos) => apiClient.put(`/api/inventario/items/${id}`, datos),
  eliminarItem:    (id)        => apiClient.delete(`/api/inventario/items/${id}`),

  // Movimientos
  listarMovimientos: (params)  => apiClient.get('/api/inventario/movimientos', { params }),
  registrarMovimiento: (datos) => apiClient.post('/api/inventario/movimientos', datos),

  // Catálogo de tipos
  listarTipos: ()              => apiClient.get('/api/inventario/tipos'),

  // Estadísticas
  stats: ()                    => apiClient.get('/api/inventario/stats'),
};

import apiClient from '../http/apiClient';

export const inventarioRepository = {
  // Items
  listarItems:     (params)    => apiClient.get('/api/inventario/items', { params }),
  obtenerItem:     (id)        => apiClient.get(`/api/inventario/items/${id}`),
  crearItem:       (datos)     => apiClient.post('/api/inventario/items', datos),
  actualizarItem:  (id, datos) => apiClient.put(`/api/inventario/items/${id}`, datos),
  eliminarItem:    (id)        => apiClient.delete(`/api/inventario/items/${id}`),

  // Movimientos
  listarMovimientos:   (params) => apiClient.get('/api/inventario/movimientos', { params }),
  registrarMovimiento: (datos)  => apiClient.post('/api/inventario/movimientos', datos),

  // Transferencia entre sedes
  transferir: (datos) => apiClient.post('/api/inventario/transferencia', datos),

  // Catálogo de tipos
  listarTipos: () => apiClient.get('/api/inventario/tipos'),

  // Donantes (autocomplete)
  buscarDonantes: (buscar) => apiClient.get('/api/inventario/donantes', { params: buscar ? { buscar } : {} }),

  // Estadísticas (opcional: filtrar por sedeId)
  stats: (params) => apiClient.get('/api/inventario/stats', { params }),

  // Ingresar artículo al inventario desde una donación en especie
  ingresarDesdeDonacion: (datos) => apiClient.post('/api/inventario/desde-donacion', datos),

  // Comodatos próximos a vencer
  comodatosProximos: (dias = 30) => apiClient.get('/api/inventario/comodatos-proximos', { params: { dias } }),
};

import apiClient from '../http/apiClient';

export const talentoHumanoRepository = {
  stats: () => apiClient.get('/api/talento-humano/stats'),
  obtener: (id) => apiClient.get(`/api/talento-humano/${id}`),
  /** { numero, excluirId? } → { existe, id, nombre }: ¿otro empleado ya tiene ese documento? */
  verificarDocumento: (datos) => apiClient.post('/api/talento-humano/verificar-documento', datos),
};

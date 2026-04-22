import apiClient from '../http/apiClient';

export const documentosRepository = {
  listarInstitucionales: (categoria) =>
    apiClient.get('/api/documentos', {
      params: categoria ? { categoria } : {},
    }),

  crearInstitucional: (dto) =>
    apiClient.post('/api/documentos', dto),

  eliminarInstitucional: (id) =>
    apiClient.delete(`/api/documentos/${id}`),

  listarPorBeneficiario: (beneficiarioId) =>
    apiClient.get(`/api/documentos/beneficiario/${beneficiarioId}`),

  guardarArchivoBeneficiario: (beneficiarioId, dto) =>
    apiClient.post(`/api/documentos/beneficiario/${beneficiarioId}`, dto),

  eliminarArchivo: (id) =>
    apiClient.delete(`/api/documentos/archivo/${id}`),
};

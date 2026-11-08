import apiClient from '../http/apiClient';

export const documentosRepository = {
  listarInstitucionales: (categoria) =>
    apiClient.get('/api/documentos', {
      params: categoria ? { categoria } : {},
    }),

  crearInstitucional: (dto) =>
    apiClient.post('/api/documentos', dto),

  /** PUT: título, categoría y descripción (el archivo no se cambia). */
  editarInstitucional: (id, dto) =>
    apiClient.put(`/api/documentos/${id}`, dto),

  eliminarInstitucional: (id) =>
    apiClient.delete(`/api/documentos/${id}`),

  listarPorBeneficiario: (beneficiarioId) =>
    apiClient.get(`/api/documentos/beneficiario/${beneficiarioId}`),

  guardarArchivoBeneficiario: (beneficiarioId, dto) =>
    apiClient.post(`/api/documentos/beneficiario/${beneficiarioId}`, dto),

  /** PUT: nombre visible del archivo de un beneficiario. */
  editarArchivo: (id, dto) =>
    apiClient.put(`/api/documentos/archivo/${id}`, dto),

  eliminarArchivo: (id) =>
    apiClient.delete(`/api/documentos/archivo/${id}`),
};

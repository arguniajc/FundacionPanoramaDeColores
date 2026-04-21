/**
 * archivosRepository
 * Subida de archivos a Supabase Storage y auditoría de descargas.
 */
import apiClient from '../http/apiClient';

export const archivosRepository = {
  subir: (archivo, carpeta = 'fotos') => {
    const form = new FormData();
    form.append('archivo', archivo);
    return apiClient.post(`/api/archivos/upload?carpeta=${carpeta}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  logDescargas:  (params) => apiClient.get('/api/archivos/log-descargas', { params }),
  registrarDescarga: (datos) => apiClient.post('/api/archivos/log-descarga', datos),
};

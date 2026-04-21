/**
 * useArchivoUpload
 * Caso de uso: subir un archivo a Supabase Storage y obtener la URL pública.
 */
import { useState } from 'react';
import { archivosRepository } from '../../infrastructure/repositories/archivosRepository';

export function useArchivoUpload() {
  const [subiendo,  setSubiendo]  = useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');

  const subir = async (archivo, carpeta = 'fotos') => {
    setSubiendo(true);
    setErrorMsg('');
    try {
      const { data } = await archivosRepository.subir(archivo, carpeta);
      return data.url;
    } catch (err) {
      const msg = err.response?.data?.mensaje ?? 'Error al subir el archivo.';
      setErrorMsg(msg);
      return null;
    } finally {
      setSubiendo(false);
    }
  };

  return { subir, subiendo, errorMsg, setErrorMsg };
}

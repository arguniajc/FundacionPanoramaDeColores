import { useState, useCallback } from 'react';
import { documentosRepository } from '../../infrastructure/repositories/documentosRepository';

export function useDocumentosBeneficiario() {
  const [archivos,  setArchivos]  = useState([]);
  const [cargando,  setCargando]  = useState(false);
  const [error,     setError]     = useState('');

  const cargar = useCallback(async (beneficiarioId) => {
    if (!beneficiarioId) { setArchivos([]); return; }
    setCargando(true);
    setError('');
    try {
      const { data } = await documentosRepository.listarPorBeneficiario(beneficiarioId);
      setArchivos(data);
    } catch {
      setError('No se pudo cargar los archivos del beneficiario.');
    } finally {
      setCargando(false);
    }
  }, []);

  const guardar = async (beneficiarioId, dto) => {
    await documentosRepository.guardarArchivoBeneficiario(beneficiarioId, dto);
    await cargar(beneficiarioId);
  };

  const eliminar = async (id, beneficiarioId) => {
    await documentosRepository.eliminarArchivo(id);
    await cargar(beneficiarioId);
  };

  return { archivos, cargando, error, cargar, guardar, eliminar };
}

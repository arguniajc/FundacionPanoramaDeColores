import { useState, useEffect, useCallback } from 'react';
import { documentosRepository } from '../../infrastructure/repositories/documentosRepository';

export function useDocumentosInstitucionales(categoriaFiltro) {
  const [documentos, setDocumentos] = useState([]);
  const [cargando,   setCargando]   = useState(false);
  const [error,      setError]      = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const { data } = await documentosRepository.listarInstitucionales(categoriaFiltro);
      setDocumentos(data);
    } catch {
      setError('No se pudo cargar los documentos.');
    } finally {
      setCargando(false);
    }
  }, [categoriaFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (dto) => {
    await documentosRepository.crearInstitucional(dto);
    await cargar();
  };

  const eliminar = async (id) => {
    await documentosRepository.eliminarInstitucional(id);
    setDocumentos(prev => prev.filter(d => d.id !== id));
  };

  return { documentos, cargando, error, cargar, crear, eliminar };
}

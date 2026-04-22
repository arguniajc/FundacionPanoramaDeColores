import { useState, useEffect, useCallback } from 'react';
import { documentosRepository } from '../../infrastructure/repositories/documentosRepository';

// Siempre carga todos los documentos; el filtrado de categoría se hace en el componente
// para poder contar documentos por categoría sin peticiones adicionales.
export function useDocumentosInstitucionales() {
  const [documentos, setDocumentos] = useState([]);
  const [cargando,   setCargando]   = useState(false);
  const [error,      setError]      = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const { data } = await documentosRepository.listarInstitucionales();
      setDocumentos(data);
    } catch {
      setError('No se pudo cargar los documentos.');
    } finally {
      setCargando(false);
    }
  }, []);

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

import { useEffect } from 'react';
import { documentosRepository } from '@/infrastructure/repositories/documentosRepository';
import { useAsyncData } from '@/shared/hooks/useAsyncData';

// Siempre carga todos los documentos; el filtrado de categoría se hace en el componente
// para poder contar documentos por categoría sin peticiones adicionales.
export function useDocumentosInstitucionales() {
  const {
    data: documentos,
    cargando,
    error,
    ejecutar: cargar,
    setData: setDocumentos,
  } = useAsyncData(
    async () => (await documentosRepository.listarInstitucionales()).data,
    { inicial: [], errorMsg: 'No se pudo cargar los documentos.' }
  );

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

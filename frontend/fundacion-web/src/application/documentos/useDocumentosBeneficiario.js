import { documentosRepository } from '../../infrastructure/repositories/documentosRepository';
import { useAsyncData } from '../../shared/hooks/useAsyncData';

export function useDocumentosBeneficiario() {
  const {
    data: archivos,
    cargando,
    error,
    ejecutar: cargar,
  } = useAsyncData(
    async (beneficiarioId) => {
      if (!beneficiarioId) return [];
      return (await documentosRepository.listarPorBeneficiario(beneficiarioId)).data;
    },
    { inicial: [], errorMsg: 'No se pudo cargar los archivos del beneficiario.' }
  );

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

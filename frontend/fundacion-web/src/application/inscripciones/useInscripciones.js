import { inscripcionesRepository } from '@/infrastructure/repositories/inscripcionesRepository';
import { useAsyncData } from '@/shared/hooks/useAsyncData';

export function useInscripciones(filtros = {}) {
  const {
    data: inscripciones,
    cargando,
    error,
    ejecutar: cargar,
    setData: setInscripciones,
  } = useAsyncData(
    async (params = filtros) => (await inscripcionesRepository.listar(params)).data,
    { inicial: [], errorMsg: 'No se pudieron cargar las inscripciones.' }
  );

  const crear = async (dto) => {
    const { data } = await inscripcionesRepository.crear(dto);
    setInscripciones(prev => [data, ...prev]);
    return data;
  };

  const actualizar = async (id, dto) => {
    const { data } = await inscripcionesRepository.actualizar(id, dto);
    setInscripciones(prev => prev.map(i => i.id === id ? data : i));
    return data;
  };

  // Refleja en la lista una inscripción que ya se guardó en otro lugar (sin volver a llamar a la API)
  const reemplazarLocal = (data) =>
    setInscripciones(prev => prev.map(i => i.id === data.id ? data : i));

  const cambiarEstado = async (id, estado) => {
    const { data } = await inscripcionesRepository.cambiarEstado(id, estado);
    setInscripciones(prev => prev.map(i => i.id === id ? data : i));
  };

  const eliminar = async (id) => {
    await inscripcionesRepository.eliminar(id);
    setInscripciones(prev => prev.filter(i => i.id !== id));
  };

  return { inscripciones, cargando, error, cargar, crear, actualizar, reemplazarLocal, cambiarEstado, eliminar };
}

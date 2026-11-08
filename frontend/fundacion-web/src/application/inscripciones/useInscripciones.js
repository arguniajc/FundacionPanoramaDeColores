import { inscripcionesRepository } from '@/infrastructure/repositories/inscripcionesRepository';
import { useAsyncData } from '@/shared/hooks/useAsyncData';
import { obtenerTodasLasPaginas } from '@/shared/utils/paginas';

/**
 * Listado paginado en el servidor: cargar({ pagina, porPagina, buscar, programaId, estado })
 * guarda la página pedida; `total` es el total de registros del filtro.
 */
export function useInscripciones() {
  const {
    data: pagina,
    cargando,
    error,
    ejecutar: cargar,
    setData: setPagina,
  } = useAsyncData(
    async (params = {}) => (await inscripcionesRepository.listar(params)).data,
    { inicial: { data: [], total: 0 }, errorMsg: 'No se pudieron cargar las inscripciones.' }
  );

  const inscripciones = pagina?.data ?? [];
  const total         = pagina?.total ?? 0;

  // Cambia la página en memoria (sin volver a llamar a la API)
  const editarLista = (fn, deltaTotal = 0) =>
    setPagina(p => ({ ...p, data: fn(p?.data ?? []), total: Math.max(0, (p?.total ?? 0) + deltaTotal) }));

  const crear = async (dto) => {
    const { data } = await inscripcionesRepository.crear(dto);
    editarLista(prev => [data, ...prev], 1);
    return data;
  };

  const actualizar = async (id, dto) => {
    const { data } = await inscripcionesRepository.actualizar(id, dto);
    editarLista(prev => prev.map(i => i.id === id ? data : i));
    return data;
  };

  // Refleja en la lista una inscripción que ya se guardó en otro lugar (sin volver a llamar a la API)
  const reemplazarLocal = (data) =>
    editarLista(prev => prev.map(i => i.id === data.id ? data : i));

  const cambiarEstado = async (id, estado) => {
    const { data } = await inscripcionesRepository.cambiarEstado(id, estado);
    editarLista(prev => prev.map(i => i.id === id ? data : i));
  };

  const eliminar = async (id) => {
    await inscripcionesRepository.eliminar(id);
    editarLista(prev => prev.filter(i => i.id !== id), -1);
  };

  /** Todas las inscripciones del filtro (todas las páginas), p. ej. para exportar. */
  const listarTodas = (filtros = {}) => obtenerTodasLasPaginas(inscripcionesRepository.listar, filtros);

  return { inscripciones, total, cargando, error, cargar, crear, actualizar, reemplazarLocal, cambiarEstado, eliminar, listarTodas };
}

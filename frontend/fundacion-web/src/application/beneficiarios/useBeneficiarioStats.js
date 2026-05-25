/**
 * useBeneficiarioStats
 * Caso de uso: cargar estadísticas globales de beneficiarios.
 * Un solo request devuelve el banner (total/activos/baja) y el detalle del modal.
 */
import { beneficiariosRepository } from '../../infrastructure/repositories/beneficiariosRepository';
import { useAsyncData } from '../../shared/hooks/useAsyncData';

export function useBeneficiarioStats() {
  const { data: detalle, cargando, ejecutar: recargar } = useAsyncData(
    async () => (await beneficiariosRepository.stats()).data,
    { errorMsg: '' }
  );

  const banner = {
    activos: detalle?.activos ?? 0,
    baja:    detalle?.baja    ?? 0,
    total:   detalle?.total   ?? 0,
  };

  return { detalle, banner, cargando, recargar };
}

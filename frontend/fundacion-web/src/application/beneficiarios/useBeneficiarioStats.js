/**
 * useBeneficiarioStats
 * Caso de uso: cargar estadísticas globales de beneficiarios.
 * Un solo request devuelve el banner (total/activos/baja) y el detalle del modal.
 */
import { useState, useCallback } from 'react';
import { beneficiariosRepository } from '../../infrastructure/repositories/beneficiariosRepository';

export function useBeneficiarioStats() {
  const [detalle,      setDetalle]      = useState(null);
  const [banner,       setBanner]       = useState({ activos: 0, baja: 0, total: 0 });
  const [cargando,     setCargando]     = useState(false);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await beneficiariosRepository.stats();
      setDetalle(data);
      setBanner({
        activos: data.activos ?? 0,
        baja:    data.baja    ?? 0,
        total:   data.total   ?? 0,
      });
    } catch { /* silencioso — el banner muestra 0s */ }
    finally { setCargando(false); }
  }, []);

  return { detalle, banner, cargando, recargar };
}

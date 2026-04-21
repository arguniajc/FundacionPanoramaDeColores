/**
 * useBeneficiarios
 * Caso de uso: listar beneficiarios con paginación y caché stale-while-revalidate.
 * La UI muestra datos cacheados inmediatamente mientras actualiza en segundo plano.
 */
import { useState, useEffect, useCallback } from 'react';
import { beneficiariosRepository } from '../../infrastructure/repositories/beneficiariosRepository';
import { cacheKey, leerCache, escribirCache } from '../../infrastructure/cache/sessionCache';

const POR_PAGINA = 15;

export function useBeneficiarios({ pagina, buscar, estado }) {
  const [items,        setItems]        = useState([]);
  const [total,        setTotal]        = useState(0);
  const [cargando,     setCargando]     = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [error,        setError]        = useState('');

  const cargar = useCallback(async (forzar = false) => {
    const key    = cacheKey(estado, pagina, buscar);
    const cached = !forzar && leerCache(key);

    if (cached) {
      setItems(cached.data);
      setTotal(cached.total);
      setActualizando(true);
      try {
        const { data } = await beneficiariosRepository.listar({
          pagina, porPagina: POR_PAGINA, buscar: buscar || undefined, estado,
        });
        setItems(data.data);
        setTotal(data.total);
        escribirCache(key, data.data, data.total);
      } catch { /* mantener caché si falla la red */ }
      finally { setActualizando(false); }
      return;
    }

    setCargando(true);
    setActualizando(false);
    setError('');
    try {
      const { data } = await beneficiariosRepository.listar({
        pagina, porPagina: POR_PAGINA, buscar: buscar || undefined, estado,
      });
      setItems(data.data);
      setTotal(data.total);
      escribirCache(key, data.data, data.total);
    } catch {
      setError('No se pudieron cargar los beneficiarios.');
    } finally {
      setCargando(false);
    }
  }, [pagina, buscar, estado]);

  useEffect(() => { cargar(); }, [cargar]);

  return { items, total, cargando, actualizando, error, recargar: cargar, POR_PAGINA };
}

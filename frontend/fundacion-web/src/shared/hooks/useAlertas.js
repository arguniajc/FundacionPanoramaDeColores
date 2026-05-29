import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/infrastructure/http/apiClient';

const INTERVALO_MS = 5 * 60 * 1000;

export function useAlertas() {
  const [alertas, setAlertas] = useState([]);

  const cargar = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/alertas');
      setAlertas(Array.isArray(data) ? data : []);
    } catch { /* silencioso — no interrumpir la sesión por fallos de alertas */ }
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  const totalAlertas = alertas.reduce((s, a) => s + (a.valor ?? 0), 0);

  const porModulo = (modulo) =>
    alertas
      .filter(a => a.modulo === modulo)
      .reduce((s, a) => s + (a.valor ?? 0), 0);

  return { alertas, totalAlertas, porModulo };
}

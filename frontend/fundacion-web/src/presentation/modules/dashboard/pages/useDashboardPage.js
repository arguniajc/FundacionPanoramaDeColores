import { useEffect, useState } from 'react';
import { useAuth } from '@/application/auth/useAuth';
import { useThemeMode } from '@/shared/theme/useThemeMode';
import { useAsyncData }               from '@/shared/hooks/useAsyncData';
import { useToast } from '@/shared/context/useToast';
import { beneficiariosRepository }    from '@/infrastructure/repositories/beneficiariosRepository';
import { useAlertas }                 from '@/shared/hooks/useAlertas';
import { COLORES_GENERO } from './components/coloresGenero';

const COLORES_RANGO = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

export function useDashboardPage() {
  const { user } = useAuth();
  const { mode } = useThemeMode();
  const toast    = useToast();

  const hora   = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

  // Las mismas alertas de la campana, calculadas y filtradas por permiso en el servidor
  const { alertas } = useAlertas();
  const [deptoExpandido,  setDeptoExpandido]  = useState(null);

  const { data: stats, cargando, error: errorStats, ejecutar: cargarStats } = useAsyncData(
    async () => (await beneficiariosRepository.statsNinos()).data,
    { errorMsg: 'No se pudieron cargar las estadísticas del panel.' }
  );

  useEffect(() => { cargarStats(); }, [cargarStats]);
  useEffect(() => { if (errorStats) toast(errorStats, 'error'); }, [errorStats, toast]);

  const chartData = stats?.porRango?.map((r, i) => ({
    ...r, color: COLORES_RANGO[i], label: r.codigo,
  })) ?? [];

  const generoData = stats?.porGenero?.map(g => ({
    ...g, color: COLORES_GENERO[g.genero] ?? '#94a3b8',
  })) ?? [];

  const maxDepto = Math.max(...(stats?.departamentosConCiudades?.map(d => d.total) ?? [1]), 1);
  const maxPais  = Math.max(...(stats?.topPaises?.map(p => p.total) ?? [1]), 1);

  return {
    user, mode, saludo,
    alertas,
    stats, cargando,
    deptoExpandido, setDeptoExpandido,
    chartData, generoData,
    maxDepto, maxPais,
  };
}

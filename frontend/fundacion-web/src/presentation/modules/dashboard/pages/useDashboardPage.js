import { useEffect, useState } from 'react';
import { useAuth }                    from '@/application/auth/AuthContext';
import { useThemeMode }               from '@/shared/theme/ThemeContext';
import { useAsyncData }               from '@/shared/hooks/useAsyncData';
import { beneficiariosRepository }    from '@/infrastructure/repositories/beneficiariosRepository';
import { talentoHumanoRepository }    from '@/infrastructure/repositories/talentoHumanoRepository';
import { inventarioRepository }       from '@/infrastructure/repositories/inventarioRepository';
import { COLORES_GENERO }             from './components/DashboardHelpers';

const COLORES_RANGO = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

export function useDashboardPage() {
  const { user } = useAuth();
  const { mode } = useThemeMode();

  const hora   = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

  const [alertas,         setAlertas]         = useState(null);
  const [deptoExpandido,  setDeptoExpandido]  = useState(null);

  const { data: stats, cargando, ejecutar: cargarStats } = useAsyncData(
    async () => (await beneficiariosRepository.statsNinos()).data,
    { errorMsg: '' }
  );

  useEffect(() => { cargarStats(); }, [cargarStats]);

  useEffect(() => {
    Promise.all([
      talentoHumanoRepository.stats(),
      inventarioRepository.stats(),
      inventarioRepository.comodatosProximos(),
    ]).then(([th, inv, com]) => {
      const contratosVencer     = th.data.contratosProximosVencer ?? 0;
      const novedadesPendientes = th.data.novedadesPendientes     ?? 0;
      const stockBajo           = inv.data.stockBajo              ?? 0;
      const sinStock            = inv.data.sinStock               ?? 0;
      const comodatosVencer     = Array.isArray(com.data) ? com.data.length : 0;
      if (contratosVencer > 0 || novedadesPendientes > 0 || stockBajo > 0 || sinStock > 0 || comodatosVencer > 0)
        setAlertas({ contratosVencer, novedadesPendientes, stockBajo, sinStock, comodatosVencer });
    }).catch(() => {});
  }, []);

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

import { useEffect } from 'react';
import { useAsyncData } from '@/shared/hooks/useAsyncData';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@/application/auth/useAuth';
import apiClient   from '@/infrastructure/http/apiClient';
import { obtenerTodasLasPaginas } from '@/shared/utils/paginas';
import { OrgChartTab } from '@/presentation/modules/talento_humano/pages/components/OrgChartTab';
import { BRAND_COLOR } from '@/shared/constants/brand';

const COLOR = BRAND_COLOR;

export default function OrganigramaPage() {
  const { puedo }  = useAuth();
  const { data: empleados, cargando, error, ejecutar: cargar } = useAsyncData(
    // El listado es paginado (máx. 100 por página): para elegir empleado se piden todas las páginas
    () => obtenerTodasLasPaginas(params => apiClient.get('/api/talento-humano', { params })),
    { inicial: [], errorMsg: 'No se pudieron cargar los empleados.' }
  );

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box sx={{ width: 4, height: 26, borderRadius: 1, bgcolor: COLOR }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>Organigrama</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            Estructura organizacional de la fundación
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {cargando
        ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
        : <OrgChartTab puedoEditar={puedo('talento_humano', 'editar')} empleados={empleados} />
      }
    </Box>
  );
}

import { useEffect } from 'react';
import { useAsyncData } from '../../../../shared/hooks/useAsyncData';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../../../../application/auth/AuthContext';
import apiClient   from '../../../../infrastructure/http/apiClient';
import { OrgChartTab } from '../../talento_humano/pages/components/OrgChartTab';
import { BRAND_COLOR } from '../../../../shared/constants/brand';

const COLOR = BRAND_COLOR;

export default function OrganigramaPage() {
  const { puedo }  = useAuth();
  const { data: empleados, cargando, ejecutar: cargar } = useAsyncData(
    async () => {
      const { data } = await apiClient.get('/api/talento-humano', { params: { porPagina: 200 } });
      return data.data ?? data ?? [];
    },
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

      {cargando
        ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
        : <OrgChartTab puedoEditar={puedo('talento_humano', 'editar')} empleados={empleados} />
      }
    </Box>
  );
}

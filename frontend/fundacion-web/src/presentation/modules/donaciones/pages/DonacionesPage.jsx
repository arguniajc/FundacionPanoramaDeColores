import { useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import AttachMoneyIcon       from '@mui/icons-material/AttachMoney';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { COLOR_DONANTES }  from './components/helpers';
import { TabDonantes }     from './components/TabDonantes';
import { TabDonaciones }   from './components/TabDonaciones';

export default function DonacionesPage() {
  const [tab, setTab] = useState(0);
  const [donanteParaDonacion, setDonanteParaDonacion] = useState(null);

  const abrirDonacionDesde = (donante) => {
    setDonanteParaDonacion(donante);
    setTab(1);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 26, borderRadius: 1, bgcolor: COLOR_DONANTES }} />
          <Typography variant="h5" fontWeight={800}>Donantes y Donaciones</Typography>
        </Box>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', pl: 0.5 }}>
          Gestión de donantes y registro de donaciones en dinero o especie
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Donantes"   icon={<VolunteerActivismIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label="Donaciones" icon={<AttachMoneyIcon       sx={{ fontSize: 18 }} />} iconPosition="start" />
      </Tabs>

      {tab === 0 && <TabDonantes onNuevaDonacion={abrirDonacionDesde} />}
      {tab === 1 && (
        <TabDonaciones
          donanteInicial={donanteParaDonacion}
          onClearDonanteInicial={() => setDonanteParaDonacion(null)}
        />
      )}
    </Box>
  );
}

import { useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import EventIcon             from '@mui/icons-material/Event';
import FolderIcon            from '@mui/icons-material/Folder';
import InventoryIcon         from '@mui/icons-material/Inventory';
import PeopleIcon            from '@mui/icons-material/People';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { TabBeneficiarios } from './components/TabBeneficiarios';
import { TabProgramas }     from './components/TabProgramas';
import { TabInventario }    from './components/TabInventario';
import { TabActividades }   from './components/TabActividades';
import { TabDonaciones }    from './components/TabDonaciones';

const TABS = [
  { label: 'Beneficiarios', icon: <PeopleIcon />,            component: <TabBeneficiarios /> },
  { label: 'Programas',     icon: <FolderIcon />,            component: <TabProgramas /> },
  { label: 'Inventario',    icon: <InventoryIcon />,          component: <TabInventario /> },
  { label: 'Actividades',   icon: <EventIcon />,              component: <TabActividades /> },
  { label: 'Donaciones',    icon: <VolunteerActivismIcon />,  component: <TabDonaciones /> },
];

export default function ReportesPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Reportes y Estadísticas</Typography>
        <Typography variant="body2" color="text.secondary">
          Visualización de datos e indicadores clave por módulo
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        {TABS.map((t, i) => (
          <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" sx={{ minHeight: 48, gap: 0.5 }} />
        ))}
      </Tabs>

      {TABS[tab].component}
    </Box>
  );
}

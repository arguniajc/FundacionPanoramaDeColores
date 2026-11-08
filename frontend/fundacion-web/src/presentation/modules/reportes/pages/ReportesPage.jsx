import { useState, useRef } from 'react';
import { Box, Button, CircularProgress, Tab, Tabs, Typography, useTheme } from '@mui/material';
import DownloadIcon          from '@mui/icons-material/Download';
import EventIcon             from '@mui/icons-material/Event';
import FolderIcon            from '@mui/icons-material/Folder';
import InventoryIcon         from '@mui/icons-material/Inventory';
import PeopleIcon            from '@mui/icons-material/People';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import AccountBalanceIcon    from '@mui/icons-material/AccountBalance';
import { TabBeneficiarios }      from './components/TabBeneficiarios';
import { TabProgramas }          from './components/TabProgramas';
import { TabInventario }         from './components/TabInventario';
import { TabActividades }        from './components/TabActividades';
import { TabDonaciones }         from './components/TabDonaciones';
import { TabContabilidadEsal }   from './components/TabContabilidadEsal';
import { useToast } from '@/shared/context/useToast';
import { fechaLocalISO } from '@/shared/utils/fecha';
import { registrarExportacion } from '@/shared/utils/exportarExcel';
import usePermisos from '@/shared/hooks/usePermisos';
import { useConfiguracion } from '@/shared/context/useConfiguracion';
import { PALETA } from '@/shared/theme/paleta';
import { exportarReportePdf } from './pdfReporte';

const TABS = [
  { label: 'Beneficiarios',     icon: <PeopleIcon />,            component: <TabBeneficiarios /> },
  { label: 'Programas',         icon: <FolderIcon />,            component: <TabProgramas /> },
  { label: 'Inventario',        icon: <InventoryIcon />,         component: <TabInventario /> },
  { label: 'Actividades',       icon: <EventIcon />,             component: <TabActividades /> },
  { label: 'Donaciones',        icon: <VolunteerActivismIcon />, component: <TabDonaciones /> },
  { label: 'Contabilidad ESAL', icon: <AccountBalanceIcon />,   component: <TabContabilidadEsal /> },
];

export default function ReportesPage() {
  const [tab,        setTab]        = useState(0);
  const [exportando, setExportando] = useState(false);
  const contentRef = useRef(null);
  const toast      = useToast();
  const { puedo }  = usePermisos();
  const theme      = useTheme();
  const { colorPrimario } = useConfiguracion();

  const exportarPDF = async () => {
    if (!contentRef.current) return;
    setExportando(true);
    try {
      const archivo = `reporte_${TABS[tab].label.toLowerCase()}_${fechaLocalISO()}.pdf`;
      // En modo oscuro el PDF se recolorea en claro sobre el clon que captura
      // html2canvas: la pantalla del usuario no cambia.
      await exportarReportePdf({
        elemento: contentRef.current,
        titulo: TABS[tab].label,
        archivo,
        oscuro: theme.palette.mode === 'dark',
        paresColor: [[theme.palette.primary.main, colorPrimario || PALETA.light.primario.main]],
      });
      registrarExportacion(archivo, []); // reporte agregado: sin conteo de registros
    } catch (err) {
      console.error('Error exportando PDF:', err);
      toast('No se pudo generar el PDF del reporte. Espera a que carguen las gráficas e intenta de nuevo.', 'error');
    } finally {
      setExportando(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 700 }} variant="h5">Reportes y Estadísticas</Typography>
          <Typography sx={{ color: 'text.secondary' }} variant="body2">
            Visualización de datos e indicadores clave por módulo
          </Typography>
        </Box>
        {puedo('reportes', 'exportar') && (
          <Button
            variant="outlined" size="small"
            startIcon={exportando ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
            onClick={exportarPDF}
            disabled={exportando}
          >
            {exportando ? 'Generando PDF…' : 'Exportar PDF'}
          </Button>
        )}
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        {TABS.map((t, i) => (
          <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" sx={{ minHeight: 48, gap: 0.5 }} />
        ))}
      </Tabs>

      <Box ref={contentRef}>
        {TABS[tab].component}
      </Box>
    </Box>
  );
}

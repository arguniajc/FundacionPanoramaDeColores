import { useState, useRef } from 'react';
import { Box, Button, CircularProgress, Tab, Tabs, Typography } from '@mui/material';
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

  const exportarPDF = async () => {
    if (!contentRef.current) return;
    setExportando(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF }   = await import('jspdf');

      const canvas = await html2canvas(contentRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf     = new jsPDF('p', 'mm', 'a4');
      const pgW     = pdf.internal.pageSize.getWidth();
      const pgH     = pdf.internal.pageSize.getHeight();
      const HEADER  = 32;
      const imgH    = (canvas.height * pgW) / canvas.width;

      // Cabecera morada
      pdf.setFillColor(78, 27, 149);
      pdf.rect(0, 0, pgW, 10, 'F');
      pdf.setFontSize(13); pdf.setTextColor(255, 255, 255);
      pdf.text('Fundación Panorama de Colores', 8, 7);
      pdf.setFontSize(11); pdf.setTextColor(50, 50, 50);
      pdf.text(`Reporte: ${TABS[tab].label}`, 8, 18);
      pdf.setFontSize(9);  pdf.setTextColor(120, 120, 120);
      pdf.text(`Generado el ${new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}`, 8, 25);

      // Contenido — paginar si excede la altura de la página
      const espacioUtilPag = pgH - HEADER;
      let cortado = 0;
      let primera = true;

      while (cortado < imgH) {
        if (!primera) { pdf.addPage(); cortado += espacioUtilPag; }
        pdf.addImage(imgData, 'PNG', 0, HEADER - cortado, pgW, imgH, '', 'FAST');
        if (primera) cortado += espacioUtilPag;
        primera = false;
      }

      pdf.save(`reporte_${TABS[tab].label.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Error exportando PDF:', err);
    } finally {
      setExportando(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Reportes y Estadísticas</Typography>
          <Typography variant="body2" color="text.secondary">
            Visualización de datos e indicadores clave por módulo
          </Typography>
        </Box>
        <Button
          variant="outlined" size="small"
          startIcon={exportando ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
          onClick={exportarPDF}
          disabled={exportando}
        >
          {exportando ? 'Generando PDF…' : 'Exportar PDF'}
        </Button>
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

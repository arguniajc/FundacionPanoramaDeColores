import { useState } from 'react';
import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import { useToast }           from './components/helpers';
import { ToastGlobal }        from './components/ToastGlobal';
import { TabInstitucionales } from './components/TabInstitucionales';
import { TabPorBeneficiario } from './components/TabPorBeneficiario';

const HEADER_GRADIENT = 'linear-gradient(135deg, var(--color-primario), var(--color-secundario))';

export default function DocumentosPage() {
  const [tabValue, setTabValue] = useState(0);
  const { toast, show: showToast, close: closeToast } = useToast();

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ background: HEADER_GRADIENT, borderRadius: 3, p: { xs: 2, sm: 3 }, mb: 3, color: 'white' }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <FolderIcon sx={{ fontSize: 32, opacity: 0.85 }} />
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>Documentos</Typography>
            <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.3 }}>
              Gestión de documentos institucionales y por beneficiario
            </Typography>
          </Box>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}
          sx={{ px: 2, '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minWidth: 160 },
                '& .Mui-selected': { color: 'var(--color-primario)' }, '& .MuiTabs-indicator': { bgcolor: 'var(--color-primario)' } }}>
          <Tab label="Institucionales" />
          <Tab label="Por beneficiario" />
        </Tabs>
      </Paper>

      {tabValue === 0 && <TabInstitucionales onToast={showToast} />}
      {tabValue === 1 && <TabPorBeneficiario onToast={showToast} />}

      <ToastGlobal toast={toast} onClose={closeToast} />
    </Box>
  );
}

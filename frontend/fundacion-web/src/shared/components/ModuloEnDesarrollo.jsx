import { Box, Typography, Paper } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';

export default function ModuloEnDesarrollo({ nombre }) {
  return (
    <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <Paper sx={{ p: 5, borderRadius: 4, textAlign: 'center', maxWidth: 400 }}>
        <ConstructionIcon sx={{ fontSize: 64, color: '#F59D1E', mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }} gutterBottom>
          {nombre}
        </Typography>
        <Typography color="text.secondary">
          Este módulo está en desarrollo y estará disponible próximamente.
        </Typography>
      </Paper>
    </Box>
  );
}

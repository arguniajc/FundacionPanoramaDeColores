import { Box, CircularProgress, Typography } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';

export function StatCard({ icon, label, value, color, loading }) {
  const theme = useTheme();
  // Acepta rutas de la paleta ('success.main') además de colores CSS
  const colorReal = color?.split('.').reduce((o, k) => o?.[k], theme.palette) ?? color;
  return (
    <Box sx={{ border: '1.5px solid', borderColor: (t) => alpha(t.palette.primary.main, 0.15), borderRadius: 2, p: 2.5, bgcolor: (t) => alpha(t.palette.primary.main, 0.04), display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: `color-mix(in srgb, ${colorReal} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colorReal, flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </Typography>
        {loading
          ? <CircularProgress size={18} sx={{ mt: 0.5 }} />
          : <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>{value}</Typography>}
      </Box>
    </Box>
  );
}

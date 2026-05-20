import { Box, Card, CardContent, Typography } from '@mui/material';

export const fmt = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v ?? 0);

export const fmtFecha = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

export const hoy = () => new Date().toISOString().split('T')[0];

export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const ANIOS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

export function KpiCard({ label, value, icon, color }) {
  return (
    <Card sx={{
      borderLeft: `4px solid ${color}`,
      height: '100%',
      transition: 'box-shadow 0.2s',
      '&:hover': { boxShadow: 4 },
    }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '20px !important' }}>
        <Box sx={{
          color: 'white', fontSize: 22, bgcolor: color,
          borderRadius: 2, p: 1.25, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{icon}</Box>
        <Box>
          <Typography variant="caption" color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11 }}>
            {label}
          </Typography>
          <Typography variant="h6" fontWeight="bold" lineHeight={1.2} sx={{ mt: 0.25 }}>
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export function SectionHeader({ title }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Box sx={{ width: 4, height: 20, bgcolor: '#4E1B95', borderRadius: 1 }} />
      <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
    </Box>
  );
}

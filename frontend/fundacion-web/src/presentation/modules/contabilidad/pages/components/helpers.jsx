import { Box, Card, CardContent, Typography } from '@mui/material';
import { BRAND_COLOR } from '@/shared/constants/brand';

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
      <Box sx={{ width: 4, height: 20, bgcolor: BRAND_COLOR, borderRadius: 1 }} />
      <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
    </Box>
  );
}

import { Box, Card, CardContent, Grid, Paper, Skeleton, Typography } from '@mui/material';
import { ResponsiveContainer } from 'recharts';

export const COLORES = [
  '#4E1B95','#7C3AED','#A78BFA','#2563EB','#60A5FA',
  '#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4',
];

export function KpiCard({ label, value, sub, color = 'primary.main', icon }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '12px !important' }}>
        <Box sx={{ color, fontSize: 36, lineHeight: 1 }}>{icon}</Box>
        <Box>
          <Typography variant="h5" fontWeight={700} color={color}>{value ?? '—'}</Typography>
          <Typography variant="body2" fontWeight={500}>{label}</Typography>
          {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
        </Box>
      </CardContent>
    </Card>
  );
}

export function GraficaCard({ titulo, children, height = 260 }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" fontWeight={700} mb={1} color="text.secondary">{titulo}</Typography>
        <Box sx={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}

export function SkeletonSection() {
  return (
    <Grid container spacing={2}>
      {[1,2,3,4].map(i => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
          <Skeleton variant="rounded" height={90} />
        </Grid>
      ))}
      {[1,2,3].map(i => (
        <Grid key={i} size={{ xs: 12, md: 4 }}>
          <Skeleton variant="rounded" height={300} />
        </Grid>
      ))}
    </Grid>
  );
}

export function TooltipCustom({ active, payload, label, prefix = '', suffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <Paper elevation={3} sx={{ p: 1.5, fontSize: 13 }}>
      <Typography variant="caption" fontWeight={700}>{label}</Typography>
      {payload.map((p, i) => (
        <Box key={i} sx={{ color: p.color }}>
          {p.name}: {prefix}{p.value?.toLocaleString('es-CO')}{suffix}
        </Box>
      ))}
    </Paper>
  );
}

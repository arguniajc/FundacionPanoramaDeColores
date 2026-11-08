import { Box, CircularProgress, Typography } from '@mui/material';

export function StatCard({ icon, label, value, color, loading }) {
  return (
    <Box sx={{ border: '1.5px solid', borderColor: 'divider', borderRadius: 2, p: { xs: 1.5, sm: 2.5 }, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', gap: { xs: 1.25, sm: 2 } }}>
      <Box sx={{ width: { xs: 38, sm: 46 }, height: { xs: 38, sm: 46 }, borderRadius: '50%', flexShrink: 0, bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ overflowWrap: 'anywhere', fontSize: { xs: '0.66rem', sm: '0.72rem' }, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </Typography>
        {loading
          ? <CircularProgress size={18} sx={{ mt: 0.5 }} />
          : <Typography sx={{ fontSize: '1.55rem', fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>{value}</Typography>}
      </Box>
    </Box>
  );
}

import { Box, Typography, CircularProgress } from '@mui/material';

export function StatCard({ icon, label, value, color, borderColor, bgColor, loading }) {
  return (
    <Box sx={{ border: `1.5px solid ${borderColor}`, borderRadius: 2, p: 2.5,
        bgcolor: bgColor, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ width: 46, height: 46, borderRadius: '50%', bgcolor: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </Typography>
        {loading
          ? <CircularProgress size={18} sx={{ mt: 0.5 }} />
          : <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.2 }}>{value}</Typography>}
      </Box>
    </Box>
  );
}

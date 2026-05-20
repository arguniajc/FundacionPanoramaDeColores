import { Box, Typography } from '@mui/material';
import { COLOR } from './helpers';

export function Seccion({ titulo, children }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ bgcolor: COLOR, borderRadius: '8px 8px 0 0', px: 2, py: 1 }}>
        <Typography variant="caption" fontWeight={800} color="white"
          sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>{titulo}</Typography>
      </Box>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderTop: 'none',
                 borderRadius: '0 0 8px 8px', p: 3 }}>
        {children}
      </Box>
    </Box>
  );
}

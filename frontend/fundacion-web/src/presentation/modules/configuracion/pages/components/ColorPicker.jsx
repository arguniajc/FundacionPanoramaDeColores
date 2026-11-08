import { useRef } from 'react';
import { Box, Typography } from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';

export function ColorPicker({ label, sublabel, value, onChange }) {
  const ref = useRef(null);
  return (
    <Box>
      <Typography sx={{ color: 'text.secondary', display: 'block', mb: 0.3, fontWeight: 600 }} variant="caption">{label}</Typography>
      {sublabel && (
        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.5, fontSize: '0.7rem' }}>{sublabel}</Typography>
      )}
      <Box onClick={() => ref.current?.click()}
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.2, cursor: 'pointer',
              '&:hover': { borderColor: 'var(--color-primario-texto)', bgcolor: 'action.hover' } }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: value, border: '2px solid', borderColor: 'divider', flexShrink: 0 }} />
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9rem' }}>{value}</Typography>
          <Typography sx={{ color: 'text.secondary' }} variant="caption">Clic para cambiar</Typography>
        </Box>
        <PaletteIcon sx={{ ml: 'auto', color: 'text.secondary', fontSize: 18 }} />
      </Box>
      <input ref={ref} type="color" value={value} onChange={(e) => onChange(e.target.value)}
        style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }} />
    </Box>
  );
}

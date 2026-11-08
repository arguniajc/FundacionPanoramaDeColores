import { Box, Skeleton, Typography } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { COLORES_GENERO } from './coloresGenero';

export function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
               borderRadius: 2, p: 1.5, boxShadow: 3, minWidth: 160 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{d.codigo} — {d.nombre}</Typography>
      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{d.rango}</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', mt: 0.5, color: d.color }}>
        {d.total} {d.total === 1 ? 'niño' : 'niños'}
      </Typography>
    </Box>
  );
}

export function GeneroTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
               borderRadius: 2, p: 1.5, boxShadow: 3 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }}>{d.genero}</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: '1rem', mt: 0.3, color: COLORES_GENERO[d.genero] ?? 'text.secondary' }}>
        {d.total} {d.total === 1 ? 'niño' : 'niños'}
      </Typography>
    </Box>
  );
}

export function KpiCard({ valor, label, sublabel, color, icon, cargando }) {
  return (
    <Box sx={{
      borderRadius: 3, p: 2.5,
      background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`,
      border: '1.5px solid', borderColor: `${color}30`,
      display: 'flex', alignItems: 'center', gap: 2, height: '100%',
    }}>
      <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: `${color}20`,
                 display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        {cargando
          ? <Skeleton width={50} height={36} />
          : <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' }, lineHeight: 1, color }}>
              {valor}
            </Typography>}
        <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: 'text.primary', mt: 0.3 }}>{label}</Typography>
        {sublabel && <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{sublabel}</Typography>}
      </Box>
    </Box>
  );
}

export function FilaOrigen({ nombre, total, max, color }) {
  const pct = max > 0 ? Math.round((total / max) * 100) : 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.8 }}>
      <Typography
        sx={{ fontSize: '0.78rem', minWidth: 130, color: 'text.secondary', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
        title={nombre}>
        {nombre}
      </Typography>
      <Box sx={{ flex: 1, bgcolor: 'action.hover', borderRadius: 4, height: 8 }}>
        <Box sx={{ width: `${pct}%`, height: 8, borderRadius: 4, bgcolor: color, transition: 'width 0.6s ease' }} />
      </Box>
      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, minWidth: 24, textAlign: 'right', color }}>
        {total}
      </Typography>
    </Box>
  );
}

export function SeccionHeader({ titulo }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
      <Box sx={{ width: 4, height: 22, borderRadius: 1, bgcolor: 'var(--color-primario)' }} />
      <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>{titulo}</Typography>
    </Box>
  );
}

export function AlertaChip({ count, label, color, onClick }) {
  return (
    <Box onClick={onClick} sx={{
      display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.8,
      bgcolor: `${color}15`, border: `1px solid ${color}40`,
      borderRadius: 2, cursor: 'pointer', userSelect: 'none',
      '&:hover': { bgcolor: `${color}28` },
    }}>
      <WarningAmberIcon sx={{ fontSize: 16, color }} />
      <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color }}>{count}</Typography>
      <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>{label}</Typography>
    </Box>
  );
}

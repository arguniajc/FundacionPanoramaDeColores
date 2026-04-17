import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/system';

const flotar = keyframes`
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-12px); }
`;

const pulsar = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(0.75); }
  50%       { opacity: 1;   transform: scale(1); }
`;

const brillar = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
`;

export default function PantallaCarga() {
  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #0d0521 0%, #1a0840 40%, #2a1060 70%, #1a3a2a 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 4,
    }}>
      {/* Círculo decorativo de fondo */}
      <Box sx={{
        position: 'absolute',
        width: 400, height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(78,27,149,0.25) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo + nombre */}
      <Box sx={{
        animation: `${flotar} 2.8s ease-in-out infinite`,
        textAlign: 'center',
        position: 'relative',
      }}>
        {/* Ícono */}
        <Box sx={{
          width: 72, height: 72, mx: 'auto', mb: 2,
          borderRadius: '22px',
          background: 'linear-gradient(135deg, #7C3AED, #2D984F)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.2rem',
          boxShadow: '0 8px 32px rgba(124,58,237,0.45)',
        }}>
          🌈
        </Box>

        {/* Nombre con efecto shimmer */}
        <Typography sx={{
          fontWeight: 900,
          fontSize: { xs: '1.3rem', sm: '1.6rem' },
          background: 'linear-gradient(90deg, #fff 0%, #B4E8E8 40%, #fff 60%, #B4E8E8 100%)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: `${brillar} 2.5s linear infinite`,
          letterSpacing: '-0.01em',
        }}>
          Fundación Panorama de Colores
        </Typography>

        <Typography sx={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.8rem',
          mt: 0.6,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          Panel Administrativo
        </Typography>
      </Box>

      {/* Dots pulsantes */}
      <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'center' }}>
        {[0, 1, 2, 3].map(i => (
          <Box key={i} sx={{
            width: i === 1 || i === 2 ? 10 : 8,
            height: i === 1 || i === 2 ? 10 : 8,
            borderRadius: '50%',
            bgcolor: '#B4E8E8',
            animation: `${pulsar} 1.4s ease-in-out ${i * 0.18}s infinite`,
          }} />
        ))}
      </Box>

      {/* Texto de carga */}
      <Typography sx={{
        color: 'rgba(255,255,255,0.25)',
        fontSize: '0.72rem',
        letterSpacing: '0.08em',
      }}>
        Verificando sesión…
      </Typography>
    </Box>
  );
}

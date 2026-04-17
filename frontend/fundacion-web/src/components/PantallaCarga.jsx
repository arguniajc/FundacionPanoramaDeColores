import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/system';

const flotar = keyframes`
  0%, 100% { transform: translateY(0px) rotate(-8deg); }
  50%       { transform: translateY(-10px) rotate(8deg); }
`;

const brillar = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
`;

const pulsar = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(0.75); }
  50%       { opacity: 1;   transform: scale(1); }
`;

const destello = keyframes`
  0%   { opacity: 0; transform: scale(0.6) translate(-50%, -50%); }
  30%  { opacity: 1; transform: scale(1.4) translate(-50%, -50%); }
  70%  { opacity: 0.6; transform: scale(1.1) translate(-50%, -50%); }
  100% { opacity: 0; transform: scale(0.8) translate(-50%, -50%); }
`;

const rayo = keyframes`
  0%, 100% { opacity: 0; transform: scaleY(0); }
  15%, 85% { opacity: 1; transform: scaleY(1); }
`;

const COLORES = ['#FFD700', '#FF6B9D', '#4ECDC4', '#A78BFA', '#34D399', '#FB923C'];

export default function PantallaCarga() {
  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(150deg, #0d0521 0%, #1a0840 45%, #0e2a1a 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 3,
      overflow: 'hidden',
    }}>
      {/* Halo de fondo */}
      <Box sx={{
        position: 'absolute',
        width: 420, height: 420,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(78,27,149,0.22) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Campanita con destellos */}
      <Box sx={{ position: 'relative', width: 110, height: 110 }}>
        {/* Destellos de luz alrededor */}
        {COLORES.map((color, i) => {
          const angle = (i / COLORES.length) * 360;
          const rad   = (angle * Math.PI) / 180;
          const x     = 55 + Math.cos(rad) * 46;
          const y     = 55 + Math.sin(rad) * 46;
          return (
            <Box key={i} sx={{
              position: 'absolute',
              left: x, top: y,
              width: 10, height: 10,
              borderRadius: '50%',
              bgcolor: color,
              transform: 'translate(-50%, -50%)',
              animation: `${destello} 1.8s ease-in-out ${i * 0.3}s infinite`,
              boxShadow: `0 0 8px 3px ${color}`,
            }} />
          );
        })}

        {/* Rayo bajo la campana */}
        <Box sx={{
          position: 'absolute',
          bottom: -6, left: '50%',
          width: 3, height: 18,
          bgcolor: '#FFD700',
          transformOrigin: 'top center',
          transform: 'translateX(-50%)',
          borderRadius: 1,
          animation: `${rayo} 1.8s ease-in-out infinite`,
          boxShadow: '0 0 8px #FFD700',
        }} />

        {/* Logo de la fundación */}
        <Box sx={{
          width: 90, height: 90, mx: 'auto',
          position: 'relative', zIndex: 1,
          animation: `${flotar} 1.8s ease-in-out infinite`,
        }}>
          <Box
            component="img"
            src="/gestion/logo.png"
            alt="Fundación Panorama de Colores"
            sx={{
              width: '100%', height: '100%',
              objectFit: 'contain',
              borderRadius: '20px',
              filter: 'drop-shadow(0 6px 24px rgba(124,58,237,0.55)) drop-shadow(0 0 12px rgba(255,215,0,0.4))',
            }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        </Box>
      </Box>

      {/* Nombre con shimmer */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{
          fontWeight: 900,
          fontSize: { xs: '1.25rem', sm: '1.55rem' },
          background: 'linear-gradient(90deg, #fff 0%, #FFD700 35%, #fff 55%, #B4E8E8 80%, #fff 100%)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: `${brillar} 2.4s linear infinite`,
          letterSpacing: '-0.01em',
        }}>
          Fundación Panorama de Colores
        </Typography>
        <Typography sx={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: '0.75rem',
          mt: 0.5,
          letterSpacing: '0.14em',
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
            bgcolor: i % 2 === 0 ? '#FFD700' : '#B4E8E8',
            animation: `${pulsar} 1.4s ease-in-out ${i * 0.18}s infinite`,
          }} />
        ))}
      </Box>

      <Typography sx={{
        color: 'rgba(255,255,255,0.22)',
        fontSize: '0.7rem',
        letterSpacing: '0.08em',
      }}>
        Verificando sesión…
      </Typography>
    </Box>
  );
}

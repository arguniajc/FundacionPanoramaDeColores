import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LockIcon from '@mui/icons-material/Lock';

export default function Home() {
  const navigate = useNavigate();

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #150830 0%, #4E1B95 50%, #2D984F 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', px: 2,
    }}>
      <Container maxWidth="sm">
        <Box sx={{ fontSize: '3rem', mb: 2 }}>🌈</Box>

        <Typography variant="h4" fontWeight={900} color="white" gutterBottom
          sx={{ fontSize: { xs: '1.6rem', md: '2.4rem' }, letterSpacing: '-0.01em' }}>
          Fundación Panorama de Colores
        </Typography>

        <Typography variant="body1" color="rgba(255,255,255,0.65)" mb={5}
          sx={{ fontSize: { xs: '0.95rem', md: '1.05rem' }, lineHeight: 1.7 }}>
          Transformando vidas a través del arte, la cultura y la esperanza.
        </Typography>

        <Button
          variant="contained" size="large"
          startIcon={<LockIcon />}
          onClick={() => navigate('/acceso')}
          sx={{
            bgcolor: 'rgba(255,255,255,0.12)',
            color: '#fff',
            border: '1.5px solid rgba(255,255,255,0.3)',
            fontWeight: 700,
            px: 5, py: 1.5,
            borderRadius: 3,
            fontSize: '1rem',
            backdropFilter: 'blur(8px)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.2)',
              borderColor: 'rgba(255,255,255,0.5)',
            },
          }}
        >
          Acceder al panel
        </Button>
      </Container>
    </Box>
  );
}

import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #4E1B95 0%, #2D984F 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 2,
      }}
    >
      <Container maxWidth="md">
        <Typography
          variant="h2"
          fontWeight={800}
          color="white"
          gutterBottom
          sx={{ fontSize: { xs: '2rem', md: '3.5rem' } }}
        >
          Fundación Panorama de Colores
        </Typography>

        <Typography
          variant="h5"
          color="rgba(255,255,255,0.85)"
          mb={5}
          sx={{ fontSize: { xs: '1rem', md: '1.4rem' } }}
        >
          Transformando vidas a través del arte, la cultura y la esperanza
        </Typography>

        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/admin/login')}
          sx={{
            bgcolor: 'white',
            color: '#4E1B95',
            fontWeight: 700,
            px: 5,
            py: 1.5,
            borderRadius: 3,
            fontSize: '1rem',
            '&:hover': { bgcolor: '#f0e6ff' },
          }}
        >
          Acceder al Admin
        </Button>
      </Container>
    </Box>
  );
}

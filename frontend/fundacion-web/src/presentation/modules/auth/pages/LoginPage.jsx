import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import {
  Box, Card, CardContent, Typography,
  CircularProgress, Alert, Divider,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth }   from '@/application/auth/AuthContext';
import apiClient     from '@/infrastructure/http/apiClient';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (user) navigate('/sede', { replace: true });
  }, [user, navigate]);

  const handleGoogleSuccess = async (credentialResponse) => {
    setCargando(true);
    setError('');
    try {
      const { data } = await apiClient.post('/api/auth/google', {
        idToken: credentialResponse.credential,
      });
      login(
        data.token,
        { email: data.email, nombre: data.nombre, avatarUrl: data.avatarUrl },
        data.rol,
        data.permisos,
      );
      navigate('/sede', { replace: true });
    } catch (err) {
      const msg = err.response?.status === 403
        ? 'Tu correo no tiene permisos para acceder al panel.'
        : 'Error al iniciar sesión. Intenta de nuevo.';
      setError(msg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(150deg, var(--color-primario) 0%, #1a6b38 60%, #0d3d20 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 4, sm: 5 },
        gap: 3,
      }}
    >
      {/* Logo + nombre de la fundación arriba de la tarjeta */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: { xs: 1.5, sm: 2 },
          mb: { xs: 0, sm: 1 },
        }}
      >
        <Box
          component="img"
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="Fundación Panorama de Colores"
          sx={{
            width:  { xs: 72, sm: 90, md: 108 },
            height: 'auto',
            borderRadius: '50%',
            boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
            border: '3px solid rgba(255,255,255,0.6)',
            backgroundColor: '#fff',
            p: 0.5,
          }}
        />
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{
            color: '#fff',
            fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' },
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            textAlign: 'center',
            px: 1,
          }}
        >
          Fundación Panorama de Colores
        </Typography>
      </Box>

      {/* Tarjeta de login */}
      <Card
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', sm: 400, md: 420 },
          borderRadius: { xs: 3, sm: 4 },
          boxShadow: { xs: 6, sm: 16 },
        }}
      >
        <CardContent
          sx={{
            px: { xs: 2.5, sm: 4 },
            pt: { xs: 3, sm: 4 },
            pb: { xs: 3, sm: 4 },
            '&:last-child': { pb: { xs: 3, sm: 4 } },
          }}
        >
          {/* Encabezado */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: { xs: 2.5, sm: 3 },
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: { xs: 44, sm: 52 },
                height: { xs: 44, sm: 52 },
                borderRadius: '50%',
                bgcolor: 'var(--color-primario)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LockOutlinedIcon sx={{ color: '#fff', fontSize: { xs: 22, sm: 26 } }} />
            </Box>
            <Typography
              variant="h5"
              fontWeight={800}
              color="var(--color-primario)"
              sx={{ fontSize: { xs: '1.15rem', sm: '1.35rem' } }}
            >
              Panel Administrativo
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, textAlign: 'center' }}
            >
              Ingresa con tu cuenta autorizada de Google
            </Typography>
          </Box>

          <Divider sx={{ mb: { xs: 2.5, sm: 3 } }} />

          {/* Error */}
          {error && (
            <Alert
              severity="error"
              sx={{ mb: { xs: 2, sm: 2.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
            >
              {error}
            </Alert>
          )}

          {/* Botón Google */}
          {cargando ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={32} sx={{ color: 'var(--color-primario)' }} />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                /* Fuerza al iframe de Google a respetar el ancho del contenedor */
                '& > div': { maxWidth: '100%' },
                '& iframe': { maxWidth: '100% !important' },
              }}
            >
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('No se pudo conectar con Google. Intenta de nuevo.')}
                text="signin_with"
                shape="rectangular"
                logo_alignment="left"
                width="300"
                locale="es"
              />
            </Box>
          )}

          {/* Aviso de acceso restringido */}
          <Typography
            variant="caption"
            color="text.disabled"
            display="block"
            sx={{
              mt: { xs: 2.5, sm: 3 },
              textAlign: 'center',
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              lineHeight: 1.5,
            }}
          >
            Acceso restringido a personal autorizado.
            <br />
            Si tienes problemas para ingresar, contacta al administrador.
          </Typography>
        </CardContent>
      </Card>

      {/* Pie de página */}
      <Typography
        variant="caption"
        sx={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: { xs: '0.65rem', sm: '0.7rem' },
          textAlign: 'center',
          px: 2,
        }}
      >
        © {new Date().getFullYear()} Fundación Panorama de Colores · Todos los derechos reservados
      </Typography>
    </Box>
  );
}

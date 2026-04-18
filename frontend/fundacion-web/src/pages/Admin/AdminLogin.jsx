// Página de inicio de sesión del panel admin.
// Usa Google OAuth: el id_token se valida en el backend y retorna un JWT propio.
// Solo correos en la lista blanca (appsettings Admin:EmailsAutorizados) pueden entrar.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import {
  Box, Card, CardContent, Typography,
  CircularProgress, Alert,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function AdminLogin() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Si ya hay sesión activa, redirigir al panel
  useEffect(() => {
    if (user) navigate('/sede', { replace: true });
  }, [user, navigate]);

  const handleGoogleSuccess = async (credentialResponse) => {
    setCargando(true);
    setError('');
    try {
      // credentialResponse.credential es el id_token JWT real de Google
      const { data } = await api.post('/api/auth/google', {
        idToken: credentialResponse.credential,
      });

      login(data.token, {
        email:     data.email,
        nombre:    data.nombre,
        avatarUrl: data.avatarUrl,
      });
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
        background: 'linear-gradient(135deg, #4E1B95 0%, #2D984F 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Card sx={{ maxWidth: 420, width: '100%', borderRadius: 4, p: 2 }}>
        <CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h5" fontWeight={800} color="#4E1B95" gutterBottom>
            Panel Administrativo
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={4}>
            Fundación Panorama de Colores
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              {error}
            </Alert>
          )}

          {cargando ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={32} sx={{ color: '#4E1B95' }} />
            </Box>
          ) : (
            <Box display="flex" justifyContent="center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('No se pudo conectar con Google. Intenta de nuevo.')}
                text="signin_with"
                shape="rectangular"
                logo_alignment="left"
                width="320"
                locale="es"
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

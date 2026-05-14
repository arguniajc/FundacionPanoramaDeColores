import { Box, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useNavigate } from 'react-router-dom';

export default function SinAcceso({ modulo }) {
  const navigate = useNavigate();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
      <LockIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
      <Typography variant="h6" color="text.secondary">
        Sin acceso{modulo ? ` a ${modulo}` : ''}
      </Typography>
      <Typography variant="body2" color="text.disabled" textAlign="center" maxWidth={320}>
        No tienes permiso para ver esta sección. Contacta al administrador si crees que es un error.
      </Typography>
      <Button variant="outlined" onClick={() => navigate('/sede')}>Ir al inicio</Button>
    </Box>
  );
}

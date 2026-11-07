// Modal que lista beneficiarios activos con campos de calidad vacíos.
// Solo consulta el backend cuando se abre, para no cargar la página de inicio.
import { useState } from 'react';
import {
  Box, Typography, Chip, Button, Avatar, Tooltip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Alert,
} from '@mui/material';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';
import EditIcon          from '@mui/icons-material/Edit';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import CloseIcon         from '@mui/icons-material/Close';
import apiClient from '@/infrastructure/http/apiClient';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';

const CAMPO_COLOR = {
  'Foto del menor':  { bg: '#fce4ec', txt: '#c62828' },
  'Foto documento':  { bg: '#fce4ec', txt: '#c62828' },
  'WhatsApp':        { bg: '#fff3e0', txt: '#e65100' },
  'Dirección':       { bg: '#fff3e0', txt: '#e65100' },
  'Talla camisa':    { bg: '#e8f5e9', txt: '#2e7d32' },
  'Talla zapatos':   { bg: '#e8f5e9', txt: '#2e7d32' },
  'Peso':            { bg: '#e8f5e9', txt: '#2e7d32' },
  'Talla altura':    { bg: '#e8f5e9', txt: '#2e7d32' },
  'Colegio':         { bg: '#e3f2fd', txt: '#1565c0' },
  'Grado escolar':   { bg: '#e3f2fd', txt: '#1565c0' },
};

function AvatarBeneficiario({ nombre, fotoUrl }) {
  const inicial = (nombre || '?').charAt(0).toUpperCase();
  return (
    <Avatar src={fotoUrl || undefined}
      sx={{ width: 36, height: 36, fontSize: '0.9rem', fontWeight: 700,
            bgcolor: fotoUrl ? 'transparent' : '#7c3aed', flexShrink: 0 }}>
      {inicial}
    </Avatar>
  );
}

export function PerfilesIncompletosDialog({ open, onClose, onEditar, tipo = 'niño' }) {
  const [datos,    setDatos]    = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState('');

  // Se consulta al abrir el modal (no al montar la página)
  const cargar = () => {
    setCargando(true); setError('');
    apiClient.get('/api/beneficiarios/incompletos', { params: { tipo } })
      .then(({ data }) => setDatos(data))
      .catch(err => setError(mensajeErrorApi(err, { accion: 'cargar los perfiles pendientes' })))
      .finally(() => setCargando(false));
  };

  const totalCamposFaltantes = datos.reduce((s, b) => s + b.faltantes.length, 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper"
      slotProps={{ transition: { onEnter: cargar } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#fffbeb', pr: 6 }}>
        <WarningAmberIcon sx={{ color: '#d97706', fontSize: '1.3rem', flexShrink: 0 }} />
        <Box flex={1}>
          <Typography fontWeight={800} fontSize="1rem" color="#92400e">
            Perfiles pendientes por completar
          </Typography>
          {!cargando && !error && datos.length > 0 && (
            <Typography fontSize="0.75rem" color="#b45309">
              {datos.length} perfil{datos.length > 1 ? 'es' : ''} · {totalCamposFaltantes} campo{totalCamposFaltantes > 1 ? 's' : ''} sin completar
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: 2, py: 1 }}>
        {cargando && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 4 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Verificando completitud de perfiles…</Typography>
          </Box>
        )}

        {!cargando && error && (
          <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
        )}

        {!cargando && !error && datos.length === 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 4 }}>
            <CheckCircleIcon sx={{ color: '#2e7d32' }} />
            <Typography variant="body2" color="text.secondary">Todos los perfiles están completos.</Typography>
          </Box>
        )}

        {!cargando && !error && datos.map((ben, idx) => (
          <Box key={ben.id} sx={{
            display: 'flex', alignItems: 'flex-start', gap: 1.5,
            py: 1.2, flexWrap: 'wrap',
            borderBottom: idx < datos.length - 1 ? '1px solid #fef3c7' : 'none',
          }}>
            <AvatarBeneficiario nombre={ben.nombre} fotoUrl={ben.fotoUrl} />

            <Box flex={1} minWidth={200}>
              {/* nombre + % completitud */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                <Typography fontWeight={700} fontSize="0.87rem" color="text.primary">
                  {ben.nombre}
                </Typography>
                <Chip
                  label={`${ben.completitud}% completo`}
                  size="small"
                  sx={{
                    fontSize: '0.68rem', fontWeight: 700, height: 18,
                    bgcolor: ben.completitud >= 60 ? '#fff3e0' : '#fce4ec',
                    color:   ben.completitud >= 60 ? '#c2410c'  : '#b91c1c',
                  }}
                />
              </Box>

              {/* chips de campos faltantes */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                {ben.faltantes.map(f => {
                  const c = CAMPO_COLOR[f] ?? { bg: '#f3f4f6', txt: '#374151' };
                  return (
                    <Chip key={f} label={f} size="small"
                      sx={{
                        fontSize: '0.63rem', height: 18, fontWeight: 600,
                        bgcolor: c.bg, color: c.txt,
                        '& .MuiChip-label': { px: 0.8 },
                      }}
                    />
                  );
                })}
              </Box>
            </Box>

            <Tooltip title="Editar y completar datos">
              <Button size="small" variant="outlined" startIcon={<EditIcon sx={{ fontSize: '0.8rem !important' }} />}
                onClick={() => onEditar(ben.id)}
                sx={{
                  borderColor: '#7c3aed', color: '#7c3aed',
                  fontSize: '0.72rem', py: 0.3, px: 1.2, minWidth: 0,
                  flexShrink: 0, alignSelf: 'center',
                  '&:hover': { bgcolor: '#f5f0ff', borderColor: '#6d28d9' },
                }}>
                Editar
              </Button>
            </Tooltip>
          </Box>
        ))}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.2, bgcolor: '#fffbeb', justifyContent: 'space-between' }}>
        <Typography fontSize="0.72rem" color="text.secondary">
          Los campos marcados se completan en el formulario de edición.
        </Typography>
        <Button onClick={onClose} size="small">Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

// Modal que lista beneficiarios activos con campos de calidad vacíos.
// Solo consulta el backend cuando se abre, para no cargar la página de inicio.
import { useState } from 'react';
import {
  Box, Typography, Chip, Button, Avatar, Tooltip, CircularProgress,
   DialogTitle, DialogContent, DialogActions, IconButton, Alert,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import Dialog from '@/shared/components/DialogResponsive';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';
import EditIcon          from '@mui/icons-material/Edit';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import CloseIcon         from '@mui/icons-material/Close';
import apiClient from '@/infrastructure/http/apiClient';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { useArchivoUrl } from '@/shared/utils/archivos';
import { colorEstado } from '@/shared/theme/paleta';

const CAMPO_COLOR = {
  'Foto del menor':  'error',
  'Foto documento':  'error',
  'EPS':             'aviso',
  'WhatsApp':        'aviso',
  'Dirección':       'aviso',
  'Talla camisa':    'exito',
  'Talla zapatos':   'exito',
  'Peso':            'exito',
  'Colegio':         'info',
  'Grado escolar':   'info',
};

function AvatarBeneficiario({ nombre, fotoUrl: valorFoto }) {
  const fotoUrl = useArchivoUrl(valorFoto); // privado → enlace temporal
  const inicial = (nombre || '?').charAt(0).toUpperCase();
  return (
    <Avatar src={fotoUrl || undefined}
      sx={{ width: 36, height: 36, fontSize: '0.9rem', fontWeight: 700,
            bgcolor: fotoUrl ? 'transparent' : 'primary.main', color: 'primary.contrastText', flexShrink: 0 }}>
      {inicial}
    </Avatar>
  );
}

export function PerfilesIncompletosDialog({ open, onClose, onEditar, tipo = 'niño' }) {
  const theme = useTheme();
  const modo  = theme.palette.mode;
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
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: colorEstado('aviso', modo).fondo, pr: 6 }}>
        <WarningAmberIcon sx={{ color: 'warning.main', fontSize: '1.3rem', flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: colorEstado('aviso', modo).texto }}>
            Perfiles pendientes por completar
          </Typography>
          {!cargando && !error && datos.length > 0 && (
            <Typography sx={{ fontSize: '0.75rem', color: 'warning.dark' }}>
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
            <Typography sx={{ color: 'text.secondary' }} variant="body2">Verificando completitud de perfiles…</Typography>
          </Box>
        )}

        {!cargando && error && (
          <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
        )}

        {!cargando && !error && datos.length === 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 4 }}>
            <CheckCircleIcon sx={{ color: 'success.main' }} />
            <Typography sx={{ color: 'text.secondary' }} variant="body2">Todos los perfiles están completos.</Typography>
          </Box>
        )}

        {!cargando && !error && datos.map((ben, idx) => (
          <Box key={ben.id} sx={{
            display: 'flex', alignItems: 'flex-start', gap: 1.5,
            py: 1.2, flexWrap: 'wrap',
            borderBottom: idx < datos.length - 1 ? `1px solid ${alpha(theme.palette.warning.main, 0.2)}` : 'none',
          }}>
            <AvatarBeneficiario nombre={ben.nombre} fotoUrl={ben.fotoUrl} />

            <Box sx={{ flex: 1, minWidth: 200 }}>
              {/* nombre + % completitud */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.87rem', color: 'text.primary' }}>
                  {ben.nombre}
                </Typography>
                <Chip
                  label={`${ben.completitud}% completo`}
                  size="small"
                  sx={{
                    fontSize: '0.68rem', fontWeight: 700, height: 18,
                    bgcolor: colorEstado(ben.completitud >= 60 ? 'aviso' : 'error', modo).fondo,
                    color:   colorEstado(ben.completitud >= 60 ? 'aviso' : 'error', modo).texto,
                  }}
                />
              </Box>

              {/* chips de campos faltantes */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                {ben.faltantes.map(f => {
                  const tono = colorEstado(CAMPO_COLOR[f] ?? 'neutro', modo);
                  const c = { bg: tono.fondo, txt: tono.texto };
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
                  borderColor: 'primary.main', color: 'primary.main',
                  fontSize: '0.72rem', py: 0.3, px: 1.2, minWidth: 0,
                  flexShrink: 0, alignSelf: 'center',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), borderColor: 'primary.dark' },
                }}>
                Editar
              </Button>
            </Tooltip>
          </Box>
        ))}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.2, bgcolor: colorEstado('aviso', modo).fondo, justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
          Los campos marcados se completan en el formulario de edición.
        </Typography>
        <Button onClick={onClose} size="small">Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

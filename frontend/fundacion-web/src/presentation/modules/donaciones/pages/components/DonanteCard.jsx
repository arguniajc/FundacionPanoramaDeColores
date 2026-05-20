import {
  Avatar, Box, Button, Chip, Divider, Grid, IconButton, Tooltip, Typography,
} from '@mui/material';
import DeleteIcon            from '@mui/icons-material/Delete';
import EditIcon              from '@mui/icons-material/Edit';
import BusinessIcon          from '@mui/icons-material/Business';
import PersonIcon            from '@mui/icons-material/Person';
import EmailIcon             from '@mui/icons-material/Email';
import PhoneIcon             from '@mui/icons-material/Phone';
import LocationOnIcon        from '@mui/icons-material/LocationOn';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { COLOR_DONANTES, fmtMoney, fmtFecha } from './helpers';

export function DonanteCard({ donante, onEditar, onEliminar, onNuevaDonacion }) {
  const esEmpresa = donante.tipo === 'empresa';
  const color = esEmpresa ? '#0ea5e9' : COLOR_DONANTES;

  return (
    <Box sx={{ border: '1.5px solid #c8e6c9', borderRadius: 2, overflow: 'hidden',
        bgcolor: '#f9fdf9', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2, pt: 2, pb: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Avatar sx={{ bgcolor: color, width: 42, height: 42, fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
          {donante.nombre.slice(0, 2).toUpperCase()}
        </Avatar>
        <Box minWidth={0} flex={1}>
          <Typography fontWeight={800} sx={{ fontSize: '0.92rem', lineHeight: 1.3 }} noWrap title={donante.nombre}>
            {donante.nombre}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3 }}>
            <Chip
              icon={esEmpresa
                ? <BusinessIcon sx={{ fontSize: '11px !important' }} />
                : <PersonIcon   sx={{ fontSize: '11px !important' }} />}
              label={esEmpresa ? 'Empresa' : 'Persona'} size="small"
              sx={{ fontSize: '0.68rem', height: 20, bgcolor: `${color}18`, color, fontWeight: 700, border: 'none' }}
            />
            {!donante.activo && (
              <Chip label="Inactivo" size="small" color="default" sx={{ fontSize: '0.68rem', height: 20 }} />
            )}
          </Box>
        </Box>
      </Box>

      <Divider />

      <Box sx={{ px: 2, py: 1.8, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
        <Grid container spacing={1}>
          <Grid size={6}>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Total donado</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: COLOR_DONANTES }}>
              {donante.totalDinero > 0 ? fmtMoney(donante.totalDinero) : '—'}
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Donaciones</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>
              {donante.totalDonaciones}
              {donante.totalEspecie > 0 && (
                <Typography component="span" sx={{ fontSize: '0.72rem', color: 'text.secondary', ml: 0.4 }}>
                  ({donante.totalEspecie} especie)
                </Typography>
              )}
            </Typography>
          </Grid>
        </Grid>

        {donante.ultimaDonacion && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            Última donación: <strong>{fmtFecha(donante.ultimaDonacion)}</strong>
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
          {donante.documento && (
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              Doc: <strong>{donante.documento}</strong>
            </Typography>
          )}
          {donante.email && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EmailIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }} noWrap>{donante.email}</Typography>
            </Box>
          )}
          {donante.telefono && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PhoneIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{donante.telefono}</Typography>
            </Box>
          )}
          {(donante.ciudad || donante.pais) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationOnIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {[donante.ciudad, donante.departamento,
                  donante.pais && donante.pais !== 'Colombia' ? donante.pais : null
                ].filter(Boolean).join(', ')}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ px: 1.5, py: 1, bgcolor: 'rgba(45,152,79,0.04)', borderTop: '1.5px solid #c8e6c9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button size="small" variant="contained" startIcon={<VolunteerActivismIcon />}
          onClick={() => onNuevaDonacion(donante)}
          sx={{ bgcolor: COLOR_DONANTES, fontWeight: 700, fontSize: '0.7rem', px: 1,
              '&:hover': { bgcolor: '#1e7a38' } }}>
          Donación
        </Button>
        <Box display="flex" gap={0.3}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => onEditar(donante)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => onEliminar(donante)}><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

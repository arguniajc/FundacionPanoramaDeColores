import {
  Avatar, Box, Button, Chip, Divider, Grid, IconButton, Tooltip, Typography,
} from '@mui/material';
import AssignmentIcon  from '@mui/icons-material/Assignment';
import DeleteIcon      from '@mui/icons-material/Delete';
import EditIcon        from '@mui/icons-material/Edit';
import EmailIcon       from '@mui/icons-material/Email';
import LocationOnIcon  from '@mui/icons-material/LocationOn';
import PhoneIcon       from '@mui/icons-material/Phone';
import WorkIcon        from '@mui/icons-material/Work';
import { COLOR, fmtFecha } from './helpers';

export function VoluntarioCard({ voluntario: v, onEditar, onEliminar, onAsignaciones }) {
  return (
    <Box sx={{ border: '1.5px solid #ede9fe', borderRadius: 2, overflow: 'hidden', bgcolor: '#faf5ff', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2, pt: 2, pb: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Avatar sx={{ bgcolor: COLOR, width: 42, height: 42, fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
          {v.nombre.slice(0, 2).toUpperCase()}
        </Avatar>
        <Box minWidth={0} flex={1}>
          <Typography fontWeight={800} sx={{ fontSize: '0.92rem', lineHeight: 1.3 }} noWrap title={v.nombre}>
            {v.nombre}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3, flexWrap: 'wrap' }}>
            {v.profesion && (
              <Chip icon={<WorkIcon sx={{ fontSize: '11px !important' }} />}
                label={v.profesion} size="small"
                sx={{ fontSize: '0.68rem', height: 20, bgcolor: 'color-mix(in srgb, var(--color-primario) 9%, transparent)', color: COLOR, fontWeight: 700, border: 'none' }} />
            )}
            {!v.activo && (
              <Chip label="Inactivo" size="small" color="default" sx={{ fontSize: '0.68rem', height: 20 }} />
            )}
          </Box>
        </Box>
      </Box>

      <Divider />

      <Box sx={{ px: 2, py: 1.8, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Grid container spacing={1}>
          <Grid size={6}>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Programas</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: COLOR }}>{v.totalProgramas}</Typography>
          </Grid>
          <Grid size={6}>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Horas/semana</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary' }}>
              {v.horasSemanales > 0 ? `${v.horasSemanales}h` : '—'}
            </Typography>
          </Grid>
        </Grid>

        {v.fechaInicio && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            Desde: <strong>{fmtFecha(v.fechaInicio)}</strong>
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
          {v.documento && (
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {v.tipoDocumento ? `${v.tipoDocumento}: ` : 'Doc: '}<strong>{v.documento}</strong>
            </Typography>
          )}
          {v.email && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EmailIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }} noWrap>{v.email}</Typography>
            </Box>
          )}
          {v.telefono && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PhoneIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{v.telefono}</Typography>
            </Box>
          )}
          {v.ciudad && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationOnIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{v.ciudad}</Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ px: 1.5, py: 1, bgcolor: 'color-mix(in srgb, var(--color-primario) 3%, transparent)', borderTop: '1.5px solid #ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button size="small" variant="outlined" startIcon={<AssignmentIcon />}
          onClick={() => onAsignaciones(v)}
          sx={{ fontWeight: 700, fontSize: '0.7rem', px: 1, color: COLOR, borderColor: COLOR, '&:hover': { borderColor: COLOR, bgcolor: 'color-mix(in srgb, var(--color-primario) 6%, transparent)' } }}>
          Programas
        </Button>
        <Box display="flex" gap={0.3}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => onEditar(v)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => onEliminar(v)}><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

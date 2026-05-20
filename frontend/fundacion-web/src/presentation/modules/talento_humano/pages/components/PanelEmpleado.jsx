import { Box, Typography, Grid, Avatar, Chip } from '@mui/material';

function iniciales(nombres, apellidos) {
  return `${nombres?.[0] ?? ''}${apellidos?.[0] ?? ''}`.toUpperCase();
}

function fmtFecha(f) {
  return f ? new Date(f + 'T00:00:00').toLocaleDateString('es-CO') : '—';
}

function fmtCop(v) {
  return v ? `$${Number(v).toLocaleString('es-CO')}` : '—';
}

/** @param {{ empleado: object, puedo: (mod: string, acc: string) => boolean }} props */
export function PanelEmpleado({ empleado }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 20 }}>
          {iniciales(empleado.nombres, empleado.apellidos)}
        </Avatar>
        <Box flex={1}>
          <Typography variant="h6" fontWeight={700}>
            {empleado.nombres} {empleado.apellidos}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {empleado.cargo ?? 'Sin cargo'} · {empleado.area ?? 'Sin área'}
          </Typography>
        </Box>
        <Chip
          label={empleado.activo ? 'Activo' : 'Inactivo'}
          color={empleado.activo ? 'success' : 'default'}
          size="small"
        />
      </Box>

      <Grid container spacing={1}>
        {[
          ['Documento',    `${empleado.tipoDocumento ?? ''} ${empleado.numeroDocumento ?? '—'}`],
          ['Email',        empleado.email             ?? '—'],
          ['Teléfono',     empleado.telefono ?? empleado.celular ?? '—'],
          ['Sede',         empleado.sedeNombre        ?? '—'],
          ['Contrato',     empleado.tipoContrato?.replace(/_/g, ' ') ?? '—'],
          ['Ingreso',      fmtFecha(empleado.fechaIngreso)],
          ['Fin contrato', fmtFecha(empleado.fechaFinContrato)],
          ['Salario',      fmtCop(empleado.salario)],
          ['EPS',          empleado.eps      ?? '—'],
          ['Pensión',      empleado.pension  ?? '—'],
        ].map(([k, v]) => (
          <Grid key={k} size={{ xs: 6, sm: 4 }}>
            <Typography variant="caption" color="text.secondary" display="block">{k}</Typography>
            <Typography variant="body2" fontWeight={500}>{v}</Typography>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

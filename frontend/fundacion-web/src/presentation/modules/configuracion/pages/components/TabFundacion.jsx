import { Grid, TextField } from '@mui/material';
import { Seccion } from './Seccion';

export function TabFundacion({ form, set }) {
  return (
    <Seccion titulo="Datos de la Fundación">
      <Grid container spacing={2.5}>
        <Grid size={12}>
          <TextField fullWidth size="small" label="Nombre de la fundación"
            value={form.nombreFundacion} onChange={set('nombreFundacion')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="NIT" value={form.nit} onChange={set('nit')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="Teléfono" value={form.telefono} onChange={set('telefono')} />
        </Grid>
        <Grid size={12}>
          <TextField fullWidth size="small" label="Dirección" value={form.direccion} onChange={set('direccion')} />
        </Grid>
      </Grid>
    </Seccion>
  );
}

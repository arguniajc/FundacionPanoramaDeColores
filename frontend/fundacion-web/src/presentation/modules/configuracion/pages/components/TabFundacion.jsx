import { Grid, TextField } from '@mui/material';
import { Seccion } from './Seccion';
import { CampoTelefono } from '@/shared/components/form/FormControles';
import { ayudaNit } from './helpers';

export function TabFundacion({ form, set, setForm, v }) {
  return (
    <Seccion titulo="Datos de la Fundación">
      <Grid container spacing={2.5}>
        <Grid size={12}>
          <TextField fullWidth size="small" label="Nombre de la fundación"
            value={form.nombreFundacion} onChange={set('nombreFundacion')}
            slotProps={{ htmlInput: { autoComplete: 'off' } }}
            {...v.props('nombreFundacion')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="NIT" value={form.nit} onChange={set('nit')}
            slotProps={{ htmlInput: { inputMode: 'tel', autoComplete: 'off' } }}
            {...v.props('nit', ayudaNit(form.nit))} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          {/* Teléfono de la fundación, no del usuario: sin autocompletar */}
          <CampoTelefono label="Teléfono" autoComplete="off" value={form.telefono}
            onChange={t => setForm(p => ({ ...p, telefono: t }))}
            {...v.props('telefono')} />
        </Grid>
        <Grid size={12}>
          <TextField fullWidth size="small" label="Dirección" value={form.direccion} onChange={set('direccion')}
            slotProps={{ htmlInput: { autoComplete: 'off' } }}
            {...v.props('direccion')} />
        </Grid>
      </Grid>
    </Seccion>
  );
}

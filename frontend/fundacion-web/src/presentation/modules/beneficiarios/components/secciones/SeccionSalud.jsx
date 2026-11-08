import { Grid, TextField, Autocomplete, Checkbox, FormControlLabel } from '@mui/material';
import { EPS_LIST } from '@/shared/constants/beneficiarios';
import { NO_REGISTRA } from './beneficiarioForm';
import { SeccionTitulo, CampoSelect, NoRegistra } from './comunes';
import { ayuda } from './ayuda';

/** EPS (o "No registra"), alergia, observaciones y discapacidad. */
export default function SeccionSalud({ c }) {
  const { form, err } = c;
  return (
    <>
      <SeccionTitulo>Salud</SeccionTitulo>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Autocomplete freeSolo options={EPS_LIST} value={form.eps}
          onChange={(_, v) => c.setV('eps', v ?? '')}
          onInputChange={(_, v, reason) => {
            if (form.eps === NO_REGISTRA) return;
            if (reason === 'input') c.setV('eps', c.capitalizarTexto(v || ''));
          }}
          slotProps={{ popper: { placement: 'bottom-start', modifiers: [{ name: 'flip', enabled: false }] } }}
          renderInput={params => (
            <TextField {...params} fullWidth label="EPS" size="small" required onBlur={c.touch('eps')}
              error={!!err('eps')}
              helperText={ayuda(err('eps'), <NoRegistra c={c} campo="eps" etiqueta="EPS" />)}
              slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps?.htmlInput, ...(form.eps === NO_REGISTRA ? { readOnly: true } : {}) } }} />
          )} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <CampoSelect c={c} campo="tieneAlergia" label="¿Tiene alergia?" vacio={null}
          opciones={[{ value: 'no', label: 'No' }, { value: 'si', label: 'Sí' }]} />
      </Grid>
      {form.tieneAlergia === 'si' && (
        <Grid size={12}>
          <TextField fullWidth label="Descripción de la alergia" size="small" required
            value={form.descripcionAlergia} onChange={c.capitalizar('descripcionAlergia')} onBlur={c.touch('descripcionAlergia')}
            error={!!err('descripcionAlergia')} helperText={ayuda(err('descripcionAlergia'))} />
        </Grid>
      )}
      <Grid size={12}>
        <TextField fullWidth label="Observaciones de salud" size="small" multiline rows={2}
          value={form.observacionesSalud} onChange={c.capitalizar('observacionesSalud')} />
      </Grid>
      <Grid size={12}>
        <FormControlLabel
          control={
            <Checkbox checked={!!form.tieneDiscapacidad} color="secondary"
              onChange={e => c.setForm(p => ({ ...p, tieneDiscapacidad: e.target.checked, descripcionDiscapacidad: '' }))} />
          }
          label="Tiene discapacidad o condición de salud especial" />
      </Grid>
      {form.tieneDiscapacidad && (
        <Grid size={12}>
          <TextField fullWidth label="Descripción de la discapacidad / condición" size="small" required
            value={form.descripcionDiscapacidad} onChange={c.capitalizar('descripcionDiscapacidad')} onBlur={c.touch('descripcionDiscapacidad')}
            error={!!err('descripcionDiscapacidad')} helperText={ayuda(err('descripcionDiscapacidad'))} />
        </Grid>
      )}
    </>
  );
}

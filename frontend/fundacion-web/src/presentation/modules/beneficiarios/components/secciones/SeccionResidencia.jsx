import { Grid, TextField } from '@mui/material';
import { NO_REGISTRA } from './beneficiarioForm';
import { SeccionTitulo, NoRegistra } from './comunes';
import { ayuda } from './ayuda';

/** Barrio y dirección, iguales para niño y adulto (la dirección es obligatoria solo para niños). */
export default function SeccionResidencia({ c }) {
  const { form, err } = c;
  const campo = (nombre, label, required, size) => (
    <Grid size={size}>
      <TextField fullWidth label={label} size="small" required={required} autoComplete="off"
        value={form[nombre]} onChange={c.capitalizar(nombre)} onBlur={c.touch(nombre)}
        error={!!err(nombre)}
        helperText={ayuda(err(nombre), <NoRegistra c={c} campo={nombre} etiqueta={label} />)}
        slotProps={{ htmlInput: form[nombre] === NO_REGISTRA ? { readOnly: true } : undefined }} />
    </Grid>
  );
  return (
    <>
      <SeccionTitulo>Residencia</SeccionTitulo>
      {campo('barrio', 'Barrio', true, { xs: 12, sm: 4 })}
      {campo('direccion', 'Dirección', c.esNino, { xs: 12, sm: 8 })}
    </>
  );
}

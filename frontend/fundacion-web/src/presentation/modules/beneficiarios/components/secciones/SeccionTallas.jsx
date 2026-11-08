import { Grid, TextField, Autocomplete, InputAdornment } from '@mui/material';
import { TALLAS_CAMISA, TALLAS_PANTALON, TALLAS_ZAPATOS } from '@/shared/constants/beneficiarios';
import { SeccionTitulo, CampoSelect } from './comunes';
import { ayuda } from './ayuda';

/** Tallas de ropa y calzado, peso (decimal) y estatura (entero). */
export default function SeccionTallas({ c }) {
  const { form, err } = c;
  const tallaLibre = (campo, label, opciones) => (
    <Grid size={{ xs: 12, sm: 4 }}>
      <Autocomplete freeSolo options={opciones} value={form[campo]}
        onChange={(_, v) => c.setV(campo, v ?? '')}
        onInputChange={(_, v) => c.setV(campo, v)}
        renderInput={params => (
          <TextField {...params} fullWidth label={label} size="small" required onBlur={c.touch(campo)}
            error={!!err(campo)} helperText={ayuda(err(campo))} />
        )} />
    </Grid>
  );
  return (
    <>
      <SeccionTitulo>Tallas</SeccionTitulo>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CampoSelect c={c} campo="tallaCamisa" label="Talla camisa" required opciones={TALLAS_CAMISA} />
      </Grid>
      {tallaLibre('tallaPantalon', 'Talla pantalón', TALLAS_PANTALON)}
      {tallaLibre('tallaZapatos', 'Talla zapatos', TALLAS_ZAPATOS)}
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Peso" size="small" required autoComplete="off" placeholder="Ej: 25.5"
          value={form.pesoKg} onChange={c.decimal('pesoKg')} onBlur={c.touch('pesoKg')}
          error={!!err('pesoKg')} helperText={ayuda(err('pesoKg'))}
          slotProps={{ htmlInput: { inputMode: 'decimal', maxLength: 6 },
            input: { endAdornment: <InputAdornment position="end">kg</InputAdornment> } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Talla (altura)" size="small" required autoComplete="off" placeholder="Ej: 120"
          value={form.tallaCm} onChange={c.soloDigitos('tallaCm')} onBlur={c.touch('tallaCm')}
          error={!!err('tallaCm')} helperText={ayuda(err('tallaCm'))}
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 3 },
            input: { endAdornment: <InputAdornment position="end">cm</InputAdornment> } }} />
      </Grid>
    </>
  );
}

import { Grid, TextField, Autocomplete } from '@mui/material';
import { GRADOS, NIVELES_EDUCATIVOS, NO_REGISTRA } from './beneficiarioForm';
import { SeccionTitulo, CampoSelect, NoRegistra } from './comunes';
import { ayuda } from './ayuda';

/** Colegio y grado (niño) o nivel educativo alcanzado (adulto). */
export default function SeccionEducacion({ c }) {
  const { form } = c;
  return (
    <>
      <SeccionTitulo>Educación</SeccionTitulo>
      {c.esNino ? (
        <>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth label="Nombre del colegio" size="small" autoComplete="off"
              value={form.nombreColegio} onChange={c.capitalizar('nombreColegio')}
              helperText={ayuda('', <NoRegistra c={c} campo="nombreColegio" etiqueta="Nombre del colegio" />)}
              slotProps={{ htmlInput: form.nombreColegio === NO_REGISTRA ? { readOnly: true } : undefined }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Autocomplete freeSolo options={GRADOS} value={form.gradoEscolar}
              onInputChange={(_, v) => c.setV('gradoEscolar', v)}
              renderInput={params => <TextField {...params} label="Grado escolar" size="small" />} />
          </Grid>
        </>
      ) : (
        <Grid size={{ xs: 12, sm: 8 }}>
          <CampoSelect c={c} campo="gradoEscolar" label="Nivel educativo alcanzado" vacio="No especificado"
            opciones={NIVELES_EDUCATIVOS} />
        </Grid>
      )}
    </>
  );
}

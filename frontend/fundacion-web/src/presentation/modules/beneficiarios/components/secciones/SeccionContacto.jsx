import { Grid, TextField } from '@mui/material';
import { PARENTESCOS } from '@/shared/constants/beneficiarios';
import { NO_REGISTRA } from './beneficiarioForm';
import { SeccionTitulo, CampoSelect, NoRegistra } from './comunes';
import { ayuda } from './ayuda';

const PROPS_CELULAR = { inputMode: 'tel', autoComplete: 'off', maxLength: 10 };

/** Acudiente del niño: nombre, parentesco, WhatsApp y si vive con él. */
export function SeccionAcudiente({ c }) {
  const { form, err } = c;
  return (
    <>
      <SeccionTitulo>Acudiente</SeccionTitulo>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Nombre del acudiente" size="small" required autoComplete="off"
          value={form.nombreAcudiente} onChange={c.capitalizar('nombreAcudiente')} onBlur={c.touch('nombreAcudiente')}
          error={!!err('nombreAcudiente')} helperText={ayuda(err('nombreAcudiente'))} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <CampoSelect c={c} campo="parentesco" label="Parentesco" required opciones={PARENTESCOS} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="WhatsApp" size="small" required placeholder="Ej: 3001234567"
          value={form.whatsapp} onChange={c.soloDigitos('whatsapp')} onBlur={c.touch('whatsapp')}
          error={!!err('whatsapp')} helperText={ayuda(err('whatsapp'))}
          slotProps={{ htmlInput: PROPS_CELULAR }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <CampoSelect c={c} campo="viveConNino" label="¿Vive con el niño?" required
          opciones={[{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]} />
      </Grid>
    </>
  );
}

/** Contacto propio del adulto: celular / WhatsApp (o "No registra"). */
export function SeccionContactoAdulto({ c }) {
  const { form, err } = c;
  const noRegistra = form.celular === NO_REGISTRA;
  return (
    <>
      <SeccionTitulo>Contacto</SeccionTitulo>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Celular / WhatsApp" size="small" required placeholder="Ej: 3001234567"
          value={form.celular} onChange={noRegistra ? undefined : c.soloDigitos('celular')} onBlur={c.touch('celular')}
          error={!!err('celular')}
          helperText={ayuda(err('celular'), <NoRegistra c={c} campo="celular" etiqueta="Celular / WhatsApp" />)}
          slotProps={{ htmlInput: noRegistra ? { inputMode: 'tel', autoComplete: 'off', readOnly: true } : PROPS_CELULAR }} />
      </Grid>
    </>
  );
}

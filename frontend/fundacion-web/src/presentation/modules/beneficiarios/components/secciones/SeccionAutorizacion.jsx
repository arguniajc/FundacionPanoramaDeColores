import { Grid, Checkbox, FormControl, FormControlLabel, FormHelperText } from '@mui/material';
import UploadFoto      from '@/shared/components/UploadFoto';
import UploadDocumento from '@/shared/components/UploadDocumento';
import { SeccionTitulo } from './comunes';

/** Casilla de autorización de datos (obligatoria al inscribir). */
export function SeccionAutorizacion({ c, required = false }) {
  const { form, err } = c;
  const msg = err('autorizacion');
  const id = `${c.idPrefix}-autorizacion-ayuda`;
  return (
    <>
      <SeccionTitulo>Autorización</SeccionTitulo>
      <Grid size={12}>
        <FormControl required={required} error={!!msg}>
          <FormControlLabel
            required={required}
            control={
              <Checkbox checked={!!form.autorizacion} color="primary"
                slotProps={{ input: { 'aria-describedby': msg ? id : undefined } }}
                onChange={e => { c.setV('autorizacion', e.target.checked); c.marcarTocado('autorizacion'); }} />
            }
            label={c.esNino
              ? 'Autorizo la inscripción del menor a los programas de la Fundación Panorama de Colores y el uso de sus datos con fines institucionales.'
              : 'Autorizo mi inscripción a los programas de la Fundación Panorama de Colores y el uso de mis datos con fines institucionales.'}
          />
          {msg && <FormHelperText id={id}>{msg}</FormHelperText>}
        </FormControl>
      </Grid>
    </>
  );
}

/** Foto del beneficiario y del documento (al editar, el documento se asocia al id). */
export function SeccionFotos({ c, beneficiarioId }) {
  const { form } = c;
  return (
    <>
      <SeccionTitulo>Fotos</SeccionTitulo>
      <Grid size={{ xs: 12, sm: 4 }}>
        <UploadFoto label={c.esNino ? 'Foto del menor' : 'Foto del beneficiario'} carpeta="fotos"
          value={form.fotoMenorUrl} onChange={url => c.setV('fotoMenorUrl', url)} />
      </Grid>
      <Grid size={{ xs: 12, sm: 8 }}>
        <UploadDocumento value={form.fotoDocumentoUrl} beneficiarioId={beneficiarioId}
          onChange={url => c.setForm(p => ({ ...p, fotoDocumentoUrl: url, fotoDocumentoReversoUrl: null }))} />
      </Grid>
    </>
  );
}

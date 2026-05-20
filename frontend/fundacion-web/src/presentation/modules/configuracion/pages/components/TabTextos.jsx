import { Box, Grid, TextField } from '@mui/material';
import { Seccion } from './Seccion';

export function TabTextos({ form, set }) {
  return (
    <Box>
      <Seccion titulo="Identidad y contacto">
        <Grid container spacing={2.5}>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Tagline / Slogan"
              placeholder="Ej: Transformando vidas a través de la educación y el arte"
              value={form.tagline} onChange={set('tagline')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Correo de contacto" type="email"
              placeholder="contacto@fundacion.org" value={form.emailContacto} onChange={set('emailContacto')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Sitio web"
              placeholder="https://fundacionpanoramadecolores.org"
              value={form.sitioWeb} onChange={set('sitioWeb')} />
          </Grid>
        </Grid>
      </Seccion>
      <Box mt={3}>
        <Seccion titulo="Misión y Visión (panel admin)">
          <Grid container spacing={2.5}>
            <Grid size={12}>
              <TextField fullWidth size="small" multiline minRows={3} label="Misión"
                value={form.mision} onChange={set('mision')} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth size="small" multiline minRows={3} label="Visión"
                value={form.vision} onChange={set('vision')} />
            </Grid>
          </Grid>
        </Seccion>
      </Box>
      <Box mt={3}>
        <Seccion titulo="Textos del panel administrativo">
          <Grid container spacing={2.5}>
            <Grid size={12}>
              <TextField fullWidth size="small" multiline minRows={2} label="Mensaje de bienvenida"
                value={form.mensajeBienvenida} onChange={set('mensajeBienvenida')} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth size="small" label="Footer del sistema"
                value={form.footerTexto} onChange={set('footerTexto')} />
            </Grid>
          </Grid>
        </Seccion>
      </Box>
    </Box>
  );
}

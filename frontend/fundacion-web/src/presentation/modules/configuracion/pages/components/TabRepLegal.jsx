import {
  Alert, FormControl, Grid, InputLabel, MenuItem, Select, TextField,
} from '@mui/material';
import { Seccion }             from './Seccion';
import { FirmaRepresentante }  from './FirmaRepresentante';
import { TIPOS_DOC }           from './helpers';

export function TabRepLegal({ form, set, setForm }) {
  return (
    <Seccion titulo="Representante Legal">
      <Alert severity="info" sx={{ mb: 2.5 }} icon={false}>
        Al <strong>autorizar un proyecto</strong> desde Proyectos, se toma una copia de estos datos.
        Actualizar aquí no cambia proyectos ya autorizados.
      </Alert>
      <Grid container spacing={2.5}>
        <Grid size={12}>
          <TextField fullWidth size="small" label="Nombre completo" value={form.nombreRepLegal} onChange={set('nombreRepLegal')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 5 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Tipo de documento</InputLabel>
            <Select label="Tipo de documento" value={form.tipoDocRep} onChange={set('tipoDocRep')}>
              {TIPOS_DOC.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 7 }}>
          <TextField fullWidth size="small" label="Número de documento" value={form.documentoRep} onChange={set('documentoRep')} />
        </Grid>
        <Grid size={12}>
          <TextField fullWidth size="small" label="Cargo"
            placeholder="Ej: Directora Ejecutiva, Representante Legal…"
            value={form.cargoRep} onChange={set('cargoRep')} />
        </Grid>
        <Grid size={12}>
          <FirmaRepresentante value={form.firmaRep} onChange={(v) => setForm(p => ({ ...p, firmaRep: v }))} />
        </Grid>
      </Grid>
    </Seccion>
  );
}

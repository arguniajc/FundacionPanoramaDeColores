import { Alert, Grid, TextField } from '@mui/material';
import { Seccion }             from './Seccion';
import { FirmaRepresentante }  from './FirmaRepresentante';
import { TIPOS_DOC_REP }       from './helpers';
import { CampoDocumento }      from '@/shared/components/form/FormControles';

export function TabRepLegal({ form, set, setForm, v }) {
  const setValor = k => val => setForm(p => ({ ...p, [k]: val }));
  return (
    <Seccion titulo="Representante Legal">
      <Alert severity="info" sx={{ mb: 2.5 }} icon={false}>
        Al <strong>autorizar un proyecto</strong> desde Proyectos, se toma una copia de estos datos.
        Actualizar aquí no cambia proyectos ya autorizados.
      </Alert>
      <Grid container spacing={2.5}>
        <Grid size={12}>
          <TextField fullWidth size="small" label="Nombre completo" value={form.nombreRepLegal} onChange={set('nombreRepLegal')}
            slotProps={{ htmlInput: { autoComplete: 'off' } }}
            {...v.props('nombreRepLegal')} />
        </Grid>
        <Grid size={12}>
          {/* Catálogo único de tipos; con NIT valida el DV y sugiere el correcto. */}
          <CampoDocumento
            aplicaA={TIPOS_DOC_REP}
            labelTipo="Tipo de documento" labelNumero="Número de documento"
            tipoDocumento={form.tipoDocRep} documento={form.documentoRep}
            onChangeTipo={setValor('tipoDocRep')} onChangeNumero={setValor('documentoRep')}
            validacionNumero={v.props('documentoRep')} />
        </Grid>
        <Grid size={12}>
          <TextField fullWidth size="small" label="Cargo"
            placeholder="Ej: Directora Ejecutiva, Representante Legal…"
            value={form.cargoRep} onChange={set('cargoRep')}
            {...v.props('cargoRep')} />
        </Grid>
        <Grid size={12}>
          <FirmaRepresentante value={form.firmaRep} onChange={setValor('firmaRep')} />
        </Grid>
      </Grid>
    </Seccion>
  );
}

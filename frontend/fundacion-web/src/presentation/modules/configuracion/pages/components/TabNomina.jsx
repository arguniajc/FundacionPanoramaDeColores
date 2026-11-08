import { Alert, Box, Grid, InputAdornment, TextField, Typography } from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import { COLOR } from './helpers';
import { fmtCOP } from '@/presentation/modules/talento_humano/pages/components/nominaFormato';
import { CampoMoneda } from '@/shared/components/form/FormControles';

/** Salario mínimo, auxilio de transporte y aportes del empleado que usa la liquidación de nómina. */
export function TabNomina({ form, set, setForm, v }) {
  // Tasas en % como texto con teclado decimal (la rueda del mouse no cambia el valor);
  // nominaParaApi acepta coma o punto decimal.
  const porcentaje = {
    input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
    htmlInput: { inputMode: 'decimal' },
  };
  const setValor = k => val => setForm(p => ({ ...p, [k]: val }));
  const smlmv = Number(form.nominaSmlmv) || 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <PaymentsIcon sx={{ color: COLOR }} />
        <Box>
          <Typography sx={{ fontWeight: 700, color: COLOR }}>Parámetros de nómina</Typography>
          <Typography sx={{ color: 'text.secondary' }} variant="caption">
            Valores con los que se liquida la nómina de los empleados.
          </Typography>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 2.5 }}>
        <strong>Actualízalos cada enero según el decreto del Gobierno.</strong> Los cambios aplican a las
        liquidaciones que se hagan o editen desde ahora; las ya guardadas conservan sus valores.
      </Alert>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <CampoMoneda label="Salario mínimo mensual (SMLMV) *"
            value={form.nominaSmlmv ?? ''} onChange={setValor('nominaSmlmv')}
            {...v.props('nominaSmlmv', smlmv > 0 ? `${fmtCOP(smlmv)} · el auxilio aplica hasta ${fmtCOP(2 * smlmv)} (2 SMLMV)` : 'Ejemplo: 1.423.500')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <CampoMoneda label="Auxilio de transporte mensual *"
            value={form.nominaAuxilioTransporte ?? ''} onChange={setValor('nominaAuxilioTransporte')}
            {...v.props('nominaAuxilioTransporte', 'Proporcional a los días trabajados')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" type="text" label="Aporte a salud del empleado *"
            value={form.nominaTasaSalud ?? ''} onChange={set('nominaTasaSalud')} slotProps={porcentaje}
            {...v.props('nominaTasaSalud', 'Porcentaje que se descuenta del salario. Ejemplo: 4')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" type="text" label="Aporte a pensión del empleado *"
            value={form.nominaTasaPension ?? ''} onChange={set('nominaTasaPension')} slotProps={porcentaje}
            {...v.props('nominaTasaPension', 'Porcentaje que se descuenta del salario. Ejemplo: 4')} />
        </Grid>
      </Grid>
    </Box>
  );
}

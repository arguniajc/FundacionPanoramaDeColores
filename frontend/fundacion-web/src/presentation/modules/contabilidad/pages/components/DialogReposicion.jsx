import { useState, useEffect } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormHelperText, Grid, InputAdornment, InputLabel, MenuItem, Select, TextField,
} from '@mui/material';
import { fmt, hoy } from './formato';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  cuentaOrigenId: { etiqueta: 'Transferir desde', reglas: [
    r.propia((v, form) => (form.hayBancos ? '' : 'No hay cuentas bancarias. Créala primero en la pestaña "Cuentas".')),
    r.seleccion('la cuenta bancaria de donde sale el dinero'),
  ] },
  fecha: { etiqueta: 'Fecha', reglas: [
    r.obligatorio('2026-03-15'), r.fecha({ ejemplo: '2026-03-15' }),
    // No futura, comparada con hoy() (el mismo valor que se pone por defecto)
    r.propia(v => (v && v > hoy() ? 'La fecha no puede ser futura. Revisa el día y el año.' : '')),
  ] },
  monto: { etiqueta: 'Monto a reponer', reglas: [r.obligatorio('300000'), r.monto('300000')] },
};

export function DialogReposicion({ open, cuentaCajaId, cuentas, guardando, onClose, onGuardar }) {
  const bancos     = cuentas.filter(c => c.tipo === 'cuenta_bancaria');
  const cajaNombre = cuentas.find(c => c.id === cuentaCajaId)?.nombre ?? 'Caja';

  const [form, setForm] = useState({ cuentaOrigenId: '', fecha: hoy(), monto: '', numeroSoporte: '', observacion: '' });
  const v = useValidacion(ESQUEMA, { ...form, hayBancos: bancos.length > 0 });
  const { reiniciar } = v;

  useEffect(() => {
    if (open) {
      setForm({ cuentaOrigenId: bancos[0]?.id ?? '', fecha: hoy(), monto: '', numeroSoporte: '', observacion: '' });
      reiniciar();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const guardar = () => {
    if (!v.validarTodo()) return;
    onGuardar({
      cuentaCajaId,
      cuentaOrigenId: form.cuentaOrigenId,
      fecha:          form.fecha,
      monto:          parseFloat(form.monto),
      numeroSoporte:  form.numeroSoporte  || null,
      observacion:    form.observacion    || null,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reposición de Caja Menor</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Se trasladarán fondos hacia <strong>{cajaNombre}</strong>. Se registrará un egreso
          en la cuenta bancaria y un ingreso en la caja.
        </Alert>
        {bancos.length === 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No hay cuentas bancarias configuradas. Créalas en la pestaña "Cuentas".
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid size={12}>
            <FormControl fullWidth size="small" error={!!v.err('cuentaOrigenId')}>
              <InputLabel>Transferir desde *</InputLabel>
              <Select value={form.cuentaOrigenId} label="Transferir desde *" onChange={set('cuentaOrigenId')}
                onBlur={() => v.tocar('cuentaOrigenId')}>
                {bancos.map(b => (
                  <MenuItem key={b.id} value={b.id}>{b.nombre} — {fmt(b.saldoActual)}</MenuItem>
                ))}
              </Select>
              {v.err('cuentaOrigenId') && <FormHelperText>{v.err('cuentaOrigenId')}</FormHelperText>}
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Fecha *" type="date" size="small"
              value={form.fecha} onChange={set('fecha')} InputLabelProps={{ shrink: true }}
              {...v.props('fecha')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Monto a reponer *" type="number" size="small"
              value={form.monto} onChange={set('monto')} {...v.props('monto')}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="N° transferencia / comprobante" size="small"
              value={form.numeroSoporte} onChange={set('numeroSoporte')} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Observación" size="small" multiline rows={2}
              value={form.observacion} onChange={set('observacion')} />
          </Grid>
        </Grid>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion="registrar la reposición" />
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color="primary" disabled={guardando} onClick={guardar}>
          {guardando ? 'Procesando…' : 'Registrar Reposición'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

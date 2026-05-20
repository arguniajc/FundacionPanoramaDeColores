import { useState, useEffect } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Grid, InputAdornment, InputLabel, MenuItem, Select, TextField,
} from '@mui/material';
import { fmt, hoy } from './helpers';

export function DialogReposicion({ open, cuentaCajaId, cuentas, guardando, onClose, onGuardar }) {
  const bancos     = cuentas.filter(c => c.tipo === 'cuenta_bancaria');
  const cajaNombre = cuentas.find(c => c.id === cuentaCajaId)?.nombre ?? 'Caja';

  const [form, setForm] = useState({ cuentaOrigenId: '', fecha: hoy(), monto: '', numeroSoporte: '', observacion: '' });

  useEffect(() => {
    if (open) setForm({ cuentaOrigenId: bancos[0]?.id ?? '', fecha: hoy(), monto: '', numeroSoporte: '', observacion: '' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const canSave = form.cuentaOrigenId && form.fecha && form.monto;

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
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Transferir desde *</InputLabel>
              <Select value={form.cuentaOrigenId} label="Transferir desde *" onChange={set('cuentaOrigenId')}>
                {bancos.map(b => (
                  <MenuItem key={b.id} value={b.id}>{b.nombre} — {fmt(b.saldoActual)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Fecha *" type="date" size="small"
              value={form.fecha} onChange={set('fecha')} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Monto a reponer *" type="number" size="small"
              value={form.monto} onChange={set('monto')}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="N° transferencia / comprobante" size="small"
              value={form.numeroSoporte} onChange={set('numeroSoporte')} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Observación" size="small" multiline rows={2}
              value={form.observacion} onChange={set('observacion')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color="primary" disabled={!canSave || !bancos.length || guardando}
          onClick={() => onGuardar({
            cuentaCajaId,
            cuentaOrigenId: form.cuentaOrigenId,
            fecha:          form.fecha,
            monto:          parseFloat(form.monto),
            numeroSoporte:  form.numeroSoporte  || null,
            observacion:    form.observacion    || null,
          })}>
          {guardando ? 'Procesando…' : 'Registrar Reposición'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

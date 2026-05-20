import { useState, useEffect } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, InputAdornment, TextField,
} from '@mui/material';
import { fmt, hoy } from './helpers';

export function DialogArqueo({ open, cuenta, guardando, onClose, onGuardar }) {
  const [form, setForm] = useState({ fecha: hoy(), saldoFisico: '', observacion: '', responsable: '' });

  useEffect(() => {
    if (open) setForm({ fecha: hoy(), saldoFisico: '', observacion: '', responsable: '' });
  }, [open]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const saldoFisicoNum = parseFloat(form.saldoFisico) || 0;
  const diferencia     = form.saldoFisico !== '' ? saldoFisicoNum - (cuenta?.saldoActual ?? 0) : null;
  const canSave = form.fecha && form.saldoFisico !== '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Arqueo de Caja — {cuenta?.nombre}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Saldo registrado en sistema: <strong>{fmt(cuenta?.saldoActual)}</strong>
        </Alert>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Fecha del arqueo *" type="date" size="small"
              value={form.fecha} onChange={set('fecha')} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Conteo físico (efectivo) *" type="number" size="small"
              value={form.saldoFisico} onChange={set('saldoFisico')}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              helperText="Cuente el efectivo físico en caja" />
          </Grid>
          {diferencia !== null && (
            <Grid item xs={12}>
              <Alert severity={diferencia === 0 ? 'success' : diferencia > 0 ? 'warning' : 'error'}>
                <strong>Diferencia: {diferencia > 0 ? '+' : ''}{fmt(diferencia)}</strong>
                {diferencia === 0 && ' — Cuadre exacto ✓'}
                {diferencia > 0 && ' — Sobrante de caja'}
                {diferencia < 0 && ' — Faltante de caja'}
              </Alert>
            </Grid>
          )}
          <Grid item xs={12}>
            <TextField fullWidth label="Responsable del arqueo" size="small"
              value={form.responsable} onChange={set('responsable')} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Observaciones" size="small" multiline rows={2}
              value={form.observacion} onChange={set('observacion')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={!canSave || guardando}
          onClick={() => onGuardar({
            cuentaId:    cuenta?.id,
            fecha:       form.fecha,
            saldoFisico: saldoFisicoNum,
            observacion: form.observacion || null,
            responsable: form.responsable || null,
          })}>
          {guardando ? 'Guardando…' : 'Registrar Arqueo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

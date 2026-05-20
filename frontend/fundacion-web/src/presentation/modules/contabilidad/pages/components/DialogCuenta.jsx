import { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Grid, InputAdornment, InputLabel, MenuItem, Select, TextField,
} from '@mui/material';

export function DialogCuenta({ open, modo, data, guardando, onClose, onGuardar }) {
  const [form, setForm] = useState({ nombre: '', tipo: 'caja', banco: '', numeroCuenta: '', saldoInicial: '0' });

  useEffect(() => {
    if (!open) return;
    if (modo === 'editar' && data) {
      setForm({
        nombre: data.nombre,
        tipo: data.tipo,
        banco: data.banco ?? '',
        numeroCuenta: data.numeroCuenta ?? '',
        saldoInicial: String(data.saldoInicial ?? 0),
      });
    } else {
      setForm({ nombre: '', tipo: 'caja', banco: '', numeroCuenta: '', saldoInicial: '0' });
    }
  }, [open, modo, data]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{modo === 'crear' ? 'Nueva Cuenta' : 'Editar Cuenta'}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth label="Nombre *" size="small" value={form.nombre} onChange={set('nombre')} />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo *</InputLabel>
              <Select value={form.tipo} label="Tipo *" onChange={set('tipo')}>
                <MenuItem value="caja_menor">Caja Menor</MenuItem>
                <MenuItem value="caja">Caja efectivo (general)</MenuItem>
                <MenuItem value="cuenta_bancaria">Cuenta bancaria</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {form.tipo === 'cuenta_bancaria' && (
            <>
              <Grid item xs={12}>
                <TextField fullWidth label="Banco" size="small" value={form.banco} onChange={set('banco')} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Número de cuenta" size="small"
                  value={form.numeroCuenta} onChange={set('numeroCuenta')} />
              </Grid>
            </>
          )}
          {modo === 'crear' && (
            <Grid item xs={12}>
              <TextField fullWidth label="Saldo inicial" type="number" size="small"
                value={form.saldoInicial} onChange={set('saldoInicial')}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={!form.nombre.trim() || guardando}
          onClick={() => onGuardar({
            nombre: form.nombre.trim(),
            tipo: form.tipo,
            banco: form.banco || null,
            numeroCuenta: form.numeroCuenta || null,
            saldoInicial: parseFloat(form.saldoInicial) || 0,
          })}>
          {guardando ? 'Guardando…' : (modo === 'crear' ? 'Crear' : 'Guardar')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

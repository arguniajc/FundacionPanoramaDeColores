import { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Grid, InputAdornment, InputLabel, MenuItem, Select, TextField,
} from '@mui/material';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';

const esBancaria = form => form.tipo === 'cuenta_bancaria';

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  nombre:       { etiqueta: 'Nombre',           reglas: [r.obligatorio('Bancolombia ahorros'), r.texto({ min: 3, max: 100, ejemplo: 'Bancolombia ahorros' })] },
  banco:        { etiqueta: 'Banco',            reglas: [r.si(esBancaria, r.texto({ min: 3, max: 100, ejemplo: 'Bancolombia' }))] },
  numeroCuenta: { etiqueta: 'Número de cuenta', reglas: [r.si(esBancaria, r.propia(v => (
    !v || /^\d[\d-]{3,19}$/.test(String(v).trim()) ? ''
      : 'Escribe solo números (puede llevar guiones), de 4 a 20 caracteres. Ejemplo: 123-456789-01')))] },
  saldoInicial: { etiqueta: 'Saldo inicial',    reglas: [r.si(form => form.crear, r.numero({ min: 0, unidad: 'pesos', ejemplo: '500000' }))] },
};

export function DialogCuenta({ open, modo, data, guardando, onClose, onGuardar }) {
  const [form, setForm] = useState({ nombre: '', tipo: 'caja', banco: '', numeroCuenta: '', saldoInicial: '0' });
  const v = useValidacion(ESQUEMA, { ...form, crear: modo === 'crear' });
  const { reiniciar } = v;

  useEffect(() => {
    if (!open) return;
    reiniciar();
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
  }, [open, modo, data, reiniciar]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const guardar = () => {
    if (!v.validarTodo()) return;
    onGuardar({
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      banco:        esBancaria(form) ? form.banco || null : null,
      numeroCuenta: esBancaria(form) ? form.numeroCuenta || null : null,
      saldoInicial: parseFloat(form.saldoInicial) || 0,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{modo === 'crear' ? 'Nueva Cuenta' : 'Editar Cuenta'}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField fullWidth label="Nombre *" size="small" value={form.nombre} onChange={set('nombre')}
              {...v.props('nombre')} />
          </Grid>
          <Grid size={12}>
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
              <Grid size={12}>
                <TextField fullWidth label="Banco" size="small" value={form.banco} onChange={set('banco')}
                  {...v.props('banco')} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Número de cuenta" size="small"
                  value={form.numeroCuenta} onChange={set('numeroCuenta')} {...v.props('numeroCuenta')} />
              </Grid>
            </>
          )}
          {modo === 'crear' && (
            <Grid size={12}>
              <TextField fullWidth label="Saldo inicial" type="number" size="small"
                value={form.saldoInicial} onChange={set('saldoInicial')} {...v.props('saldoInicial')}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion={modo === 'crear' ? 'crear la cuenta' : 'guardar la cuenta'} />
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={guardando} onClick={guardar}>
          {guardando ? 'Guardando…' : (modo === 'crear' ? 'Crear' : 'Guardar')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

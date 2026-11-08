import { useState } from 'react';
import {
  Alert, Button, DialogActions, DialogContent, DialogTitle,
  Grid, InputAdornment, TextField,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import { fmt, hoy } from './formato';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  fecha: { etiqueta: 'Fecha del arqueo', reglas: [
    r.obligatorio('2026-03-15'), r.fecha({ ejemplo: '2026-03-15' }),
    // No futura, comparada con hoy() (el mismo valor que se pone por defecto)
    r.propia(v => (v && v > hoy() ? 'La fecha no puede ser futura. Revisa el día y el año.' : '')),
  ] },
  // Puede ser 0 si la caja está vacía
  saldoFisico: { etiqueta: 'Conteo físico (efectivo)', reglas: [r.obligatorio('185000'), r.numero({ min: 0, unidad: 'pesos', ejemplo: '185000' })] },
  responsable: { etiqueta: 'Responsable del arqueo',   reglas: [r.texto({ min: 3, max: 120, soloLetras: true, ejemplo: 'Ana Gómez' })] },
};

export function DialogArqueo({ open, cuenta, guardando, onClose, onGuardar }) {
  const [form, setForm] = useState({ fecha: hoy(), saldoFisico: '', observacion: '', responsable: '' });
  const v = useValidacion(ESQUEMA, form);
  const { reiniciar } = v;

  // Al abrir se reinicia el formulario. Se ajusta durante el render al detectar el cambio, en vez de en un efecto.
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (open !== abiertoAntes) {
    setAbiertoAntes(open);
    if (open) {
      setForm({ fecha: hoy(), saldoFisico: '', observacion: '', responsable: '' });
      reiniciar();
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const saldoFisicoNum = parseFloat(form.saldoFisico) || 0;
  const diferencia     = form.saldoFisico !== '' ? saldoFisicoNum - (cuenta?.saldoActual ?? 0) : null;

  const guardar = () => {
    if (!v.validarTodo()) return;
    onGuardar({
      cuentaId:    cuenta?.id,
      fecha:       form.fecha,
      saldoFisico: saldoFisicoNum,
      observacion: form.observacion || null,
      responsable: form.responsable || null,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Arqueo de Caja — {cuenta?.nombre}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Saldo registrado en sistema: <strong>{fmt(cuenta?.saldoActual)}</strong>
        </Alert>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Fecha del arqueo *" type="date" size="small"
              value={form.fecha} onChange={set('fecha')} slotProps={{ inputLabel: { shrink: true } }}
              {...v.props('fecha')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} fullWidth label="Conteo físico (efectivo) *" type="number" size="small"
              value={form.saldoFisico} onChange={set('saldoFisico')}
              {...v.props('saldoFisico', 'Cuente el efectivo físico en caja')} />
          </Grid>
          {diferencia !== null && (
            <Grid size={12}>
              <Alert severity={diferencia === 0 ? 'success' : diferencia > 0 ? 'warning' : 'error'}>
                <strong>Diferencia: {diferencia > 0 ? '+' : ''}{fmt(diferencia)}</strong>
                {diferencia === 0 && ' — Cuadre exacto ✓'}
                {diferencia > 0 && ' — Sobrante de caja'}
                {diferencia < 0 && ' — Faltante de caja'}
              </Alert>
            </Grid>
          )}
          <Grid size={12}>
            <TextField fullWidth label="Responsable del arqueo" size="small"
              value={form.responsable} onChange={set('responsable')} {...v.props('responsable')} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Observaciones" size="small" multiline rows={2}
              value={form.observacion} onChange={set('observacion')} />
          </Grid>
        </Grid>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion="registrar el arqueo" />
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={guardando} onClick={guardar}>
          {guardando ? 'Guardando…' : 'Registrar Arqueo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

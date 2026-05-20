import { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, Grid, InputAdornment, InputLabel,
  MenuItem, Radio, RadioGroup, Select, TextField,
} from '@mui/material';
import { hoy } from './helpers';

export function DialogMovimiento({
  open, modo, data, tipoPreset, cuentaPreset,
  cuentas, categorias, programas, guardando, onClose, onGuardar,
}) {
  const EMPTY = {
    tipo: tipoPreset ?? 'ingreso',
    fecha: hoy(),
    concepto: '',
    monto: '',
    cuentaId: '',
    categoriaId: '',
    programaId: '',
    terceroNombre: '',
    terceroDocumento: '',
    numeroSoporte: '',
    descripcion: '',
  };
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (modo === 'editar' && data) {
      setForm({
        tipo: data.tipo,
        fecha: data.fecha,
        concepto: data.concepto,
        monto: String(data.monto),
        cuentaId: data.cuentaId,
        categoriaId: String(data.categoriaId),
        programaId: data.programaId ?? '',
        terceroNombre: data.terceroNombre ?? '',
        terceroDocumento: data.terceroDocumento ?? '',
        numeroSoporte: data.numeroSoporte ?? '',
        descripcion: data.descripcion ?? '',
      });
    } else {
      setForm({ ...EMPTY, tipo: tipoPreset ?? 'ingreso', cuentaId: cuentaPreset ?? cuentas[0]?.id ?? '' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setTipo = e => setForm(f => ({ ...f, tipo: e.target.value, categoriaId: '' }));

  const catsFiltradas = categorias.filter(c => c.tipo === form.tipo);
  const canSave = form.fecha && form.concepto.trim() && form.monto && form.cuentaId && form.categoriaId;

  const handleSubmit = () => onGuardar({
    tipo: form.tipo,
    fecha: form.fecha,
    concepto: form.concepto.trim(),
    monto: parseFloat(form.monto),
    cuentaId: form.cuentaId,
    categoriaId: parseInt(form.categoriaId),
    programaId: form.programaId || null,
    terceroNombre: form.terceroNombre || null,
    terceroDocumento: form.terceroDocumento || null,
    numeroSoporte: form.numeroSoporte || null,
    descripcion: form.descripcion || null,
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {modo === 'crear'
          ? (form.tipo === 'ingreso' ? 'Registrar Ingreso' : 'Registrar Egreso')
          : 'Editar Movimiento'}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <RadioGroup row value={form.tipo} onChange={setTipo}>
              <FormControlLabel value="ingreso" control={<Radio color="success" />} label="Ingreso" />
              <FormControlLabel value="egreso"  control={<Radio color="error"   />} label="Egreso"  />
            </RadioGroup>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Fecha *" type="date" size="small"
              value={form.fecha} onChange={set('fecha')} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Monto *" type="number" size="small"
              value={form.monto} onChange={set('monto')}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Concepto *" size="small"
              value={form.concepto} onChange={set('concepto')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Cuenta *</InputLabel>
              <Select value={form.cuentaId} label="Cuenta *" onChange={set('cuentaId')}>
                {cuentas.map(c => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Categoría PUC *</InputLabel>
              <Select value={form.categoriaId} label="Categoría PUC *" onChange={set('categoriaId')}>
                {catsFiltradas.map(c => (
                  <MenuItem key={c.id} value={String(c.id)}>{c.codigoPuc} — {c.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Programa (opcional)</InputLabel>
              <Select value={form.programaId} label="Programa (opcional)" onChange={set('programaId')}>
                <MenuItem value="">Sin programa</MenuItem>
                {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Nombre del tercero" size="small"
              value={form.terceroNombre} onChange={set('terceroNombre')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Documento del tercero" size="small"
              value={form.terceroDocumento} onChange={set('terceroDocumento')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="N° soporte / factura" size="small"
              value={form.numeroSoporte} onChange={set('numeroSoporte')} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Descripción adicional" size="small" multiline rows={2}
              value={form.descripcion} onChange={set('descripcion')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSave || guardando}
          color={form.tipo === 'ingreso' ? 'success' : 'error'}>
          {guardando ? 'Guardando…' : (modo === 'crear' ? 'Registrar' : 'Guardar')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

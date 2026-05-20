import { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Grid, InputAdornment, InputLabel, MenuItem, Select, TextField,
} from '@mui/material';

export function DialogPresupuesto({ open, modo, data, categorias, programas, presAnio, guardando, onClose, onGuardar }) {
  const [form, setForm] = useState({ anio: presAnio, categoriaId: '', programaId: '', montoPresupuestado: '' });

  useEffect(() => {
    if (!open) return;
    if (modo === 'editar' && data) {
      setForm({
        anio: data.anio,
        categoriaId: String(data.categoriaId),
        programaId: data.programaId ?? '',
        montoPresupuestado: String(data.montoPresupuestado),
      });
    } else {
      setForm({ anio: presAnio, categoriaId: '', programaId: '', montoPresupuestado: '' });
    }
  }, [open, modo, data, presAnio]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{modo === 'crear' ? 'Agregar línea presupuestal' : 'Editar presupuesto'}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Categoría PUC *</InputLabel>
              <Select value={form.categoriaId} label="Categoría PUC *" onChange={set('categoriaId')}>
                {categorias.map(c => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.codigoPuc} — {c.nombre} ({c.tipo})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Programa (opcional)</InputLabel>
              <Select value={form.programaId} label="Programa (opcional)" onChange={set('programaId')}>
                <MenuItem value="">General (sin programa)</MenuItem>
                {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Monto presupuestado *" type="number" size="small"
              value={form.montoPresupuestado} onChange={set('montoPresupuestado')}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained"
          disabled={!form.categoriaId || !form.montoPresupuestado || guardando}
          onClick={() => onGuardar({
            anio: parseInt(form.anio),
            categoriaId: parseInt(form.categoriaId),
            programaId: form.programaId || null,
            montoPresupuestado: parseFloat(form.montoPresupuestado),
          })}>
          {guardando ? 'Guardando…' : (modo === 'crear' ? 'Agregar' : 'Guardar')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import { useState } from 'react';
import {
  Button, DialogActions, DialogContent, DialogTitle,
  FormControl, FormHelperText, Grid, InputAdornment, InputLabel, MenuItem, Select, TextField,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  categoriaId:        { etiqueta: 'Categoría PUC',        reglas: [r.seleccion('5105 — Gastos de personal')] },
  montoPresupuestado: { etiqueta: 'Monto presupuestado', reglas: [r.obligatorio('12000000'), r.monto('12000000')] },
};

export function DialogPresupuesto({ open, modo, data, categorias, programas, presAnio, guardando, onClose, onGuardar }) {
  const [form, setForm] = useState({ anio: presAnio, categoriaId: '', programaId: '', montoPresupuestado: '' });
  const v = useValidacion(ESQUEMA, form);
  const { reiniciar } = v;

  // Al abrir (o cambiar el registro o el año) se reinicia el formulario. Se ajusta durante
  // el render al detectar el cambio, en vez de en un efecto.
  const [previo, setPrevio] = useState(null);
  if (!previo || previo.open !== open || previo.modo !== modo || previo.data !== data || previo.presAnio !== presAnio) {
    setPrevio({ open, modo, data, presAnio });
    if (open) reiniciarFormulario();
  }

  function reiniciarFormulario() {
    reiniciar();
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
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const guardar = () => {
    if (!v.validarTodo()) return;
    onGuardar({
      anio: parseInt(form.anio),
      categoriaId: parseInt(form.categoriaId),
      programaId: form.programaId || null,
      montoPresupuestado: parseFloat(form.montoPresupuestado),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{modo === 'crear' ? 'Agregar línea presupuestal' : 'Editar presupuesto'}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <FormControl fullWidth size="small" error={!!v.err('categoriaId')}>
              <InputLabel>Categoría PUC *</InputLabel>
              <Select value={form.categoriaId} label="Categoría PUC *" onChange={set('categoriaId')}
                onBlur={() => v.tocar('categoriaId')}>
                {categorias.map(c => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.codigoPuc} — {c.nombre} ({c.tipo})
                  </MenuItem>
                ))}
              </Select>
              {v.err('categoriaId') && <FormHelperText>{v.err('categoriaId')}</FormHelperText>}
            </FormControl>
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Programa (opcional)</InputLabel>
              <Select value={form.programaId} label="Programa (opcional)" onChange={set('programaId')}>
                <MenuItem value="">General (sin programa)</MenuItem>
                {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={12}>
            <TextField slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} fullWidth label="Monto presupuestado *" type="number" size="small"
              value={form.montoPresupuestado} onChange={set('montoPresupuestado')}
              {...v.props('montoPresupuestado')} />
          </Grid>
        </Grid>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion={modo === 'crear' ? 'agregar la línea presupuestal' : 'guardar el presupuesto'} />
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={guardando} onClick={guardar}>
          {guardando ? 'Guardando…' : (modo === 'crear' ? 'Agregar' : 'Guardar')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

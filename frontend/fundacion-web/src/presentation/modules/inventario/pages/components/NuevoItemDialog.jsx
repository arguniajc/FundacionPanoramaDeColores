import { useState, useEffect } from 'react';
import {
  Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Grid, InputLabel, MenuItem, Select, TextField,
} from '@mui/material';
import { inventarioRepository } from '../../../../../infrastructure/repositories/inventarioRepository';
import { COLOR, CATEGORIAS } from './helpers';
import { CampoUnidadMedida } from '../../../../../shared/components/form/FormControles';

const ITEM_VACIO = { codigo: '', nombre: '', descripcion: '', unidadMedida: 'unidad', categoria: 'Otros', stockActual: 0, stockMinimo: 0 };

export function NuevoItemDialog({ open, item, sedes, sedeSelId, onClose, onGuardado }) {
  const editando = !!item;
  const [form,      setForm]      = useState(ITEM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (open) {
      setForm(item
        ? { codigo: item.codigo ?? '', nombre: item.nombre, descripcion: item.descripcion ?? '',
            unidadMedida: item.unidadMedida, categoria: item.categoria, stockActual: item.stockActual, stockMinimo: item.stockMinimo }
        : { ...ITEM_VACIO, sedeId: sedeSelId ?? '' });
      setError('');
    }
  }, [open, item, sedeSelId]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    if (Number(form.stockMinimo) < 0) { setError('El stock mínimo no puede ser negativo.'); return; }
    if (!editando && Number(form.stockActual) < 0) { setError('El stock inicial no puede ser negativo.'); return; }
    setGuardando(true); setError('');
    try {
      let result;
      if (editando) {
        const { data } = await inventarioRepository.actualizarItem(item.id, {
          codigo: form.codigo || null, nombre: form.nombre, descripcion: form.descripcion || null,
          unidadMedida: form.unidadMedida, categoria: form.categoria,
          stockMinimo: Number(form.stockMinimo),
        });
        result = data;
      } else {
        const { data } = await inventarioRepository.crearItem({
          sedeId: form.sedeId || null,
          codigo: form.codigo || null, nombre: form.nombre, descripcion: form.descripcion || null,
          unidadMedida: form.unidadMedida, categoria: form.categoria,
          stockActual: Number(form.stockActual), stockMinimo: Number(form.stockMinimo),
        });
        result = data;
      }
      onGuardado(result, editando);
    } catch (e) {
      setError(e?.response?.data?.mensaje || 'Error al guardar el artículo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>
        {editando ? 'Editar artículo' : 'Nuevo artículo'}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          {!editando && (
            <Grid size={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Sede *</InputLabel>
                <Select value={form.sedeId ?? ''} label="Sede *" onChange={e => set('sedeId', e.target.value)}>
                  {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid size={8}>
            <TextField fullWidth size="small" label="Nombre *" value={form.nombre}
              onChange={e => set('nombre', e.target.value)} />
          </Grid>
          <Grid size={4}>
            <TextField fullWidth size="small" label="Código" value={form.codigo}
              onChange={e => set('codigo', e.target.value)} />
          </Grid>
          <Grid size={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Categoría</InputLabel>
              <Select value={form.categoria} label="Categoría" onChange={e => set('categoria', e.target.value)}>
                {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={6}>
            <CampoUnidadMedida value={form.unidadMedida} onChange={v => set('unidadMedida', v)} label="Unidad" />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Descripción" multiline rows={2}
              value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </Grid>
          {!editando && (
            <Grid size={6}>
              <TextField fullWidth size="small" label="Stock inicial" type="number"
                inputProps={{ min: 0, step: 1 }} value={form.stockActual}
                onChange={e => set('stockActual', e.target.value)} />
            </Grid>
          )}
          <Grid size={editando ? 12 : 6}>
            <TextField fullWidth size="small" label="Stock mínimo" type="number"
              inputProps={{ min: 0, step: 1 }} value={form.stockMinimo}
              onChange={e => set('stockMinimo', e.target.value)}
              helperText="Alerta cuando el stock baje de este valor" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}
          sx={{ bgcolor: COLOR, fontWeight: 700, '&:hover': { bgcolor: '#3b1270' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : editando ? 'Guardar cambios' : 'Crear artículo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

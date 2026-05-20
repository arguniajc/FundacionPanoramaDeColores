import { useState, useEffect } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, TextField,
} from '@mui/material';
import { actividadesRepository } from '../../../../../infrastructure/repositories/actividadesRepository';

const ESTADOS = [
  { value: 'programada',  label: 'Programada'  },
  { value: 'en_curso',    label: 'En curso'     },
  { value: 'realizada',   label: 'Realizada'    },
  { value: 'cancelada',   label: 'Cancelada'    },
];

const EMPTY_FORM = {
  titulo: '', descripcion: '', programaId: '', lugar: '',
  fechaInicio: '', fechaFin: '', estado: 'programada',
};

export function DialogActividad({ open, editando, fechaInicialSugerida, programas, onClose, onGuardado }) {
  const [form,   setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editando) {
      setForm({
        titulo:      editando.titulo,
        descripcion: editando.descripcion ?? '',
        programaId:  editando.programaId  ?? '',
        lugar:       editando.lugar       ?? '',
        fechaInicio: editando.fechaInicio?.slice(0, 16) ?? '',
        fechaFin:    editando.fechaFin?.slice(0, 16)    ?? '',
        estado:      editando.estado,
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        fechaInicio: fechaInicialSugerida ?? new Date().toISOString().slice(0, 16),
      });
    }
  }, [open, editando, fechaInicialSugerida]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const guardar = async () => {
    if (!form.titulo.trim() || !form.fechaInicio) {
      setError('Título y fecha de inicio son obligatorios.');
      return;
    }
    setSaving(true); setError('');
    try {
      const dto = {
        titulo:      form.titulo.trim(),
        descripcion: form.descripcion || null,
        programaId:  form.programaId  || null,
        lugar:       form.lugar       || null,
        fechaInicio: form.fechaInicio,
        fechaFin:    form.fechaFin    || null,
        ...(editando ? { estado: form.estado } : {}),
      };
      if (editando) {
        await actividadesRepository.actualizar(editando.id, dto);
      } else {
        await actividadesRepository.crear(dto);
      }
      onGuardado();
      onClose();
    } catch (e) {
      setError(e.response?.data?.error ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editando ? 'Editar actividad' : 'Nueva actividad'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField label="Título *" fullWidth size="small"
          value={form.titulo} onChange={set('titulo')} />
        <Grid container spacing={2}>
          <Grid size={6}>
            <TextField label="Fecha inicio *" type="datetime-local" fullWidth size="small"
              value={form.fechaInicio} onChange={set('fechaInicio')}
              slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={6}>
            <TextField label="Fecha fin" type="datetime-local" fullWidth size="small"
              value={form.fechaFin} onChange={set('fechaFin')}
              slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
        </Grid>
        <TextField select label="Programa (opcional)" fullWidth size="small"
          value={form.programaId} onChange={set('programaId')}>
          <MenuItem value="">— Sin programa —</MenuItem>
          {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
        </TextField>
        <TextField label="Lugar" fullWidth size="small"
          value={form.lugar} onChange={set('lugar')} />
        <TextField label="Descripción" fullWidth size="small" multiline rows={2}
          value={form.descripcion} onChange={set('descripcion')} />
        {editando && (
          <TextField select label="Estado" fullWidth size="small"
            value={form.estado} onChange={set('estado')}>
            {ESTADOS.map(e => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
          </TextField>
        )}
        {error && <Alert severity="error" sx={{ mt: 0 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

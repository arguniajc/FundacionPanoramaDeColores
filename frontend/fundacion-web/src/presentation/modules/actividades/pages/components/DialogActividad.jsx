import { useState, useEffect } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, MenuItem, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon    from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { actividadesRepository } from '../../../../../infrastructure/repositories/actividadesRepository';

const ESTADOS = [
  { value: 'programada',  label: 'Programada'  },
  { value: 'en_curso',    label: 'En curso'     },
  { value: 'realizada',   label: 'Realizada'    },
  { value: 'cancelada',   label: 'Cancelada'    },
];

const COLOR = '#4E1B95';

const EMPTY_FORM = {
  titulo: '', descripcion: '', programaId: '', lugar: '',
  fecha: '', horaInicio: '', horaFin: '',
  estado: 'programada',
  diasAdicionales: [],
};

// El backend devuelve ISO sin timezone (DateTimeKind.Unspecified),
// entonces extraemos fecha y hora directamente del string sin conversión TZ.
function parseFecha(iso) {
  return iso ? iso.slice(0, 10) : '';
}

function parseHora(iso) {
  return iso ? iso.slice(11, 16) : '';
}

export function DialogActividad({ open, editando, programas, onClose, onGuardado }) {
  const [form,   setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editando) {
      setForm({
        titulo:          editando.titulo,
        descripcion:     editando.descripcion ?? '',
        programaId:      editando.programaId  ?? '',
        lugar:           editando.lugar       ?? '',
        fecha:           parseFecha(editando.fechaInicio),
        horaInicio:      parseHora(editando.fechaInicio),
        horaFin:         editando.fechaFin ? parseHora(editando.fechaFin) : '',
        estado:          editando.estado,
        diasAdicionales: (editando.diasAdicionales ?? []).map(d => ({ ...d })),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, editando]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const agregarDia = () =>
    setForm(p => ({ ...p, diasAdicionales: [...p.diasAdicionales, { fecha: '', horaInicio: '', horaFin: '' }] }));

  const quitarDia = (idx) =>
    setForm(p => ({ ...p, diasAdicionales: p.diasAdicionales.filter((_, i) => i !== idx) }));

  const editarDia = (idx, campo, val) =>
    setForm(p => ({
      ...p,
      diasAdicionales: p.diasAdicionales.map((d, i) => i === idx ? { ...d, [campo]: val } : d),
    }));

  const guardar = async () => {
    if (!form.titulo.trim()) { setError('El título es obligatorio.'); return; }
    if (!form.fecha)          { setError('La fecha es obligatoria.'); return; }
    if (!form.horaInicio)     { setError('La hora de inicio es obligatoria.'); return; }
    if (form.horaFin && form.horaFin <= form.horaInicio) {
      setError('La hora de fin debe ser posterior a la de inicio.'); return;
    }
    for (const dia of form.diasAdicionales) {
      if (!dia.fecha || !dia.horaInicio || !dia.horaFin) {
        setError('Completa todos los campos de los días adicionales.'); return;
      }
      if (dia.horaFin <= dia.horaInicio) {
        setError('En días adicionales, la hora de fin debe ser posterior a la de inicio.'); return;
      }
    }

    setSaving(true); setError('');
    try {
      const dto = {
        titulo:          form.titulo.trim(),
        descripcion:     form.descripcion || null,
        programaId:      form.programaId  || null,
        lugar:           form.lugar       || null,
        fechaInicio:     `${form.fecha}T${form.horaInicio}:00`,
        fechaFin:        form.horaFin ? `${form.fecha}T${form.horaFin}:00` : null,
        estado:          form.estado,
        diasAdicionales: form.diasAdicionales.map(d => ({
          fecha:      d.fecha,
          horaInicio: d.horaInicio,
          horaFin:    d.horaFin,
        })),
      };
      await actividadesRepository.actualizar(editando.id, dto);
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
      <DialogTitle sx={{ fontWeight: 700, color: COLOR }}>Editar actividad</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>

        <TextField label="Título *" fullWidth size="small"
          value={form.titulo} onChange={set('titulo')} />

        {/* Fecha y rango horario principal */}
        <Grid container spacing={2}>
          <Grid size={4}>
            <TextField label="Fecha *" type="date" fullWidth size="small"
              value={form.fecha} onChange={set('fecha')}
              slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={4}>
            <TextField label="Hora inicio *" type="time" fullWidth size="small"
              value={form.horaInicio} onChange={set('horaInicio')}
              slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={4}>
            <TextField label="Hora fin" type="time" fullWidth size="small"
              value={form.horaFin} onChange={set('horaFin')}
              slotProps={{ inputLabel: { shrink: true } }}
              helperText="Mismo día" />
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

        <TextField select label="Estado" fullWidth size="small"
          value={form.estado} onChange={set('estado')}>
          {ESTADOS.map(e => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
        </TextField>

        {/* Días adicionales */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Días adicionales
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={agregarDia}
              sx={{ color: COLOR, textTransform: 'none', fontWeight: 600 }}>
              Agregar día
            </Button>
          </Box>

          {form.diasAdicionales.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              Esta actividad ocurre en un solo día. Agrega días si se extiende a más fechas.
            </Typography>
          )}

          {form.diasAdicionales.map((dia, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: 1 }}>
              <TextField label="Fecha" type="date" size="small" sx={{ flex: 2 }}
                value={dia.fecha}
                onChange={e => editarDia(idx, 'fecha', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="H. inicio" type="time" size="small" sx={{ flex: 1.2 }}
                value={dia.horaInicio}
                onChange={e => editarDia(idx, 'horaInicio', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="H. fin" type="time" size="small" sx={{ flex: 1.2 }}
                value={dia.horaFin}
                onChange={e => editarDia(idx, 'horaFin', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} />
              <Tooltip title="Quitar día">
                <IconButton size="small" color="error" onClick={() => quitarDia(idx)} sx={{ mt: 0.5 }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={saving}
          sx={{ bgcolor: COLOR }}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

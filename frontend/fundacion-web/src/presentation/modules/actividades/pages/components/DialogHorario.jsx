import { useState, useEffect } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, Grid, InputLabel, MenuItem,
  Select, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { actividadesRepository } from '../../../../../infrastructure/repositories/actividadesRepository';

const COLOR = '#4E1B95';

const DIAS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

const EMPTY = {
  programaId: '', diaSemana: 1,
  horaInicio: '08:00', horaFin: '10:00', lugar: '',
  activo: true,
};

export function DialogHorario({ open, editando, programas, onClose, onGuardado }) {
  const [form,   setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editando) {
      setForm({
        programaId:  editando.programaId,
        diaSemana:   editando.diaSemana,
        horaInicio:  editando.horaInicio,
        horaFin:     editando.horaFin,
        lugar:       editando.lugar ?? '',
        activo:      editando.activo,
      });
    } else {
      setForm({ ...EMPTY, programaId: programas[0]?.id ?? '' });
    }
  }, [open, editando, programas]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const guardar = async () => {
    if (!form.programaId || !form.horaInicio || !form.horaFin) {
      setError('Programa, hora inicio y hora fin son obligatorios.');
      return;
    }
    if (form.horaInicio >= form.horaFin) {
      setError('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const dto = {
        programaId:  form.programaId,
        diaSemana:   form.diaSemana,
        horaInicio:  form.horaInicio,
        horaFin:     form.horaFin,
        lugar:       form.lugar.trim() || null,
        ...(editando ? { activo: form.activo } : {}),
      };
      if (editando) {
        await actividadesRepository.actualizarHorario(editando.id, dto);
      } else {
        await actividadesRepository.crearHorario(dto);
      }
      onGuardado();
      onClose();
    } catch (e) {
      setError(e.response?.data?.error ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const diaLabel = DIAS.find(d => d.value === form.diaSemana)?.label ?? '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        {editando ? 'Editar horario' : 'Nuevo horario'}
      </DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2}>
          <Grid size={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Programa *</InputLabel>
              <Select label="Programa *" value={form.programaId} onChange={set('programaId')}>
                {programas.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Selector de día estilo Teams */}
          <Grid size={12}>
            <Typography variant="caption" fontWeight={700} color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 1 }}>
              Día de la semana
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
              {DIAS.map(d => (
                <Chip
                  key={d.value}
                  label={d.label}
                  onClick={() => setForm(p => ({ ...p, diaSemana: d.value }))}
                  sx={{
                    cursor: 'pointer',
                    fontWeight: 700,
                    bgcolor: form.diaSemana === d.value ? COLOR : 'transparent',
                    color:   form.diaSemana === d.value ? 'white' : 'text.secondary',
                    border:  `2px solid ${form.diaSemana === d.value ? COLOR : '#ddd'}`,
                    '&:hover': {
                      bgcolor: form.diaSemana === d.value ? COLOR : '#f3f0ff',
                      border:  `2px solid ${COLOR}`,
                    },
                  }}
                />
              ))}
            </Box>
          </Grid>

          {/* Rango horario */}
          <Grid size={6}>
            <TextField
              label="Hora inicio *" type="time" fullWidth size="small"
              value={form.horaInicio} onChange={set('horaInicio')}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label="Hora fin *" type="time" fullWidth size="small"
              value={form.horaFin} onChange={set('horaFin')}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>

          <Grid size={12}>
            <TextField label="Lugar (opcional)" fullWidth size="small"
              placeholder="Ej: Cancha 1, Salón 3…"
              value={form.lugar} onChange={set('lugar')} />
          </Grid>

          {editando && (
            <Grid size={12}>
              <Box display="flex" alignItems="center" gap={1}>
                <Switch checked={form.activo}
                  onChange={e => setForm(p => ({ ...p, activo: e.target.checked }))}
                  size="small" sx={{ '& .MuiSwitch-thumb': { bgcolor: form.activo ? COLOR : undefined } }} />
                <Typography variant="body2" color={form.activo ? 'text.primary' : 'text.secondary'}>
                  {form.activo ? 'Horario activo' : 'Horario pausado'}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>

        {/* Preview del horario */}
        {form.programaId && form.horaInicio && form.horaFin && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1,
              bgcolor: '#f3f0ff', borderRadius: 2, px: 2, py: 1.2 }}>
              <AccessTimeIcon sx={{ fontSize: 18, color: COLOR }} />
              <Typography variant="body2" fontWeight={700} color={COLOR}>
                {diaLabel} · {form.horaInicio} – {form.horaFin}
                {form.lugar ? ` · ${form.lugar}` : ''}
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={saving}
          sx={{ bgcolor: COLOR }}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

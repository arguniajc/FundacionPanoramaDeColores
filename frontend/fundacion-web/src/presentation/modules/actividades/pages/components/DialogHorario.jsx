import { useState, useEffect } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Grid, MenuItem, Switch, TextField, Typography,
} from '@mui/material';
import AccessTimeIcon   from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PlaceIcon        from '@mui/icons-material/Place';
import { actividadesRepository } from '@/infrastructure/repositories/actividadesRepository';
import { BRAND_COLOR } from '@/shared/constants/brand';

const COLOR = BRAND_COLOR;

const DIAS = [
  { value: 1, label: 'Lunes'    },
  { value: 2, label: 'Martes'   },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves'   },
  { value: 5, label: 'Viernes'  },
  { value: 6, label: 'Sábado'   },
  { value: 0, label: 'Domingo'  },
];

const DIAS_CORTO = { 0:'Dom', 1:'Lun', 2:'Mar', 3:'Mié', 4:'Jue', 5:'Vie', 6:'Sáb' };

const EMPTY = {
  programaId: '',
  diasSemana: [1, 3, 5],        // Lun, Mié, Vie por defecto
  horaInicio: '08:00',
  horaFin:    '10:00',
  lugar:      '',
  fechaInicioVigencia: '',
  fechaFinVigencia:    '',
  activo: true,
};

function toggleDia(dias, valor) {
  return dias.includes(valor)
    ? dias.filter(d => d !== valor)
    : [...dias, valor].sort((a, b) => {
        // orden: Lun(1)...Sáb(6), Dom(0) al final
        const ord = v => v === 0 ? 7 : v;
        return ord(a) - ord(b);
      });
}

export function DialogHorario({ open, editando, programas, onClose, onGuardado }) {
  const [form,   setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editando) {
      setForm({
        programaId:          editando.programaId,
        diasSemana:          [editando.diaSemana],  // edición: un día a la vez
        horaInicio:          editando.horaInicio,
        horaFin:             editando.horaFin,
        lugar:               editando.lugar ?? '',
        fechaInicioVigencia: editando.fechaInicioVigencia ?? '',
        fechaFinVigencia:    editando.fechaFinVigencia    ?? '',
        activo:              editando.activo,
      });
    } else {
      setForm({ ...EMPTY, programaId: programas[0]?.id ?? '' });
    }
  }, [open, editando, programas]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const guardar = async () => {
    if (!form.programaId) { setError('Selecciona un programa.'); return; }
    if (form.diasSemana.length === 0) { setError('Selecciona al menos un día.'); return; }
    if (!form.horaInicio || !form.horaFin) { setError('Los horarios son obligatorios.'); return; }
    if (form.horaInicio >= form.horaFin) { setError('La hora de inicio debe ser anterior a la hora de fin.'); return; }
    if (form.fechaInicioVigencia && form.fechaFinVigencia &&
        form.fechaInicioVigencia > form.fechaFinVigencia) {
      setError('La fecha de inicio debe ser anterior a la fecha de fin.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editando) {
        // Edición: actualiza el registro existente (1 día)
        await actividadesRepository.actualizarHorario(editando.id, {
          programaId:          form.programaId,
          diaSemana:           form.diasSemana[0],
          horaInicio:          form.horaInicio,
          horaFin:             form.horaFin,
          lugar:               form.lugar.trim() || null,
          activo:              form.activo,
          fechaInicioVigencia: form.fechaInicioVigencia || null,
          fechaFinVigencia:    form.fechaFinVigencia    || null,
        });
      } else {
        // Creación: un registro por cada día seleccionado
        for (const dia of form.diasSemana) {
          await actividadesRepository.crearHorario({
            programaId:          form.programaId,
            diaSemana:           dia,
            horaInicio:          form.horaInicio,
            horaFin:             form.horaFin,
            lugar:               form.lugar.trim() || null,
            fechaInicioVigencia: form.fechaInicioVigencia || null,
            fechaFinVigencia:    form.fechaFinVigencia    || null,
          });
        }
      }
      onGuardado();
      onClose();
    } catch (e) {
      setError(e.response?.data?.error ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const diasSelLabel = form.diasSemana.map(d => DIAS_CORTO[d]).join(', ');
  const progNombre   = programas.find(p => p.id === form.programaId)?.nombre ?? '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1, color: COLOR }}>
        {editando ? 'Editar sesión del horario' : 'Configurar horario de programa'}
      </DialogTitle>

      <DialogContent sx={{ pt: '8px !important' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2.5}>

          {/* Programa */}
          <Grid size={12}>
            <TextField select fullWidth size="small" label="Programa *"
              value={form.programaId}
              onChange={e => setForm(p => ({ ...p, programaId: e.target.value }))}>
              {programas.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Días de la semana — multi-select */}
          <Grid size={12}>
            <Typography variant="caption" fontWeight={800} color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 1 }}>
              Días de la semana *
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {DIAS.map(d => {
                const sel = form.diasSemana.includes(d.value);
                return (
                  <Chip
                    key={d.value}
                    label={d.label}
                    onClick={() => {
                      if (editando) return; // en edición solo 1 día
                      setForm(p => ({ ...p, diasSemana: toggleDia(p.diasSemana, d.value) }));
                    }}
                    sx={{
                      cursor: editando ? 'default' : 'pointer',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      bgcolor: sel ? COLOR : 'transparent',
                      color:   sel ? 'white' : 'text.secondary',
                      border:  `2px solid ${sel ? COLOR : '#ddd'}`,
                      transition: 'all 0.15s',
                      '&:hover': editando ? {} : {
                        bgcolor: sel ? COLOR : '#f3f0ff',
                        border:  `2px solid ${COLOR}`,
                        color:   sel ? 'white' : COLOR,
                      },
                    }}
                  />
                );
              })}
            </Box>
            {!editando && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Puedes seleccionar varios días. Se creará un horario por cada día.
              </Typography>
            )}
          </Grid>

          {/* Rango horario */}
          <Grid size={6}>
            <TextField label="Hora inicio *" type="time" fullWidth size="small"
              value={form.horaInicio} onChange={set('horaInicio')}
              slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={6}>
            <TextField label="Hora fin *" type="time" fullWidth size="small"
              value={form.horaFin} onChange={set('horaFin')}
              slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>

          {/* Lugar */}
          <Grid size={12}>
            <TextField label="Lugar (opcional)" fullWidth size="small"
              placeholder="Ej: Cancha 1, Salón 3, Piscina…"
              value={form.lugar} onChange={set('lugar')} />
          </Grid>

          <Grid size={12}>
            <Divider>
              <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                Período de vigencia (opcional)
              </Typography>
            </Divider>
          </Grid>

          {/* Fechas de vigencia */}
          <Grid size={6}>
            <TextField label="Fecha inicio" type="date" fullWidth size="small"
              value={form.fechaInicioVigencia} onChange={set('fechaInicioVigencia')}
              slotProps={{ inputLabel: { shrink: true } }}
              helperText="¿Cuándo empieza?" />
          </Grid>
          <Grid size={6}>
            <TextField label="Fecha fin" type="date" fullWidth size="small"
              value={form.fechaFinVigencia} onChange={set('fechaFinVigencia')}
              slotProps={{ inputLabel: { shrink: true } }}
              helperText="¿Cuándo termina?" />
          </Grid>

          {/* Activo (solo en edición) */}
          {editando && (
            <Grid size={12}>
              <Box display="flex" alignItems="center" gap={1}>
                <Switch checked={form.activo}
                  onChange={e => setForm(p => ({ ...p, activo: e.target.checked }))}
                  size="small"
                  sx={{ '& .MuiSwitch-thumb': { bgcolor: form.activo ? COLOR : undefined } }} />
                <Typography variant="body2" color={form.activo ? 'text.primary' : 'text.secondary'}>
                  {form.activo ? 'Horario activo' : 'Horario pausado'}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>

        {/* ── Preview del horario ── */}
        {form.programaId && form.diasSemana.length > 0 && form.horaInicio && form.horaFin && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ bgcolor: '#f3f0ff', borderRadius: 2, p: 1.8, display: 'flex', flexDirection: 'column', gap: 0.7 }}>
              <Typography variant="caption" fontWeight={800} color={COLOR}
                sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Vista previa
              </Typography>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {form.diasSemana.map(d => (
                    <Chip key={d} label={DIAS_CORTO[d]} size="small"
                      sx={{ bgcolor: COLOR, color: 'white', fontWeight: 800, fontSize: '0.7rem' }} />
                  ))}
                </Box>
                <Box display="flex" alignItems="center" gap={0.4}>
                  <AccessTimeIcon sx={{ fontSize: 15, color: COLOR }} />
                  <Typography variant="body2" fontWeight={700} color={COLOR}>
                    {form.horaInicio} – {form.horaFin}
                  </Typography>
                </Box>
                {form.lugar && (
                  <Box display="flex" alignItems="center" gap={0.4}>
                    <PlaceIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">{form.lugar}</Typography>
                  </Box>
                )}
              </Box>
              {(form.fechaInicioVigencia || form.fechaFinVigencia) && (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <CalendarTodayIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {form.fechaInicioVigencia
                      ? new Date(form.fechaInicioVigencia + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Sin fecha inicio'}
                    {' → '}
                    {form.fechaFinVigencia
                      ? new Date(form.fechaFinVigencia + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Sin fecha fin'}
                  </Typography>
                </Box>
              )}
              {!editando && form.diasSemana.length > 1 && (
                <Typography variant="caption" color="text.secondary">
                  Se crearán <strong>{form.diasSemana.length} registros</strong> (uno por día).
                </Typography>
              )}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={guardar}
          disabled={saving || form.diasSemana.length === 0}
          sx={{ bgcolor: COLOR }}>
          {saving
            ? 'Guardando…'
            : editando
              ? 'Guardar cambios'
              : `Crear ${form.diasSemana.length > 1 ? `${form.diasSemana.length} sesiones` : 'sesión'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

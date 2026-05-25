import { useState, useEffect } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Grid, IconButton, MenuItem, Paper,
  TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import AccessTimeIcon    from '@mui/icons-material/AccessTime';
import AddIcon           from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DeleteIcon        from '@mui/icons-material/Delete';
import EventIcon         from '@mui/icons-material/Event';
import PlaceIcon         from '@mui/icons-material/Place';
import RepeatIcon        from '@mui/icons-material/Repeat';
import { actividadesRepository } from '../../../../../infrastructure/repositories/actividadesRepository';

const COLOR = '#4E1B95';

const DIAS = [
  { value: 1, label: 'Lunes'     },
  { value: 2, label: 'Martes'    },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves'    },
  { value: 5, label: 'Viernes'   },
  { value: 6, label: 'Sábado'    },
  { value: 0, label: 'Domingo'   },
];
const DIAS_CORTO = { 0:'Dom', 1:'Lun', 2:'Mar', 3:'Mié', 4:'Jue', 5:'Vie', 6:'Sáb' };

function toggleDia(dias, v) {
  const ord = x => x === 0 ? 7 : x;
  return dias.includes(v)
    ? dias.filter(d => d !== v)
    : [...dias, v].sort((a, b) => ord(a) - ord(b));
}

const EMPTY_UNICO = {
  titulo: '', programaId: '', lugar: '', descripcion: '',
  fecha: '', horaInicio: '', horaFin: '',
  diasAdicionales: [],
};
const EMPTY_RECURRENTE = {
  programaId: '', diasSemana: [1, 3, 5],
  horaInicio: '08:00', horaFin: '10:00', lugar: '',
  fechaInicioVigencia: '', fechaFinVigencia: '',
};

export function DialogNuevaActividad({ open, programas, fechaInicialSugerida, onClose, onGuardado }) {
  const [tipo,   setTipo]   = useState('unico');
  const [unico,  setUnico]  = useState(EMPTY_UNICO);
  const [recur,  setRecur]  = useState(EMPTY_RECURRENTE);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setTipo('unico');
    setUnico({
      ...EMPTY_UNICO,
      programaId:  programas[0]?.id ?? '',
      fecha:       fechaInicialSugerida ? fechaInicialSugerida.slice(0, 10) : new Date().toISOString().slice(0, 10),
      horaInicio:  fechaInicialSugerida?.length > 10 ? fechaInicialSugerida.slice(11, 16) : '08:00',
    });
    setRecur({ ...EMPTY_RECURRENTE, programaId: programas[0]?.id ?? '' });
  }, [open, programas, fechaInicialSugerida]);

  const setU = k => e => setUnico(p => ({ ...p, [k]: e.target.value }));
  const setR = k => e => setRecur(p => ({ ...p, [k]: e.target.value }));

  const guardar = async () => {
    setError('');
    setSaving(true);
    try {
      if (tipo === 'unico') {
        if (!unico.titulo.trim()) { setError('El título es obligatorio.'); return; }
        if (!unico.fecha)          { setError('La fecha es obligatoria.'); return; }
        if (!unico.horaInicio)     { setError('La hora de inicio es obligatoria.'); return; }
        if (unico.horaFin && unico.horaFin <= unico.horaInicio) {
          setError('La hora de fin debe ser posterior a la de inicio.'); return;
        }
        for (const dia of unico.diasAdicionales) {
          if (!dia.fecha || !dia.horaInicio || !dia.horaFin) {
            setError('Completa todos los campos de los días adicionales.'); return;
          }
          if (dia.horaFin <= dia.horaInicio) {
            setError('En días adicionales, la hora de fin debe ser posterior a la de inicio.'); return;
          }
        }
        await actividadesRepository.crear({
          titulo:          unico.titulo.trim(),
          descripcion:     unico.descripcion.trim() || null,
          programaId:      unico.programaId || null,
          fechaInicio:     `${unico.fecha}T${unico.horaInicio}:00`,
          fechaFin:        unico.horaFin ? `${unico.fecha}T${unico.horaFin}:00` : null,
          lugar:           unico.lugar.trim() || null,
          diasAdicionales: unico.diasAdicionales.map(d => ({
            fecha:      d.fecha,
            horaInicio: d.horaInicio,
            horaFin:    d.horaFin,
          })),
        });
      } else {
        if (!recur.programaId)         { setError('Selecciona un programa.'); return; }
        if (recur.diasSemana.length === 0) { setError('Selecciona al menos un día.'); return; }
        if (!recur.horaInicio || !recur.horaFin) { setError('El rango horario es obligatorio.'); return; }
        if (recur.horaInicio >= recur.horaFin)   { setError('La hora de inicio debe ser anterior a la de fin.'); return; }
        if (recur.fechaInicioVigencia && recur.fechaFinVigencia &&
            recur.fechaInicioVigencia > recur.fechaFinVigencia) {
          setError('La fecha de inicio debe ser anterior a la fecha de fin.');
          return;
        }
        for (const dia of recur.diasSemana) {
          await actividadesRepository.crearHorario({
            programaId:          recur.programaId,
            diaSemana:           dia,
            horaInicio:          recur.horaInicio,
            horaFin:             recur.horaFin,
            lugar:               recur.lugar.trim() || null,
            fechaInicioVigencia: recur.fechaInicioVigencia || null,
            fechaFinVigencia:    recur.fechaFinVigencia    || null,
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

  const diasLabel = recur.diasSemana.map(d => DIAS_CORTO[d]).join(', ');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1, color: COLOR }}>
        Nueva actividad
      </DialogTitle>

      <DialogContent sx={{ pt: '8px !important' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* ── Toggle tipo ── */}
        <ToggleButtonGroup
          value={tipo} exclusive
          onChange={(_, v) => { if (v) setTipo(v); }}
          fullWidth size="small"
          sx={{ mb: 3 }}>
          <ToggleButton value="unico"
            sx={{ fontWeight: 700, gap: 0.8, textTransform: 'none',
              '&.Mui-selected': { bgcolor: COLOR, color: 'white',
                '&:hover': { bgcolor: COLOR, opacity: 0.9 } } }}>
            <EventIcon fontSize="small" />
            Evento único
          </ToggleButton>
          <ToggleButton value="recurrente"
            sx={{ fontWeight: 700, gap: 0.8, textTransform: 'none',
              '&.Mui-selected': { bgcolor: COLOR, color: 'white',
                '&:hover': { bgcolor: COLOR, opacity: 0.9 } } }}>
            <RepeatIcon fontSize="small" />
            Sesiones recurrentes
          </ToggleButton>
        </ToggleButtonGroup>

        {/* ── EVENTO ÚNICO ── */}
        {tipo === 'unico' && (
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField fullWidth size="small" label="Título *"
                value={unico.titulo} onChange={setU('titulo')} />
            </Grid>
            <Grid size={12}>
              <TextField select fullWidth size="small" label="Programa (opcional)"
                value={unico.programaId} onChange={setU('programaId')}>
                <MenuItem value="">— Sin programa —</MenuItem>
                {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={4}>
              <TextField label="Fecha *" type="date" fullWidth size="small"
                value={unico.fecha} onChange={setU('fecha')}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={4}>
              <TextField label="Hora inicio *" type="time" fullWidth size="small"
                value={unico.horaInicio} onChange={setU('horaInicio')}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={4}>
              <TextField label="Hora fin" type="time" fullWidth size="small"
                value={unico.horaFin} onChange={setU('horaFin')}
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="Mismo día" />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth size="small" label="Lugar"
                placeholder="Ej: Cancha 1, Salón…"
                value={unico.lugar} onChange={setU('lugar')} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth size="small" label="Descripción" multiline rows={2}
                value={unico.descripcion} onChange={setU('descripcion')} />
            </Grid>

            {/* Días adicionales */}
            <Grid size={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary"
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Días adicionales
                </Typography>
                <Button size="small" startIcon={<AddIcon />}
                  onClick={() => setUnico(p => ({ ...p, diasAdicionales: [...p.diasAdicionales, { fecha: '', horaInicio: '', horaFin: '' }] }))}
                  sx={{ color: COLOR, textTransform: 'none', fontWeight: 600 }}>
                  Agregar día
                </Button>
              </Box>
              {unico.diasAdicionales.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  Esta actividad ocurre en un solo día. Agrega días si se extiende a más fechas.
                </Typography>
              )}
              {unico.diasAdicionales.map((dia, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: 1 }}>
                  <TextField label="Fecha" type="date" size="small" sx={{ flex: 2 }}
                    value={dia.fecha}
                    onChange={e => setUnico(p => ({ ...p, diasAdicionales: p.diasAdicionales.map((d, i) => i === idx ? { ...d, fecha: e.target.value } : d) }))}
                    slotProps={{ inputLabel: { shrink: true } }} />
                  <TextField label="H. inicio" type="time" size="small" sx={{ flex: 1.2 }}
                    value={dia.horaInicio}
                    onChange={e => setUnico(p => ({ ...p, diasAdicionales: p.diasAdicionales.map((d, i) => i === idx ? { ...d, horaInicio: e.target.value } : d) }))}
                    slotProps={{ inputLabel: { shrink: true } }} />
                  <TextField label="H. fin" type="time" size="small" sx={{ flex: 1.2 }}
                    value={dia.horaFin}
                    onChange={e => setUnico(p => ({ ...p, diasAdicionales: p.diasAdicionales.map((d, i) => i === idx ? { ...d, horaFin: e.target.value } : d) }))}
                    slotProps={{ inputLabel: { shrink: true } }} />
                  <Tooltip title="Quitar día">
                    <IconButton size="small" color="error"
                      onClick={() => setUnico(p => ({ ...p, diasAdicionales: p.diasAdicionales.filter((_, i) => i !== idx) }))}
                      sx={{ mt: 0.5 }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Grid>
          </Grid>
        )}

        {/* ── SESIONES RECURRENTES ── */}
        {tipo === 'recurrente' && (
          <Grid container spacing={2.5}>
            <Grid size={12}>
              <TextField select fullWidth size="small" label="Programa *"
                value={recur.programaId} onChange={setR('programaId')}>
                {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
              </TextField>
            </Grid>

            <Grid size={12}>
              <Typography variant="caption" fontWeight={800} color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 1 }}>
                Días de la semana *
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                {DIAS.map(d => {
                  const sel = recur.diasSemana.includes(d.value);
                  return (
                    <Chip key={d.value} label={d.label}
                      onClick={() => setRecur(p => ({ ...p, diasSemana: toggleDia(p.diasSemana, d.value) }))}
                      sx={{
                        cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                        bgcolor: sel ? COLOR : 'transparent',
                        color:   sel ? 'white' : 'text.secondary',
                        border:  `2px solid ${sel ? COLOR : '#ddd'}`,
                        transition: 'all 0.15s',
                        '&:hover': { bgcolor: sel ? COLOR : '#f3f0ff', border: `2px solid ${COLOR}`, color: sel ? 'white' : COLOR },
                      }}
                    />
                  );
                })}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Selecciona uno o varios días. Se crea un horario por cada día seleccionado.
              </Typography>
            </Grid>

            <Grid size={6}>
              <TextField label="Hora inicio *" type="time" fullWidth size="small"
                value={recur.horaInicio} onChange={setR('horaInicio')}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={6}>
              <TextField label="Hora fin *" type="time" fullWidth size="small"
                value={recur.horaFin} onChange={setR('horaFin')}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>

            <Grid size={12}>
              <TextField fullWidth size="small" label="Lugar (opcional)"
                placeholder="Ej: Cancha 1, Salón 3…"
                value={recur.lugar} onChange={setR('lugar')} />
            </Grid>

            <Grid size={12}>
              <Divider>
                <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                  Período de vigencia (opcional)
                </Typography>
              </Divider>
            </Grid>

            <Grid size={6}>
              <TextField label="Fecha inicio" type="date" fullWidth size="small"
                value={recur.fechaInicioVigencia} onChange={setR('fechaInicioVigencia')}
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="¿Cuándo empieza?" />
            </Grid>
            <Grid size={6}>
              <TextField label="Fecha fin" type="date" fullWidth size="small"
                value={recur.fechaFinVigencia} onChange={setR('fechaFinVigencia')}
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="¿Cuándo termina?" />
            </Grid>

            {/* Preview */}
            {recur.programaId && recur.diasSemana.length > 0 && recur.horaInicio && recur.horaFin && (
              <Grid size={12}>
                <Paper elevation={0} sx={{ bgcolor: '#f3f0ff', borderRadius: 2, p: 1.8 }}>
                  <Typography variant="caption" fontWeight={800} color={COLOR}
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 0.8 }}>
                    Vista previa
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.8} flexWrap="wrap">
                    <Box display="flex" gap={0.4}>
                      {recur.diasSemana.map(d => (
                        <Chip key={d} label={DIAS_CORTO[d]} size="small"
                          sx={{ bgcolor: COLOR, color: 'white', fontWeight: 800, fontSize: '0.7rem' }} />
                      ))}
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.4}>
                      <AccessTimeIcon sx={{ fontSize: 14, color: COLOR }} />
                      <Typography variant="body2" fontWeight={700} color={COLOR}>
                        {recur.horaInicio} – {recur.horaFin}
                      </Typography>
                    </Box>
                    {recur.lugar && (
                      <Box display="flex" alignItems="center" gap={0.4}>
                        <PlaceIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">{recur.lugar}</Typography>
                      </Box>
                    )}
                  </Box>
                  {(recur.fechaInicioVigencia || recur.fechaFinVigencia) && (
                    <Box display="flex" alignItems="center" gap={0.4} mt={0.5}>
                      <CalendarTodayIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {recur.fechaInicioVigencia
                          ? new Date(recur.fechaInicioVigencia + 'T00:00:00').toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })
                          : '—'}
                        {' → '}
                        {recur.fechaFinVigencia
                          ? new Date(recur.fechaFinVigencia + 'T00:00:00').toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })
                          : 'sin fecha fin'}
                      </Typography>
                    </Box>
                  )}
                  {recur.diasSemana.length > 1 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, display: 'block' }}>
                      Se crearán <strong>{recur.diasSemana.length} horarios</strong> (uno por día).
                    </Typography>
                  )}
                </Paper>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={saving}
          sx={{ bgcolor: COLOR }}>
          {saving ? 'Guardando…'
            : tipo === 'unico' ? 'Crear evento'
            : recur.diasSemana.length > 1 ? `Crear ${recur.diasSemana.length} horarios`
            : 'Crear horario'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

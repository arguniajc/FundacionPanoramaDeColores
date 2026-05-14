import { useState, useEffect, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin   from '@fullcalendar/daygrid';
import timeGridPlugin  from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin      from '@fullcalendar/list';
import esLocale        from '@fullcalendar/core/locales/es';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Chip, IconButton, Tooltip, Alert,
  Grid, Checkbox, FormControlLabel, Divider, Stack,
} from '@mui/material';
import AddIcon        from '@mui/icons-material/Add';
import EditIcon       from '@mui/icons-material/Edit';
import DeleteIcon     from '@mui/icons-material/Delete';
import PeopleIcon     from '@mui/icons-material/People';
import CloseIcon      from '@mui/icons-material/Close';
import { actividadesRepository } from '../../../../infrastructure/repositories/actividadesRepository';
import usePermisos from '../../../../shared/hooks/usePermisos';
import apiClient   from '../../../../infrastructure/http/apiClient';

const ESTADOS = [
  { value: 'programada',  label: 'Programada',  color: 'info'    },
  { value: 'en_curso',    label: 'En curso',     color: 'warning' },
  { value: 'realizada',   label: 'Realizada',    color: 'success' },
  { value: 'cancelada',   label: 'Cancelada',    color: 'error'   },
];

const COLORES_CALENDARIO = [
  '#4E1B95','#1976d2','#388e3c','#f57c00','#c62828','#00838f','#6a1b9a',
];

const EMPTY_FORM = {
  titulo: '', descripcion: '', programaId: '', lugar: '',
  fechaInicio: '', fechaFin: '', estado: 'programada',
};

export default function ActividadesPage() {
  const { puedo } = usePermisos();
  const calendarRef = useRef(null);

  const [actividades, setActividades]   = useState([]);
  const [programas,   setProgramas]     = useState([]);
  const [open,        setOpen]          = useState(false);
  const [editando,    setEditando]      = useState(null);
  const [form,        setForm]          = useState(EMPTY_FORM);
  const [saving,      setSaving]        = useState(false);
  const [error,       setError]         = useState('');

  // Panel de asistencia
  const [asistenciaOpen, setAsistenciaOpen] = useState(false);
  const [actividadSel,   setActividadSel]   = useState(null);
  const [asistentes,     setAsistentes]     = useState([]);
  const [savingAsist,    setSavingAsist]    = useState(false);

  // ── Cargar programas para el selector ──────────────────────────────────────
  useEffect(() => {
    apiClient.get('/api/sedes')
      .then(({ data }) => {
        const lista = data.flatMap(s => (s.programas ?? []).map(p => ({
          id: p.id, nombre: `${p.nombreSede} — ${p.nombre}`,
        })));
        setProgramas(lista);
      })
      .catch(() => {});
  }, []);

  // ── Cargar actividades del mes visible ─────────────────────────────────────
  const cargar = useCallback(async (info) => {
    try {
      const fecha = info?.start ?? new Date();
      const { data } = await actividadesRepository.listar({
        mes:  fecha.getMonth() + 1,
        anio: fecha.getFullYear(),
      });
      setActividades(data);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Eventos para FullCalendar ──────────────────────────────────────────────
  const eventos = actividades.map((a, i) => ({
    id:    a.id,
    title: a.titulo,
    start: a.fechaInicio,
    end:   a.fechaFin ?? undefined,
    backgroundColor: COLORES_CALENDARIO[i % COLORES_CALENDARIO.length],
    borderColor:     COLORES_CALENDARIO[i % COLORES_CALENDARIO.length],
    extendedProps: a,
  }));

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const abrirCrear = (dateInfo) => {
    setEditando(null);
    const fi = dateInfo?.dateStr
      ? `${dateInfo.dateStr}T08:00`
      : new Date().toISOString().slice(0, 16);
    setForm({ ...EMPTY_FORM, fechaInicio: fi });
    setError('');
    setOpen(true);
  };

  const abrirEditar = (a) => {
    setEditando(a);
    setForm({
      titulo:      a.titulo,
      descripcion: a.descripcion ?? '',
      programaId:  a.programaId ?? '',
      lugar:       a.lugar ?? '',
      fechaInicio: a.fechaInicio?.slice(0, 16) ?? '',
      fechaFin:    a.fechaFin?.slice(0, 16) ?? '',
      estado:      a.estado,
    });
    setError('');
    setOpen(true);
  };

  const guardar = async () => {
    if (!form.titulo.trim() || !form.fechaInicio) {
      setError('Título y fecha de inicio son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
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
      setOpen(false);
      cargar();
    } catch (e) {
      setError(e.response?.data?.error ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta actividad?')) return;
    try {
      await actividadesRepository.eliminar(id);
      cargar();
    } catch { /* silencioso */ }
  };

  // ── Asistencia ─────────────────────────────────────────────────────────────
  const abrirAsistencia = async (actividad) => {
    setActividadSel(actividad);
    setAsistenciaOpen(true);
    try {
      const { data } = await actividadesRepository.asistencia(actividad.id);
      setAsistentes(data);
    } catch { setAsistentes([]); }
  };

  const toggleAsistencia = (beneficiarioId) => {
    setAsistentes(prev => prev.map(a =>
      a.beneficiarioId === beneficiarioId ? { ...a, asistio: !a.asistio } : a
    ));
  };

  const guardarAsistencia = async () => {
    setSavingAsist(true);
    try {
      await actividadesRepository.registrarAsistencia(actividadSel.id, {
        asistencias: asistentes.map(a => ({
          beneficiarioId: a.beneficiarioId,
          asistio: a.asistio,
        })),
      });
      setAsistenciaOpen(false);
      cargar();
    } catch { /* silencioso */ } finally {
      setSavingAsist(false);
    }
  };

  // ── Click en evento del calendario ─────────────────────────────────────────
  const handleEventClick = ({ event }) => {
    const a = event.extendedProps;
    if (puedo('actividades', 'editar')) abrirEditar({ ...a, id: event.id });
  };

  const estadoChip = (estado) => {
    const e = ESTADOS.find(x => x.value === estado);
    return <Chip label={e?.label ?? estado} color={e?.color ?? 'default'} size="small" />;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Actividades</Typography>
          <Typography variant="body2" color="text.secondary">
            Calendario de actividades y registro de asistencia
          </Typography>
        </Box>
        {puedo('actividades', 'crear') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => abrirCrear()}>
            Nueva actividad
          </Button>
        )}
      </Box>

      {/* Calendario */}
      <Box sx={{
        '& .fc': { fontFamily: 'inherit' },
        '& .fc-toolbar-title': { fontSize: '1.1rem', fontWeight: 700 },
        '& .fc-event': { cursor: 'pointer', borderRadius: '4px', px: '4px' },
      }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          headerToolbar={{
            left:   'prev,next today',
            center: 'title',
            right:  'dayGridMonth,timeGridWeek,listMonth',
          }}
          buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', list: 'Lista' }}
          events={eventos}
          dateClick={puedo('actividades', 'crear') ? abrirCrear : undefined}
          eventClick={handleEventClick}
          datesSet={cargar}
          height="auto"
          eventContent={({ event }) => (
            <Box sx={{ px: '2px', py: '1px', overflow: 'hidden' }}>
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, lineHeight: 1.2 }}>
                {event.title}
              </Typography>
              {event.extendedProps.lugar && (
                <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.65rem' }}>
                  {event.extendedProps.lugar}
                </Typography>
              )}
            </Box>
          )}
        />
      </Box>

      {/* Lista rápida de actividades del mes con acciones */}
      {actividades.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            Actividades del mes ({actividades.length})
          </Typography>
          <Stack spacing={1}>
            {actividades.map(a => (
              <Box key={a.id} sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                bgcolor: 'background.paper',
              }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{a.titulo}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(a.fechaInicio).toLocaleString('es-CO', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                    {a.programaNombre && ` · ${a.programaNombre}`}
                    {a.lugar && ` · ${a.lugar}`}
                  </Typography>
                </Box>
                {estadoChip(a.estado)}
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>
                  {a.totalInscritos} personas
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {puedo('actividades', 'editar') && (
                    <Tooltip title="Registrar asistencia">
                      <IconButton size="small" color="primary" onClick={() => abrirAsistencia(a)}>
                        <PeopleIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {puedo('actividades', 'editar') && (
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => abrirEditar(a)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {puedo('actividades', 'eliminar') && (
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => eliminar(a.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* ── Diálogo crear / editar ──────────────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editando ? 'Editar actividad' : 'Nueva actividad'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Título *" fullWidth size="small"
            value={form.titulo}
            onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
          />
          <Grid container spacing={2}>
            <Grid size={6}>
              <TextField
                label="Fecha inicio *" type="datetime-local" fullWidth size="small"
                value={form.fechaInicio}
                onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Fecha fin" type="datetime-local" fullWidth size="small"
                value={form.fechaFin}
                onChange={e => setForm(p => ({ ...p, fechaFin: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>
          <TextField
            select label="Programa (opcional)" fullWidth size="small"
            value={form.programaId}
            onChange={e => setForm(p => ({ ...p, programaId: e.target.value }))}
          >
            <MenuItem value="">— Sin programa —</MenuItem>
            {programas.map(p => (
              <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Lugar" fullWidth size="small"
            value={form.lugar}
            onChange={e => setForm(p => ({ ...p, lugar: e.target.value }))}
          />
          <TextField
            label="Descripción" fullWidth size="small" multiline rows={2}
            value={form.descripcion}
            onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
          />
          {editando && (
            <TextField
              select label="Estado" fullWidth size="small"
              value={form.estado}
              onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
            >
              {ESTADOS.map(e => (
                <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>
              ))}
            </TextField>
          )}
          {error && <Alert severity="error" sx={{ mt: 0 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardar} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo asistencia ──────────────────────────────────────────────── */}
      <Dialog open={asistenciaOpen} onClose={() => setAsistenciaOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>Asistencia</Typography>
            <Typography variant="caption" color="text.secondary">{actividadSel?.titulo}</Typography>
          </Box>
          <IconButton size="small" onClick={() => setAsistenciaOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ py: 1 }}>
          {asistentes.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No hay beneficiarios inscritos en este programa
            </Typography>
          ) : (
            <Stack spacing={0.5}>
              {asistentes.map(a => (
                <FormControlLabel
                  key={a.beneficiarioId}
                  control={
                    <Checkbox
                      checked={a.asistio}
                      onChange={() => toggleAsistencia(a.beneficiarioId)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2">{a.nombreCompleto}</Typography>
                  }
                  sx={{ ml: 0 }}
                />
              ))}
            </Stack>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            {asistentes.filter(a => a.asistio).length} / {asistentes.length} presentes
          </Typography>
          <Button onClick={() => setAsistenciaOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarAsistencia} disabled={savingAsist}>
            {savingAsist ? 'Guardando…' : 'Guardar asistencia'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

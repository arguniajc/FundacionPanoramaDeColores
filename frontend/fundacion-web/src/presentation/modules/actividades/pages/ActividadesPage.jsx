import { useState, useEffect, useCallback, useRef } from 'react';
import { useConfirm } from '../../../../shared/components/ConfirmDialog';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin     from '@fullcalendar/daygrid';
import timeGridPlugin    from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin        from '@fullcalendar/list';
import esLocale          from '@fullcalendar/core/locales/es';
import {
  Box, Button, Chip, IconButton, Stack, Tab, Tabs, Tooltip, Typography,
} from '@mui/material';
import AddIcon        from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DeleteIcon     from '@mui/icons-material/Delete';
import EditIcon       from '@mui/icons-material/Edit';
import PeopleIcon     from '@mui/icons-material/People';
import ScheduleIcon   from '@mui/icons-material/Schedule';
import { actividadesRepository } from '../../../../infrastructure/repositories/actividadesRepository';
import usePermisos   from '../../../../shared/hooks/usePermisos';
import apiClient     from '../../../../infrastructure/http/apiClient';
import { DialogActividad }  from './components/DialogActividad';
import { DialogAsistencia } from './components/DialogAsistencia';
import { TabHorarios }      from './components/TabHorarios';

const COLOR = '#4E1B95';

const ESTADOS = [
  { value: 'programada',  label: 'Programada',  color: 'info'    },
  { value: 'en_curso',    label: 'En curso',     color: 'warning' },
  { value: 'realizada',   label: 'Realizada',    color: 'success' },
  { value: 'cancelada',   label: 'Cancelada',    color: 'error'   },
];

const COLORES_PROGRAMA = [
  '#4E1B95','#1976d2','#388e3c','#f57c00','#c62828','#00838f','#6a1b9a',
];

// Expande los horarios recurrentes en eventos del calendario para un rango dado
function expandirHorarios(horarios, start, end) {
  const eventos = [];
  for (const h of horarios) {
    if (!h.activo) continue;
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    while (cur <= end) {
      // JS getDay(): 0=Dom,1=Lun,...,6=Sáb — coincide con nuestro dia_semana
      if (cur.getDay() === h.diaSemana) {
        const fecha = cur.toISOString().slice(0, 10);
        eventos.push({
          id:             `horario-${h.id}-${fecha}`,
          title:          h.programaNombre,
          start:          `${fecha}T${h.horaInicio}`,
          end:            `${fecha}T${h.horaFin}`,
          backgroundColor: '#e8def8',
          borderColor:     COLOR,
          textColor:       COLOR,
          extendedProps:  { tipo: 'horario', horario: h },
        });
      }
      cur.setDate(cur.getDate() + 1);
    }
  }
  return eventos;
}

export default function ActividadesPage() {
  const { puedo } = usePermisos();
  const confirm   = useConfirm();
  const calendarRef = useRef(null);

  const [tab,                setTab]                = useState(0);
  const [actividades,        setActividades]        = useState([]);
  const [horarios,           setHorarios]           = useState([]);
  const [programas,          setProgramas]          = useState([]);
  const [dialogOpen,         setDialogOpen]         = useState(false);
  const [editando,           setEditando]           = useState(null);
  const [fechaInicialSug,    setFechaInicialSug]    = useState('');
  const [asistenciaOpen,     setAsistenciaOpen]     = useState(false);
  const [actividadSel,       setActividadSel]       = useState(null);
  const [rangoCalendario,    setRangoCalendario]    = useState(null);

  useEffect(() => {
    apiClient.get('/api/sedes')
      .then(({ data }) => {
        const lista = data.flatMap(s => (s.programas ?? []).map(p => ({
          id: p.id, nombre: `${s.nombre} — ${p.nombre}`,
        })));
        setProgramas(lista);
      })
      .catch(() => {});
  }, []);

  // Cargar horarios una vez
  const cargarHorarios = useCallback(async () => {
    try {
      const { data } = await actividadesRepository.listarHorarios();
      setHorarios(data);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { cargarHorarios(); }, [cargarHorarios]);

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

  // Eventos del calendario: actividades únicas + horarios recurrentes expandidos
  const eventosUnicos = actividades.map((a, i) => ({
    id:    `act-${a.id}`,
    title: a.titulo,
    start: a.fechaInicio,
    end:   a.fechaFin ?? undefined,
    backgroundColor: COLORES_PROGRAMA[i % COLORES_PROGRAMA.length],
    borderColor:     COLORES_PROGRAMA[i % COLORES_PROGRAMA.length],
    extendedProps:   { tipo: 'actividad', ...a },
  }));

  const eventosRecurrentes = rangoCalendario
    ? expandirHorarios(horarios, rangoCalendario.start, rangoCalendario.end)
    : [];

  const eventos = [...eventosUnicos, ...eventosRecurrentes];

  const abrirCrear = (dateInfo) => {
    setEditando(null);
    setFechaInicialSug(dateInfo?.dateStr ? `${dateInfo.dateStr}T08:00` : new Date().toISOString().slice(0, 16));
    setDialogOpen(true);
  };

  const abrirEditar = (a) => {
    setEditando(a);
    setFechaInicialSug('');
    setDialogOpen(true);
  };

  const eliminar = async (id) => {
    if (!await confirm('¿Eliminar esta actividad?')) return;
    try {
      await actividadesRepository.eliminar(id);
      cargar();
    } catch { /* silencioso */ }
  };

  const estadoChip = (estado) => {
    const e = ESTADOS.find(x => x.value === estado);
    return <Chip label={e?.label ?? estado} color={e?.color ?? 'default'} size="small" />;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
        <Box>
          <Typography sx={{
            fontSize: '0.68rem', color: 'text.secondary',
            textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.5,
          }}>
            Módulo
          </Typography>
          <Typography variant="h5" fontWeight={800} color={COLOR}>Actividades</Typography>
        </Box>
        {tab === 0 && puedo('actividades', 'crear') && (
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => abrirCrear()}
            sx={{ bgcolor: COLOR, flexShrink: 0 }}>
            Nueva actividad
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.88rem' },
            '& .Mui-selected': { color: COLOR },
            '& .MuiTabs-indicator': { backgroundColor: COLOR },
          }}>
          <Tab label="Calendario" icon={<CalendarMonthIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Horarios de programas" icon={<ScheduleIcon fontSize="small" />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* ── Tab 0: Calendario ── */}
      {tab === 0 && (
        <>
          {/* Leyenda */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
            <Box display="flex" alignItems="center" gap={0.7}>
              <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: COLOR }} />
              <Typography variant="caption" color="text.secondary">Actividad única</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.7}>
              <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: '#e8def8', border: `2px solid ${COLOR}` }} />
              <Typography variant="caption" color="text.secondary">Sesión recurrente</Typography>
            </Box>
          </Box>

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
              headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listMonth' }}
              buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', list: 'Lista' }}
              events={eventos}
              dateClick={puedo('actividades', 'crear') ? abrirCrear : undefined}
              eventClick={({ event }) => {
                const props = event.extendedProps;
                if (props.tipo === 'actividad' && puedo('actividades', 'editar')) {
                  abrirEditar({ ...props, id: event.id.replace('act-', '') });
                }
                // click en horario recurrente: no hace nada (solo informativo)
              }}
              datesSet={(info) => {
                setRangoCalendario({ start: info.start, end: info.end });
                cargar(info);
              }}
              height="auto"
              eventContent={({ event }) => {
                const props = event.extendedProps;
                if (props.tipo === 'horario') {
                  return (
                    <Box sx={{ px: '2px', py: '1px', overflow: 'hidden' }}>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, lineHeight: 1.2, color: COLOR }}>
                        {event.title}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', color: COLOR, opacity: 0.8 }}>
                        {props.horario.horaInicio}–{props.horario.horaFin}
                      </Typography>
                    </Box>
                  );
                }
                return (
                  <Box sx={{ px: '2px', py: '1px', overflow: 'hidden' }}>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, lineHeight: 1.2 }}>
                      {event.title}
                    </Typography>
                    {props.lugar && (
                      <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.65rem' }}>
                        {props.lugar}
                      </Typography>
                    )}
                  </Box>
                );
              }}
            />
          </Box>

          {actividades.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                Actividades del mes ({actividades.length})
              </Typography>
              <Stack spacing={1}>
                {actividades.map(a => (
                  <Box key={a.id} sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
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
                          <IconButton size="small" color="primary"
                            onClick={() => { setActividadSel(a); setAsistenciaOpen(true); }}>
                            <PeopleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {puedo('actividades', 'editar') && (
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => abrirEditar(a)}>
                            <EditIcon fontSize="small" sx={{ color: COLOR }} />
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
        </>
      )}

      {/* ── Tab 1: Horarios ── */}
      {tab === 1 && (
        <TabHorarios
          programas={programas}
          puedo={puedo}
          onCambio={cargarHorarios}
        />
      )}

      <DialogActividad
        open={dialogOpen} editando={editando}
        fechaInicialSugerida={fechaInicialSug}
        programas={programas}
        onClose={() => setDialogOpen(false)}
        onGuardado={cargar} />

      <DialogAsistencia
        open={asistenciaOpen} actividad={actividadSel}
        onClose={() => setAsistenciaOpen(false)}
        onGuardado={cargar} />
    </Box>
  );
}

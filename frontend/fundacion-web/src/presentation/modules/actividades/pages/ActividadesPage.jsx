import { useState, useEffect, useCallback, useRef } from 'react';
import { useConfirm } from '../../../../shared/components/ConfirmDialog';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin     from '@fullcalendar/daygrid';
import timeGridPlugin    from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin        from '@fullcalendar/list';
import esLocale          from '@fullcalendar/core/locales/es';
import {
  Box, Button, Chip, IconButton, Stack, Tooltip, Typography,
} from '@mui/material';
import AddIcon    from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon   from '@mui/icons-material/Edit';
import PeopleIcon from '@mui/icons-material/People';
import { actividadesRepository } from '../../../../infrastructure/repositories/actividadesRepository';
import usePermisos   from '../../../../shared/hooks/usePermisos';
import apiClient     from '../../../../infrastructure/http/apiClient';
import { DialogActividad }  from './components/DialogActividad';
import { DialogAsistencia } from './components/DialogAsistencia';

const ESTADOS = [
  { value: 'programada',  label: 'Programada',  color: 'info'    },
  { value: 'en_curso',    label: 'En curso',     color: 'warning' },
  { value: 'realizada',   label: 'Realizada',    color: 'success' },
  { value: 'cancelada',   label: 'Cancelada',    color: 'error'   },
];

const COLORES_CALENDARIO = [
  '#4E1B95','#1976d2','#388e3c','#f57c00','#c62828','#00838f','#6a1b9a',
];

export default function ActividadesPage() {
  const { puedo } = usePermisos();
  const confirm   = useConfirm();
  const calendarRef = useRef(null);

  const [actividades,        setActividades]        = useState([]);
  const [programas,          setProgramas]          = useState([]);
  const [dialogOpen,         setDialogOpen]         = useState(false);
  const [editando,           setEditando]           = useState(null);
  const [fechaInicialSug,    setFechaInicialSug]    = useState('');
  const [asistenciaOpen,     setAsistenciaOpen]     = useState(false);
  const [actividadSel,       setActividadSel]       = useState(null);

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

  const eventos = actividades.map((a, i) => ({
    id:    a.id,
    title: a.titulo,
    start: a.fechaInicio,
    end:   a.fechaFin ?? undefined,
    backgroundColor: COLORES_CALENDARIO[i % COLORES_CALENDARIO.length],
    borderColor:     COLORES_CALENDARIO[i % COLORES_CALENDARIO.length],
    extendedProps: a,
  }));

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
            const a = event.extendedProps;
            if (puedo('actividades', 'editar')) abrirEditar({ ...a, id: event.id });
          }}
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
          )} />
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
                      <IconButton size="small" color="primary" onClick={() => { setActividadSel(a); setAsistenciaOpen(true); }}>
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

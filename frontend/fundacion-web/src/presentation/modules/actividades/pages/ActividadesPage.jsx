import { useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin     from '@fullcalendar/daygrid';
import timeGridPlugin    from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin        from '@fullcalendar/list';
import esLocale          from '@fullcalendar/core/locales/es';
import {
  Box, Button, Chip, Divider, IconButton, ListItemIcon, ListItemText,
  Menu, MenuItem, Stack, Tab, Tabs, Tooltip, Typography,
} from '@mui/material';
import AddIcon           from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DeleteIcon        from '@mui/icons-material/Delete';
import EditIcon          from '@mui/icons-material/Edit';
import PeopleIcon        from '@mui/icons-material/People';
import ScheduleIcon      from '@mui/icons-material/Schedule';
import { BRAND_COLOR }           from '@/shared/constants/brand';
import { DialogActividad }       from './components/DialogActividad';
import { DialogAsistencia }      from './components/DialogAsistencia';
import { DialogNuevaActividad }  from './components/DialogNuevaActividad';
import { TabHorarios }           from './components/TabHorarios';
import { useActividadesPage, ESTADOS } from './useActividadesPage';

const COLOR = BRAND_COLOR;

function EstadoChip({ estado }) {
  const e = ESTADOS.find(x => x.value === estado);
  return <Chip label={e?.label ?? estado} color={e?.color ?? 'default'} size="small" />;
}

export default function ActividadesPage() {
  const calendarRef = useRef(null);
  const {
    puedo,
    tab, setTab,
    actividades, programas,
    nuevaOpen, setNuevaOpen, fechaInicialSug,
    editDialogOpen, setEditDialogOpen, editando,
    asistenciaOpen, setAsistenciaOpen, actividadSel, setActividadSel,
    setRangoCalendario, setMesCalendario, mesCalendario,
    ctxMenu, abrirCtxMenu, cerrarCtxMenu,
    abrirNueva, abrirEditar, eliminar, cancelar,
    cargar, cargarHorarios,
    eventos,
  } = useActividadesPage();

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
        {puedo('actividades', 'crear') && (
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => abrirNueva()}
            sx={{ bgcolor: COLOR, flexShrink: 0 }}>
            Nueva actividad
          </Button>
        )}
      </Box>

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

      {tab === 0 && (
        <>
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
              dateClick={puedo('actividades', 'crear') ? abrirNueva : undefined}
              eventClick={({ event }) => {
                const props = event.extendedProps;
                if (props.tipo === 'actividad' && puedo('actividades', 'editar')) {
                  // props.id es el UUID correcto incluso cuando el event.id es compuesto (día adicional)
                  abrirEditar({ ...props });
                }
              }}
              datesSet={(info) => {
                setRangoCalendario({ start: info.start, end: info.end });
                setMesCalendario(info.view.currentStart);
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
                const actividadObj = { ...props };
                return (
                  <Box
                    onContextMenu={(e) => abrirCtxMenu(e, actividadObj)}
                    sx={{ px: '2px', py: '1px', overflow: 'hidden', width: '100%' }}
                  >
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
                  <Box key={a.id} onContextMenu={(e) => abrirCtxMenu(e, a)} sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                    bgcolor: 'background.paper', cursor: 'context-menu',
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
                    <EstadoChip estado={a.estado} />
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

      {tab === 1 && (
        <TabHorarios
          programas={programas}
          puedo={puedo}
          onCambio={cargarHorarios}
        />
      )}

      <DialogNuevaActividad
        open={nuevaOpen}
        programas={programas}
        fechaInicialSugerida={fechaInicialSug}
        onClose={() => setNuevaOpen(false)}
        onGuardado={() => { cargar(); cargarHorarios(); }}
      />

      <DialogActividad
        open={editDialogOpen}
        editando={editando}
        fechaInicialSugerida=""
        programas={programas}
        onClose={() => setEditDialogOpen(false)}
        onGuardado={() => cargar(mesCalendario ? { view: { currentStart: mesCalendario } } : undefined)}
      />

      <DialogAsistencia
        open={asistenciaOpen}
        actividad={actividadSel}
        onClose={() => setAsistenciaOpen(false)}
        onGuardado={cargar}
      />

      <Menu
        open={Boolean(ctxMenu)}
        onClose={cerrarCtxMenu}
        anchorReference="anchorPosition"
        anchorPosition={ctxMenu ? { top: ctxMenu.y, left: ctxMenu.x } : undefined}
        slotProps={{ paper: { sx: { minWidth: 180, borderRadius: 2, boxShadow: 4 } } }}
      >
        <MenuItem disabled sx={{ opacity: 1, pb: 0 }}>
          <ListItemText
            primary={ctxMenu?.actividad?.titulo}
            slotProps={{ primary: { sx: { fontWeight: 700, fontSize: '0.82rem', color: COLOR } } }}
          />
        </MenuItem>
        <Divider />
        {puedo('actividades', 'editar') && (
          <MenuItem onClick={() => { abrirEditar(ctxMenu.actividad); cerrarCtxMenu(); }}>
            <ListItemIcon><EditIcon fontSize="small" sx={{ color: COLOR }} /></ListItemIcon>
            <ListItemText primary="Editar" />
          </MenuItem>
        )}
        {puedo('actividades', 'editar') && (
          <MenuItem onClick={() => { setActividadSel(ctxMenu.actividad); setAsistenciaOpen(true); cerrarCtxMenu(); }}>
            <ListItemIcon><PeopleIcon fontSize="small" color="primary" /></ListItemIcon>
            <ListItemText primary="Registrar asistencia" />
          </MenuItem>
        )}
        {puedo('actividades', 'editar') && ctxMenu?.actividad?.estado !== 'cancelada' && (
          <MenuItem onClick={() => { cancelar(ctxMenu.actividad); cerrarCtxMenu(); }}
            sx={{ color: 'warning.dark' }}>
            <ListItemIcon><DeleteIcon fontSize="small" color="warning" /></ListItemIcon>
            <ListItemText primary="Cancelar actividad" />
          </MenuItem>
        )}
        {puedo('actividades', 'eliminar') && <Divider />}
        {puedo('actividades', 'eliminar') && (
          <MenuItem onClick={() => { eliminar(ctxMenu.actividad.id); cerrarCtxMenu(); }}
            sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText primary="Eliminar" />
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}

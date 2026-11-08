import { useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin     from '@fullcalendar/daygrid';
import timeGridPlugin    from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin        from '@fullcalendar/list';
import esLocale          from '@fullcalendar/core/locales/es';
import {
  Box, Button, Chip, CircularProgress, Divider, IconButton, ListItemIcon, ListItemText,
  Menu, MenuItem, Stack, Tab, Tabs, Tooltip, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import AddIcon           from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DeleteIcon        from '@mui/icons-material/Delete';
import DownloadIcon      from '@mui/icons-material/Download';
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
  const theme = useTheme();
  // En celular la vista de mes corta los títulos: se abre en lista (se puede cambiar)
  const movil = useMediaQuery(theme.breakpoints.down('sm'));
  // Sesiones recurrentes: fondo suave de la marca (en oscuro, translúcido sobre el fondo)
  const fondoHorario = theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.18) : '#e8def8';
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
    exportar, exportando,
    cargar, cargarHorarios,
    eventos,
  } = useActividadesPage();

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
        <Box>
          <Typography sx={{
            fontSize: '0.68rem', color: 'text.secondary',
            textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.5,
          }}>
            Módulo
          </Typography>
          <Typography sx={{ fontWeight: 800, color: 'primary.main' }} variant="h5">Actividades</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {tab === 0 && puedo('actividades', 'ver') && (
            <Tooltip title="Exporta todas las actividades del mes que muestra el calendario">
              <span>
                <Button variant="outlined" onClick={exportar} disabled={exportando}
                  startIcon={exportando ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
                  sx={{ flexShrink: 0, fontWeight: 700 }}>
                  {exportando ? 'Exportando…' : 'Exportar Excel'}
                </Button>
              </span>
            </Tooltip>
          )}
          {puedo('actividades', 'crear') && (
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => abrirNueva()}
              sx={{ bgcolor: COLOR, flexShrink: 0 }}>
              Nueva actividad
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.88rem' },
            '& .Mui-selected': { color: 'primary.main' },
            '& .MuiTabs-indicator': { backgroundColor: 'primary.main' },
          }}>
          <Tab label="Calendario" icon={<CalendarMonthIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Horarios de programas" icon={<ScheduleIcon fontSize="small" />} iconPosition="start" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
              <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: COLOR }} />
              <Typography sx={{ color: 'text.secondary' }} variant="caption">Actividad única</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
              <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: fondoHorario, border: '2px solid', borderColor: 'primary.main' }} />
              <Typography sx={{ color: 'text.secondary' }} variant="caption">Sesión recurrente</Typography>
            </Box>
          </Box>

          <Box sx={{
            '& .fc': { fontFamily: 'inherit' },
            // Colores base de FullCalendar tomados del tema (bordes, fondo de lista, cabeceras)
            '--fc-border-color': theme.palette.divider,
            '--fc-page-bg-color': theme.palette.background.paper,
            '--fc-neutral-bg-color': theme.palette.superficie2,
            '--fc-list-event-hover-bg-color': theme.palette.action.hover,
            '& .fc-toolbar-title': { fontSize: { xs: '1rem', sm: '1.1rem' }, fontWeight: 700 },
            // En móvil la barra del calendario (navegación / título / vistas) pasa a varias líneas
            '& .fc-header-toolbar': { flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: 1 },
            '& .fc-toolbar-chunk': { display: 'flex', alignItems: 'center' },
            '& .fc .fc-button': { px: { xs: 1, sm: 1.5 } },
            '& .fc-event': { cursor: 'pointer', borderRadius: '4px', px: '4px' },
          }}>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView={movil ? 'listMonth' : 'dayGridMonth'}
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
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, lineHeight: 1.2, color: 'primary.main' }}>
                        {event.title}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'primary.main', opacity: 0.8 }}>
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
              <Typography sx={{ fontWeight: 700, mb: 1 }} variant="subtitle2">
                Actividades del mes ({actividades.length})
              </Typography>
              <Stack spacing={1}>
                {actividades.map(a => (
                  <Box key={a.id} onContextMenu={(e) => abrirCtxMenu(e, a)} sx={{
                    display: 'flex', alignItems: 'center', gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                    bgcolor: 'background.paper', cursor: 'context-menu',
                  }}>
                    <Box sx={{ flex: 1, minWidth: 0, flexBasis: { xs: '100%', sm: 0 } }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{a.titulo}</Typography>
                      <Typography sx={{ color: 'text.secondary' }} variant="caption">
                        {new Date(a.fechaInicio).toLocaleString('es-CO', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                        {a.programaNombre && ` · ${a.programaNombre}`}
                        {a.lugar && ` · ${a.lugar}`}
                      </Typography>
                    </Box>
                    <EstadoChip estado={a.estado} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 60 }}>
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
                            <EditIcon fontSize="small" sx={{ color: 'primary.main' }} />
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
            slotProps={{ primary: { sx: { fontWeight: 700, fontSize: '0.82rem', color: 'primary.main' } } }}
          />
        </MenuItem>
        <Divider />
        {puedo('actividades', 'editar') && (
          <MenuItem onClick={() => { abrirEditar(ctxMenu.actividad); cerrarCtxMenu(); }}>
            <ListItemIcon><EditIcon fontSize="small" sx={{ color: 'primary.main' }} /></ListItemIcon>
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

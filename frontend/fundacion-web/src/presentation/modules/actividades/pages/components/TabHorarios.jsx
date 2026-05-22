import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Chip, CircularProgress, Divider,
  IconButton, Tooltip, Typography,
} from '@mui/material';
import DeleteIcon     from '@mui/icons-material/Delete';
import EditIcon       from '@mui/icons-material/Edit';
import PauseIcon      from '@mui/icons-material/Pause';
import PlayArrowIcon  from '@mui/icons-material/PlayArrow';
import AccessTimeIcon    from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PlaceIcon         from '@mui/icons-material/Place';
import { actividadesRepository } from '../../../../../infrastructure/repositories/actividadesRepository';
import { useConfirm }            from '../../../../../shared/components/ConfirmDialog';
import { DialogHorario }         from './DialogHorario';

const COLOR = '#4E1B95';

const DIAS_LABEL = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_COLOR = {
  1: '#1976d2', 2: '#388e3c', 3: '#f57c00',
  4: '#6a1b9a', 5: '#c62828', 6: '#00838f', 0: '#78909c',
};

export function TabHorarios({ programas, puedo, onCambio }) {
  const confirm = useConfirm();
  const [horarios,  setHorarios]  = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState('');
  // Solo edición desde la lista; la creación se hace desde el botón principal
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando,   setEditando]   = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const { data } = await actividadesRepository.listarHorarios();
      setHorarios(data);
      onCambio?.();
    } catch {
      setError('No se pudieron cargar los horarios.');
    } finally {
      setCargando(false);
    }
  }, [onCambio]);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async (h) => {
    if (!await confirm(`¿Eliminar horario del ${DIAS_LABEL[h.diaSemana]} (${h.horaInicio}–${h.horaFin})?`)) return;
    try {
      await actividadesRepository.eliminarHorario(h.id);
      cargar();
    } catch { setError('No se pudo eliminar.'); }
  };

  const toggleActivo = async (h) => {
    try {
      await actividadesRepository.actualizarHorario(h.id, {
        programaId: h.programaId, diaSemana: h.diaSemana,
        horaInicio: h.horaInicio, horaFin: h.horaFin,
        lugar: h.lugar, activo: !h.activo,
      });
      cargar();
    } catch { setError('No se pudo actualizar el estado.'); }
  };

  // Agrupar por programa
  const porPrograma = horarios.reduce((acc, h) => {
    const key = h.programaId;
    if (!acc[key]) acc[key] = { nombre: h.programaNombre, sede: h.sedeNombre, items: [] };
    acc[key].items.push(h);
    return acc;
  }, {});

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box mb={2}>
        <Typography variant="subtitle2" color="text.secondary">
          Horarios recurrentes semanales por programa. Para agregar uno nuevo, usa el botón <strong>"Nueva actividad"</strong> arriba.
        </Typography>
      </Box>

      {cargando ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress sx={{ color: COLOR }} />
        </Box>
      ) : Object.keys(porPrograma).length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <AccessTimeIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1, display: 'block', mx: 'auto' }} />
          <Typography variant="body2">
            No hay horarios configurados.{' '}
            {puedo('actividades', 'crear') && 'Crea uno con el botón de arriba.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Object.entries(porPrograma).map(([pid, grupo]) => (
            <Box key={pid} sx={{
              border: '1.5px solid #e2d9f3', borderRadius: 3,
              overflow: 'hidden', bgcolor: '#fdfbff',
            }}>
              {/* Cabecera del programa */}
              <Box sx={{
                bgcolor: COLOR, px: 2.5, py: 1.5,
                display: 'flex', alignItems: 'center', gap: 1,
              }}>
                <Box flex={1}>
                  <Typography fontWeight={800} color="white" variant="body1">
                    {grupo.nombre}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                    {grupo.sede}
                  </Typography>
                </Box>
                <Chip
                  label={`${grupo.items.length} sesión${grupo.items.length !== 1 ? 'es' : ''}/sem`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, fontSize: '0.7rem' }}
                />
              </Box>

              {/* Lista de sesiones */}
              <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                {grupo.items.map((h, idx) => (
                  <Box key={h.id}>
                    {idx > 0 && <Divider sx={{ my: 0.5 }} />}
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      opacity: h.activo ? 1 : 0.5,
                      py: 0.5,
                    }}>
                      {/* Chip del día */}
                      <Chip
                        label={DIAS_LABEL[h.diaSemana]}
                        size="small"
                        sx={{
                          bgcolor: h.activo ? DIAS_COLOR[h.diaSemana] : '#9e9e9e',
                          color: 'white', fontWeight: 800,
                          fontSize: '0.72rem', minWidth: 42,
                        }}
                      />

                      {/* Hora y vigencia */}
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap">
                          <AccessTimeIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                          <Typography variant="body2" fontWeight={700}>
                            {h.horaInicio} – {h.horaFin}
                          </Typography>
                          {h.lugar && (
                            <>
                              <PlaceIcon sx={{ fontSize: 14, color: 'text.secondary', ml: 0.5 }} />
                              <Typography variant="caption" color="text.secondary">{h.lugar}</Typography>
                            </>
                          )}
                        </Box>
                        {(h.fechaInicioVigencia || h.fechaFinVigencia) && (
                          <Box display="flex" alignItems="center" gap={0.4} mt={0.3}>
                            <CalendarTodayIcon sx={{ fontSize: 11, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                              {h.fechaInicioVigencia
                                ? new Date(h.fechaInicioVigencia + 'T00:00:00').toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })
                                : '—'}
                              {' → '}
                              {h.fechaFinVigencia
                                ? new Date(h.fechaFinVigencia + 'T00:00:00').toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })
                                : 'sin fecha fin'}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Estado */}
                      {!h.activo && (
                        <Chip label="Pausado" size="small" color="default" variant="outlined"
                          sx={{ fontSize: '0.62rem' }} />
                      )}

                      {/* Acciones */}
                      <Box display="flex" gap={0.5}>
                        {puedo('actividades', 'editar') && (
                          <Tooltip title={h.activo ? 'Pausar' : 'Activar'}>
                            <IconButton size="small" onClick={() => toggleActivo(h)}>
                              {h.activo
                                ? <PauseIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                : <PlayArrowIcon fontSize="small" sx={{ color: COLOR }} />}
                            </IconButton>
                          </Tooltip>
                        )}
                        {puedo('actividades', 'editar') && (
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => { setEditando(h); setDialogOpen(true); }}>
                              <EditIcon fontSize="small" sx={{ color: COLOR }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {puedo('actividades', 'eliminar') && (
                          <Tooltip title="Eliminar horario">
                            <IconButton size="small" color="error" onClick={() => eliminar(h)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <DialogHorario
        open={dialogOpen} editando={editando} programas={programas}
        onClose={() => setDialogOpen(false)}
        onGuardado={cargar}
      />
    </Box>
  );
}

// CRUD de sedes y sus programas. Cada sede es una tarjeta expandible con su tabla de programas.
// Llama a GET/POST/PUT/PATCH/DELETE en /api/sedes y /api/sedes/programas.
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Chip, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Collapse, Divider, CircularProgress, Alert, Snackbar, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import AddIcon          from '@mui/icons-material/Add';
import EditIcon         from '@mui/icons-material/Edit';
import DeleteIcon       from '@mui/icons-material/Delete';
import ExpandMoreIcon   from '@mui/icons-material/ExpandMore';
import ExpandLessIcon   from '@mui/icons-material/ExpandLess';
import LocationOnIcon   from '@mui/icons-material/LocationOn';
import SchoolIcon       from '@mui/icons-material/School';
import ToggleOnIcon     from '@mui/icons-material/ToggleOn';
import ToggleOffIcon    from '@mui/icons-material/ToggleOff';
import api from '../../services/api';

/* ── Diálogo para crear/editar sede ──────────────────────────────────────── */
function DialogSede({ abierto, onCerrar, onGuardado, inicial }) {
  const [form, setForm] = useState({ nombre: '', direccion: '', ciudad: '', telefono: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (abierto) setForm({ nombre: inicial?.nombre ?? '', direccion: inicial?.direccion ?? '', ciudad: inicial?.ciudad ?? '', telefono: inicial?.telefono ?? '' });
    setError('');
  }, [abierto, inicial]);

  const set = campo => e => setForm(p => ({ ...p, [campo]: e.target.value }));

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setGuardando(true);
    setError('');
    try {
      let resp;
      if (inicial?.id) {
        resp = await api.put(`/api/sedes/${inicial.id}`, form);
      } else {
        resp = await api.post('/api/sedes', form);
      }
      onGuardado(resp.data);
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#4E1B95', color: 'white', fontWeight: 700 }}>
        {inicial?.id ? 'Editar sede' : 'Nueva sede'}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} mt={0}>
          <Grid size={12}>
            <TextField fullWidth label="Nombre *" size="small" value={form.nombre} onChange={set('nombre')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth label="Dirección" size="small" value={form.direccion} onChange={set('direccion')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Ciudad" size="small" value={form.ciudad} onChange={set('ciudad')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Teléfono" size="small" value={form.telefono} onChange={set('telefono')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardar} disabled={guardando || !form.nombre.trim()}
          sx={{ bgcolor: '#4E1B95' }}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Diálogo para crear/editar programa ──────────────────────────────────── */
function DialogPrograma({ abierto, onCerrar, onGuardado, sedeId, inicial }) {
  const [form, setForm] = useState({ nombre: '', descripcion: '', cupoMaximo: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (abierto) setForm({ nombre: inicial?.nombre ?? '', descripcion: inicial?.descripcion ?? '', cupoMaximo: inicial?.cupoMaximo ?? '' });
    setError('');
  }, [abierto, inicial]);

  const set = campo => e => setForm(p => ({ ...p, [campo]: e.target.value }));

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setGuardando(true);
    setError('');
    try {
      const payload = { sedeId, nombre: form.nombre, descripcion: form.descripcion || null, cupoMaximo: form.cupoMaximo ? parseInt(form.cupoMaximo) : null };
      let resp;
      if (inicial?.id) {
        resp = await api.put(`/api/sedes/programas/${inicial.id}`, payload);
      } else {
        resp = await api.post('/api/sedes/programas', payload);
      }
      onGuardado(resp.data);
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#2D984F', color: 'white', fontWeight: 700 }}>
        {inicial?.id ? 'Editar programa' : 'Nuevo programa'}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} mt={0}>
          <Grid size={12}>
            <TextField fullWidth label="Nombre *" size="small" value={form.nombre} onChange={set('nombre')} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Descripción" size="small" multiline rows={2} value={form.descripcion} onChange={set('descripcion')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Cupo máximo" size="small" type="number" value={form.cupoMaximo} onChange={set('cupoMaximo')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardar} disabled={guardando || !form.nombre.trim()}
          sx={{ bgcolor: '#2D984F' }}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Tarjeta de sede ─────────────────────────────────────────────────────── */
function TarjetaSede({ sede, onEditar, onEliminar, onToggle, onEditarPrograma, onEliminarPrograma, onTogglePrograma, onNuevoPrograma }) {
  const [expandida, setExpandida] = useState(false);

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 2 }}>
      {/* Cabecera de la sede */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 2, py: 1.5, bgcolor: '#fdfbff',
          borderBottom: expandida ? '1px solid' : 'none', borderColor: 'divider',
        }}
      >
        <LocationOnIcon sx={{ color: '#4E1B95', flexShrink: 0 }} />
        <Box flex={1} minWidth={0}>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography fontWeight={700} noWrap>{sede.nombre}</Typography>
            <Chip label={sede.activo ? 'Activa' : 'Inactiva'} size="small"
              color={sede.activo ? 'success' : 'default'} />
          </Box>
          {(sede.ciudad || sede.direccion) && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {[sede.ciudad, sede.direccion].filter(Boolean).join(' · ')}
            </Typography>
          )}
        </Box>
        <Box display="flex" gap={0.5} flexShrink={0}>
          <Tooltip title={sede.activo ? 'Desactivar' : 'Activar'}>
            <IconButton size="small" onClick={() => onToggle(sede)}>
              {sede.activo ? <ToggleOnIcon sx={{ color: '#2D984F' }} /> : <ToggleOffIcon sx={{ color: '#aaa' }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar sede">
            <IconButton size="small" onClick={() => onEditar(sede)}>
              <EditIcon fontSize="small" sx={{ color: '#1565C0' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar sede">
            <IconButton size="small" onClick={() => onEliminar(sede)}>
              <DeleteIcon fontSize="small" sx={{ color: '#c62828' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={expandida ? 'Ocultar programas' : 'Ver programas'}>
            <IconButton size="small" onClick={() => setExpandida(p => !p)}>
              {expandida ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Programas */}
      <Collapse in={expandida}>
        {/* overflowX: 'auto' permite scroll horizontal en móvil sin romper el Paper */}
        <Box sx={{ px: 2, py: 1.5, overflowX: 'auto' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" fontWeight={700} color="#2D984F" display="flex" alignItems="center" gap={0.5}>
              <SchoolIcon fontSize="small" /> Programas ({sede.programas?.length ?? 0})
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => onNuevoPrograma(sede)}
              sx={{ color: '#2D984F', textTransform: 'none' }}>
              Agregar
            </Button>
          </Box>

          {(!sede.programas || sede.programas.length === 0) ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 1 }}>
              No hay programas. Haz clic en Agregar para crear uno.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#4E1B95' }}>Programa</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#4E1B95' }}>Cupo</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#4E1B95' }}>Estado</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sede.programas.map(prog => (
                    <TableRow key={prog.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{prog.nombre}</Typography>
                        {prog.descripcion && <Typography variant="caption" color="text.secondary">{prog.descripcion}</Typography>}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{prog.cupoMaximo ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={prog.activo ? 'Activo' : 'Inactivo'} size="small"
                          color={prog.activo ? 'success' : 'default'} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={prog.activo ? 'Desactivar' : 'Activar'}>
                          <IconButton size="small" onClick={() => onTogglePrograma(prog)}>
                            {prog.activo ? <ToggleOnIcon fontSize="small" sx={{ color: '#2D984F' }} /> : <ToggleOffIcon fontSize="small" sx={{ color: '#aaa' }} />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => onEditarPrograma(sede, prog)}>
                            <EditIcon fontSize="small" sx={{ color: '#1565C0' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" onClick={() => onEliminarPrograma(prog)}>
                            <DeleteIcon fontSize="small" sx={{ color: '#c62828' }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}

/* ── Página principal ────────────────────────────────────────────────────── */
export default function Sedes() {
  const [sedes,      setSedes]      = useState([]);
  const [cargando,   setCargando]   = useState(false);
  const [error,      setError]      = useState('');
  const [toast,      setToast]      = useState('');

  const [dialogSede,        setDialogSede]        = useState({ abierto: false, inicial: null });
  const [dialogPrograma,    setDialogPrograma]     = useState({ abierto: false, sedeId: null, inicial: null });
  const [confirmEliminar,   setConfirmEliminar]    = useState(null); // { tipo, item }
  const [eliminando,        setEliminando]         = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const { data } = await api.get('/api/sedes');
      setSedes(data);
    } catch {
      setError('No se pudieron cargar las sedes.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  /* ── Sede handlers ──────────────────────────────────────────────────────── */
  const handleGuardadoSede = (sedeActualizada) => {
    setSedes(prev => {
      const existe = prev.find(s => s.id === sedeActualizada.id);
      if (existe) return prev.map(s => s.id === sedeActualizada.id ? sedeActualizada : s);
      return [...prev, sedeActualizada];
    });
    setDialogSede({ abierto: false, inicial: null });
    setToast('Sede guardada correctamente');
  };

  const handleToggleSede = async (sede) => {
    try {
      const { data } = await api.patch(`/api/sedes/${sede.id}/toggle`);
      setSedes(prev => prev.map(s => s.id === data.id ? data : s));
    } catch { setError('Error al cambiar estado de la sede.'); }
  };

  const handleEliminarSede = async () => {
    if (!confirmEliminar) return;
    setEliminando(true);
    try {
      await api.delete(`/api/sedes/${confirmEliminar.item.id}`);
      setSedes(prev => prev.filter(s => s.id !== confirmEliminar.item.id));
      setConfirmEliminar(null);
      setToast('Sede eliminada');
    } catch { setError('No se pudo eliminar la sede. Puede que tenga programas activos.'); }
    finally { setEliminando(false); }
  };

  /* ── Programa handlers ──────────────────────────────────────────────────── */
  const handleGuardadoPrograma = (prog) => {
    setSedes(prev => prev.map(s => {
      if (s.id !== prog.sedeId) return s;
      const existe = s.programas?.find(p => p.id === prog.id);
      const programas = existe
        ? s.programas.map(p => p.id === prog.id ? prog : p)
        : [...(s.programas ?? []), prog];
      return { ...s, programas };
    }));
    setDialogPrograma({ abierto: false, sedeId: null, inicial: null });
    setToast('Programa guardado correctamente');
  };

  const handleTogglePrograma = async (prog) => {
    try {
      const { data } = await api.patch(`/api/sedes/programas/${prog.id}/toggle`);
      setSedes(prev => prev.map(s => {
        if (s.id !== data.sedeId) return s;
        return { ...s, programas: s.programas.map(p => p.id === data.id ? data : p) };
      }));
    } catch { setError('Error al cambiar estado del programa.'); }
  };

  const handleEliminarPrograma = async () => {
    if (!confirmEliminar) return;
    setEliminando(true);
    try {
      await api.delete(`/api/sedes/programas/${confirmEliminar.item.id}`);
      setSedes(prev => prev.map(s => ({
        ...s,
        programas: s.programas?.filter(p => p.id !== confirmEliminar.item.id) ?? [],
      })));
      setConfirmEliminar(null);
      setToast('Programa eliminado');
    } catch { setError('No se pudo eliminar el programa.'); }
    finally { setEliminando(false); }
  };

  const handleConfirmarEliminar = () => {
    if (confirmEliminar?.tipo === 'sede') return handleEliminarSede();
    if (confirmEliminar?.tipo === 'programa') return handleEliminarPrograma();
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Encabezado */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #4E1B95, #2D984F)',
          borderRadius: 3, p: { xs: 2, sm: 3 }, mb: 3, color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <LocationOnIcon sx={{ fontSize: 32, opacity: 0.85 }} />
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>Sedes y Programas</Typography>
            <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.3 }}>
              Gestiona las sedes y los programas de la fundación
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogSede({ abierto: true, inicial: null })}
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }, fontWeight: 700 }}
        >
          Nueva sede
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {cargando ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress sx={{ color: '#4E1B95' }} />
        </Box>
      ) : sedes.length === 0 ? (
        <Paper elevation={0} sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 5, textAlign: 'center' }}>
          <LocationOnIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
          <Typography color="text.secondary">No hay sedes registradas.</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogSede({ abierto: true, inicial: null })}
            sx={{ mt: 2, bgcolor: '#4E1B95' }}>
            Crear primera sede
          </Button>
        </Paper>
      ) : (
        sedes.map(sede => (
          <TarjetaSede
            key={sede.id}
            sede={sede}
            onEditar={s     => setDialogSede({ abierto: true, inicial: s })}
            onEliminar={s   => setConfirmEliminar({ tipo: 'sede', item: s })}
            onToggle={handleToggleSede}
            onNuevoPrograma={s => setDialogPrograma({ abierto: true, sedeId: s.id, inicial: null })}
            onEditarPrograma={(s, p) => setDialogPrograma({ abierto: true, sedeId: s.id, inicial: p })}
            onEliminarPrograma={p => setConfirmEliminar({ tipo: 'programa', item: p })}
            onTogglePrograma={handleTogglePrograma}
          />
        ))
      )}

      {/* Diálogo sede */}
      <DialogSede
        abierto={dialogSede.abierto}
        inicial={dialogSede.inicial}
        onCerrar={() => setDialogSede({ abierto: false, inicial: null })}
        onGuardado={handleGuardadoSede}
      />

      {/* Diálogo programa */}
      <DialogPrograma
        abierto={dialogPrograma.abierto}
        sedeId={dialogPrograma.sedeId}
        inicial={dialogPrograma.inicial}
        onCerrar={() => setDialogPrograma({ abierto: false, sedeId: null, inicial: null })}
        onGuardado={handleGuardadoPrograma}
      />

      {/* Confirmación eliminar */}
      <Dialog open={!!confirmEliminar} onClose={() => setConfirmEliminar(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#c62828', fontWeight: 700 }}>
          ¿Eliminar {confirmEliminar?.tipo === 'sede' ? 'sede' : 'programa'}?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Se eliminará <strong>{confirmEliminar?.item?.nombre}</strong>. Esta acción no se puede deshacer.
            {confirmEliminar?.tipo === 'sede' && ' Se eliminarán también todos sus programas.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmEliminar(null)} variant="outlined">Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleConfirmarEliminar} disabled={eliminando}>
            {eliminando ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}

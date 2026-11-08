import { useState, useEffect, useRef } from 'react';
import {
  Alert, Box, Button, CircularProgress, DialogActions, DialogContent,
  DialogTitle, FormControl, FormHelperText, Grid, IconButton, InputLabel, MenuItem, Paper,
  Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import AddIcon        from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DeleteIcon     from '@mui/icons-material/Delete';
import EditIcon       from '@mui/icons-material/Edit';
import { voluntariosRepository } from '@/infrastructure/repositories/voluntariosRepository';
import { sedesRepository }        from '@/infrastructure/repositories/sedesRepository';
import { useConfirm } from '@/shared/components/useConfirm';
import { COLOR, FORM_VACIO_ASIG, fmtFecha, toInputDate } from './helpers';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { r, vacio } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';

// Reglas del formulario de asignación
const ESQUEMA_ASIG = {
  sedeId:         { etiqueta: 'Sede', reglas: [
    r.propia((valor, f) => (vacio(valor) && vacio(f.programaId)
      ? 'Selecciona al menos la sede donde participará el voluntario. Ejemplo: Sede Norte' : '')),
  ] },
  horasSemanales: { etiqueta: 'Horas/sem', reglas: [r.numero({ min: 1, max: 60, entero: true, unidad: 'horas', ejemplo: '8' })] },
  fechaInicio:    { etiqueta: 'Desde',     reglas: [r.fecha({ ejemplo: '2025-03-01' })] },
};

export function AsignacionesDialog({ open, voluntario, onClose, onCambio }) {
  const confirm = useConfirm();
  const [asignaciones, setAsignaciones] = useState([]);
  const [cargando,     setCargando]     = useState(false);
  const [sedes,        setSedes]        = useState([]);
  const [programas,    setProgramas]    = useState([]);
  const [form,         setForm]         = useState(FORM_VACIO_ASIG);
  const [editandoId,   setEditandoId]   = useState(null);
  const [guardando,    setGuardando]    = useState(false);
  const [error,        setError]        = useState('');
  const programaIdParaRestaurar         = useRef(null);
  const v = useValidacion(ESQUEMA_ASIG, form);
  const { reiniciar } = v;

  useEffect(() => {
    if (!open || !voluntario) return;
    setCargando(true);
    setForm(FORM_VACIO_ASIG); setEditandoId(null); setError(''); reiniciar();
    voluntariosRepository.listarAsignaciones(voluntario.id)
      .then(({ data }) => setAsignaciones(data))
      .catch((e) => setError(mensajeErrorApi(e, { accion: 'cargar las asignaciones' })))
      .finally(() => setCargando(false));
    sedesRepository.listar({ soloActivas: true }).then(({ data }) => setSedes(data))
      .catch(() => { /* opcional: el catálogo de sedes vacío no bloquea el diálogo */ });
  }, [open, voluntario, reiniciar]);

  useEffect(() => {
    if (!form.sedeId) { setProgramas([]); setForm(p => ({ ...p, programaId: '' })); return; }
    const restoreId = programaIdParaRestaurar.current;
    programaIdParaRestaurar.current = null;
    setForm(p => ({ ...p, programaId: '' }));
    sedesRepository.listarProgramas(form.sedeId)
      .then(({ data }) => {
        setProgramas(data);
        if (restoreId) setForm(p => ({ ...p, programaId: restoreId }));
      })
      .catch(() => setProgramas([])); // opcional: sin programas se puede asignar solo la sede
  }, [form.sedeId]);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const iniciarEdicion = (asig) => {
    programaIdParaRestaurar.current = asig.programaId ?? '';
    setEditandoId(asig.id); setError(''); reiniciar();
    setForm({
      sedeId:         asig.sedeId ?? '',
      programaId:     asig.programaId ?? '',
      horasSemanales: String(asig.horasSemanales || ''),
      fechaInicio:    asig.fechaInicio ? toInputDate(asig.fechaInicio) : '',
    });
  };

  const cancelarEdicion = () => { setEditandoId(null); setForm(FORM_VACIO_ASIG); setError(''); reiniciar(); };

  const guardar = async () => {
    if (!v.validarTodo()) return;
    setGuardando(true); setError('');
    try {
      const payload = {
        programaId:     form.programaId || null,
        sedeId:         form.sedeId || null,
        horasSemanales: Number(form.horasSemanales) || 0,
        fechaInicio:    form.fechaInicio || null,
      };
      if (editandoId) {
        const { data } = await voluntariosRepository.editarAsignacion(editandoId, payload);
        setAsignaciones(prev => prev.map(a => a.id === editandoId ? data : a));
        setEditandoId(null);
      } else {
        const { data } = await voluntariosRepository.agregarAsignacion(voluntario.id, payload);
        setAsignaciones(prev => [data, ...prev]);
      }
      setForm(FORM_VACIO_ASIG); reiniciar();
      onCambio?.(voluntario.id);
    } catch (e) {
      setError(mensajeErrorApi(e, { accion: editandoId ? 'guardar la asignación' : 'agregar la asignación' }));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (asig) => {
    if (!await confirm('¿Eliminar esta asignación?')) return;
    try {
      await voluntariosRepository.eliminarAsignacion(asig.id);
      setAsignaciones(prev => prev.filter(a => a.id !== asig.id));
      if (editandoId === asig.id) cancelarEdicion();
      onCambio?.(voluntario.id);
    } catch (e) { setError(mensajeErrorApi(e, { accion: 'eliminar la asignación' })); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>
        Programas — {voluntario?.nombre}
      </DialogTitle>
      <DialogContent dividers>
        {cargando ? (
          <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress /></Box>
        ) : asignaciones.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
            <AssignmentIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography sx={{ fontSize: '0.9rem' }}>Sin asignaciones aún</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'superficie2' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Sede</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Programa</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Horas/sem</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Desde</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {asignaciones.map(a => (
                  <TableRow key={a.id} hover selected={editandoId === a.id}
                    sx={editandoId === a.id ? { bgcolor: 'color-mix(in srgb, var(--color-primario) 5%, transparent)' } : {}}>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{a.nombreSede || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{a.nombrePrograma || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{a.horasSemanales > 0 ? `${a.horasSemanales}h` : '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{fmtFecha(a.fechaInicio) || '—'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => iniciarEdicion(a)}
                          sx={{ color: editandoId === a.id ? COLOR : 'text.secondary' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => eliminar(a)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Typography sx={{ fontWeight: 700, mb: 1.5, color: COLOR, fontSize: '0.85rem' }}>
          {editandoId ? 'Editando asignación' : 'Agregar asignación'}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <Grid sx={{ alignItems: 'center' }} container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small" error={!!v.err('sedeId')}>
              <InputLabel id="asignaciones-dialog-sede-label">Sede</InputLabel>
              <Select labelId="asignaciones-dialog-sede-label" value={form.sedeId} label="Sede" onBlur={() => v.tocar('sedeId')}
                onChange={e => setF('sedeId', e.target.value)}>
                <MenuItem value=""><em>Sin sede</em></MenuItem>
                {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
              </Select>
              {v.err('sedeId') && <FormHelperText>{v.err('sedeId')}</FormHelperText>}
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small" disabled={!form.sedeId || programas.length === 0}>
              <InputLabel id="asignaciones-dialog-programa-label">Programa</InputLabel>
              <Select labelId="asignaciones-dialog-programa-label" value={form.programaId} label="Programa" onChange={e => setF('programaId', e.target.value)}>
                <MenuItem value=""><em>Sin programa</em></MenuItem>
                {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField fullWidth size="small" label="Horas/sem" type="number"
              value={form.horasSemanales} onChange={e => setF('horasSemanales', e.target.value)}
              {...v.props('horasSemanales')} />
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField fullWidth size="small" label="Desde" type="date"
              value={form.fechaInicio} onChange={e => setF('fechaInicio', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} {...v.props('fechaInicio')} />
          </Grid>
          {v.resumen.visible && (
            <Grid size={12}>
              <ResumenErrores {...v.resumen} accion={editandoId ? 'guardar la asignación' : 'agregar la asignación'}
                sx={{ mx: 0, mt: 0 }} />
            </Grid>
          )}
          <Grid size={12} sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained"
              startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : editandoId ? <EditIcon /> : <AddIcon />}
              onClick={guardar} disabled={guardando}
              sx={{ bgcolor: COLOR, fontWeight: 700, '&:hover': { bgcolor: 'primary.dark' } }}>
              {guardando ? '…' : editandoId ? 'Guardar cambios' : 'Agregar'}
            </Button>
            {editandoId && <Button onClick={cancelarEdicion} disabled={guardando}>Cancelar</Button>}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

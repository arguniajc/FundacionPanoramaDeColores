import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, IconButton, InputLabel,
  MenuItem, Paper, Select, Snackbar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon          from '@mui/icons-material/Add';
import AutorenewIcon    from '@mui/icons-material/Autorenew';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import DeleteIcon       from '@mui/icons-material/Delete';
import ExpandMoreIcon   from '@mui/icons-material/ExpandMore';
import ExpandLessIcon   from '@mui/icons-material/ExpandLess';
import { nominaRepository } from '@/infrastructure/repositories/nominaRepository';
import { useConfirm }       from '@/shared/components/ConfirmDialog';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ANIOS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

function fmtCOP(n) {
  return Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function EstadoChip({ estado }) {
  return (
    <Chip
      label={estado === 'cerrado' ? 'Cerrado' : 'Borrador'}
      size="small"
      sx={{
        fontWeight: 700, fontSize: '0.7rem',
        bgcolor: estado === 'cerrado' ? '#d1fae5' : '#fef3c7',
        color:   estado === 'cerrado' ? '#065f46' : '#92400e',
      }}
    />
  );
}

function FilaLiquidacion({ liq, puedeEditar, onEliminar }) {
  return (
    <TableRow hover>
      <TableCell sx={{ fontSize: '0.8rem' }}>
        <Typography fontWeight={600} fontSize="inherit">{liq.empleadoNombre}</Typography>
        {liq.cargo && <Typography fontSize="0.72rem" color="text.secondary">{liq.cargo}</Typography>}
      </TableCell>
      <TableCell align="right" sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{fmtCOP(liq.salarioBase)}</TableCell>
      <TableCell align="right" sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{fmtCOP(liq.auxilioTransporte)}</TableCell>
      <TableCell align="right" sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{fmtCOP(liq.totalDevengado)}</TableCell>
      <TableCell align="right" sx={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#EF4444' }}>{fmtCOP(liq.totalDeducciones)}</TableCell>
      <TableCell align="right" sx={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700, color: '#10B981' }}>{fmtCOP(liq.netoPagar)}</TableCell>
      <TableCell align="right">
        {puedeEditar && (
          <Tooltip title="Eliminar liquidación">
            <IconButton size="small" color="error" onClick={() => onEliminar(liq)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );
}

function PeriodoCard({ periodo, puedeEditar, onCerrar, onEliminar, onAutoLiquidar }) {
  const [expandido, setExpandido] = useState(false);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [cargandoLiq, setCargandoLiq] = useState(false);
  const confirm = useConfirm();

  const cargarLiq = useCallback(async () => {
    if (!expandido) return;
    setCargandoLiq(true);
    try {
      const { data } = await nominaRepository.listarLiquidaciones(periodo.id);
      setLiquidaciones(data);
    } finally {
      setCargandoLiq(false);
    }
  }, [expandido, periodo.id]);

  useEffect(() => { cargarLiq(); }, [cargarLiq]);

  const handleEliminarLiq = async (liq) => {
    if (!await confirm(`¿Eliminar liquidación de ${liq.empleadoNombre}?`)) return;
    await nominaRepository.eliminarLiquidacion(liq.id);
    setLiquidaciones(prev => prev.filter(l => l.id !== liq.id));
  };

  const handleAutoLiquidar = async () => {
    if (!await confirm('¿Auto-liquidar todos los empleados activos con salario registrado?')) return;
    const result = await onAutoLiquidar(periodo.id);
    if (result) setLiquidaciones(result);
  };

  const totalNeto = liquidaciones.reduce((s, l) => s + Number(l.netoPagar), 0);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2, overflow: 'hidden' }}>
      {/* Header del período */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5,
          bgcolor: periodo.estado === 'cerrado' ? '#f0fdf4' : '#fffbf0',
          cursor: 'pointer', '&:hover': { bgcolor: periodo.estado === 'cerrado' ? '#dcfce7' : '#fef3c7' },
        }}
        onClick={() => setExpandido(e => !e)}
      >
        <Box flex={1}>
          <Typography fontWeight={700}>
            {MESES[periodo.mes - 1]} {periodo.anio}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {periodo.totalEmpleados} empleado{periodo.totalEmpleados !== 1 ? 's' : ''} · {fmtCOP(periodo.totalNeto)} neto
          </Typography>
        </Box>
        <EstadoChip estado={periodo.estado} />
        {puedeEditar && periodo.estado === 'borrador' && (
          <Box onClick={e => e.stopPropagation()} sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Auto-liquidar empleados">
              <IconButton size="small" color="primary" onClick={handleAutoLiquidar}>
                <AutorenewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cerrar período">
              <IconButton size="small" color="success" onClick={() => onCerrar(periodo)}>
                <CheckCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar período">
              <IconButton size="small" color="error" onClick={() => onEliminar(periodo)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        <IconButton size="small">
          {expandido ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      {/* Liquidaciones */}
      {expandido && (
        <Box sx={{ px: 2, pb: 2, pt: 1 }}>
          {cargandoLiq ? (
            <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={24} /></Box>
          ) : liquidaciones.length === 0 ? (
            <Typography color="text.secondary" fontSize="0.85rem" sx={{ py: 2, textAlign: 'center' }}>
              Sin liquidaciones. Usa el botón <AutorenewIcon fontSize="inherit" /> para auto-liquidar.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Empleado</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Salario</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Aux. Transp.</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Devengado</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Deducciones</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Neto a Pagar</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {liquidaciones.map(l => (
                    <FilaLiquidacion
                      key={l.id}
                      liq={l}
                      puedeEditar={puedeEditar && periodo.estado === 'borrador'}
                      onEliminar={handleEliminarLiq}
                    />
                  ))}
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell colSpan={5} sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Total nómina</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.82rem', fontFamily: 'monospace', color: '#10B981' }}>
                      {fmtCOP(totalNeto)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
    </Paper>
  );
}

function NuevoPeriodoDialog({ open, onClose, onCreado }) {
  const mesActual = new Date().getMonth() + 1;
  const anioActual = new Date().getFullYear();
  const [mes,  setMes]  = useState(mesActual);
  const [anio, setAnio] = useState(anioActual);
  const [obs,  setObs]  = useState('');
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState('');

  const handleGuardar = async () => {
    setGuardando(true); setErr('');
    try {
      const { data } = await nominaRepository.crearPeriodo({ mes, anio, observacion: obs || null });
      onCreado(data);
    } catch (e) {
      setErr(e?.response?.data?.title ?? 'Error al crear el período');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Período de Nómina</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {err && <Alert severity="error">{err}</Alert>}
          <FormControl fullWidth size="small">
            <InputLabel>Mes</InputLabel>
            <Select value={mes} label="Mes" onChange={e => setMes(e.target.value)}>
              {MESES.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Año</InputLabel>
            <Select value={anio} label="Año" onChange={e => setAnio(e.target.value)}>
              {ANIOS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            size="small" label="Observación (opcional)" multiline rows={2}
            value={obs} onChange={e => setObs(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardar} disabled={guardando}>
          {guardando ? <CircularProgress size={18} color="inherit" /> : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function PanelNomina({ puedo }) {
  const confirm = useConfirm();
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear());
  const [periodos,   setPeriodos]   = useState([]);
  const [cargando,   setCargando]   = useState(false);
  const [dialOpen,   setDialOpen]   = useState(false);
  const [snack,      setSnack]      = useState({ open: false, msg: '', sev: 'success' });

  const ok  = msg => setSnack({ open: true, msg, sev: 'success' });
  const err = msg => setSnack({ open: true, msg, sev: 'error' });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await nominaRepository.listarPeriodos(anioFiltro);
      setPeriodos(data);
    } finally {
      setCargando(false);
    }
  }, [anioFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleCreado = (periodo) => {
    setPeriodos(prev => [periodo, ...prev]);
    setDialOpen(false);
    ok('Período creado.');
  };

  const handleCerrar = async (periodo) => {
    if (!await confirm(`¿Cerrar el período ${MESES[periodo.mes - 1]} ${periodo.anio}? Esta acción no se puede deshacer.`)) return;
    try {
      await nominaRepository.cerrarPeriodo(periodo.id);
      cargar();
      ok('Período cerrado.');
    } catch { err('No se pudo cerrar el período.'); }
  };

  const handleEliminar = async (periodo) => {
    if (!await confirm(`¿Eliminar el período ${MESES[periodo.mes - 1]} ${periodo.anio}? Se eliminarán todas sus liquidaciones.`)) return;
    try {
      await nominaRepository.eliminarPeriodo(periodo.id);
      setPeriodos(prev => prev.filter(p => p.id !== periodo.id));
      ok('Período eliminado.');
    } catch { err('No se pudo eliminar.'); }
  };

  const handleAutoLiquidar = async (periodoId) => {
    try {
      const { data } = await nominaRepository.autoLiquidar(periodoId, { soloActivos: true });
      cargar();
      ok(`${data.length} liquidaciones procesadas.`);
      return data;
    } catch { err('Error al auto-liquidar.'); return null; }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>Año</InputLabel>
          <Select value={anioFiltro} label="Año" onChange={e => setAnioFiltro(e.target.value)}>
            {ANIOS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </Select>
        </FormControl>
        {puedo('talento_humano', 'editar') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialOpen(true)}>
            Nuevo período
          </Button>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
          {periodos.length} período{periodos.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {cargando && (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
      )}

      {!cargando && periodos.length === 0 && (
        <Box sx={{ py: 8, textAlign: 'center', border: '1.5px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <Typography color="text.secondary">No hay períodos de nómina para {anioFiltro}</Typography>
          {puedo('talento_humano', 'editar') && (
            <Button variant="contained" startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={() => setDialOpen(true)}>
              Crear primer período
            </Button>
          )}
        </Box>
      )}

      {periodos.map(p => (
        <PeriodoCard
          key={p.id}
          periodo={p}
          puedeEditar={puedo('talento_humano', 'editar')}
          onCerrar={handleCerrar}
          onEliminar={handleEliminar}
          onAutoLiquidar={handleAutoLiquidar}
        />
      ))}

      <NuevoPeriodoDialog
        open={dialOpen}
        onClose={() => setDialOpen(false)}
        onCreado={handleCreado}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(p => ({ ...p, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, DialogActions,
  DialogContent, DialogTitle, FormControl, FormHelperText, IconButton, InputLabel,
  MenuItem, Paper, Select, Snackbar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import Dialog from '@/shared/components/DialogResponsive';
import AddIcon          from '@mui/icons-material/Add';
import AutorenewIcon    from '@mui/icons-material/Autorenew';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import DeleteIcon       from '@mui/icons-material/Delete';
import ExpandMoreIcon   from '@mui/icons-material/ExpandMore';
import ExpandLessIcon   from '@mui/icons-material/ExpandLess';
import EditIcon         from '@mui/icons-material/Edit';
import DownloadIcon     from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { nominaRepository } from '@/infrastructure/repositories/nominaRepository';
import { useConfirm } from '@/shared/components/useConfirm';
import { useToast } from '@/shared/context/useToast';
import { mensajeErrorApi }  from '@/shared/utils/mensajeErrorApi';
import { r }                from '@/shared/utils/validacion';
import { useValidacion }    from '@/shared/hooks/useValidacion';
import ResumenErrores       from '@/shared/components/ResumenErrores';
import { colorEstado }      from '@/shared/theme/paleta';
import { useConfiguracion } from '@/shared/context/useConfiguracion';
import { EditarLiquidacionDialog } from './EditarLiquidacionDialog';
import { MESES, fmtCOP } from './nominaFormato';
import { exportarNominaExcel, generarDesprendiblesPDF } from './exportarNomina';

const ANIOS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

function EstadoChip({ estado }) {
  const theme = useTheme();
  const tono  = colorEstado(estado === 'cerrado' ? 'exito' : 'aviso', theme.palette.mode);
  return (
    <Chip
      label={estado === 'cerrado' ? 'Cerrado' : 'Borrador'}
      size="small"
      sx={{
        fontWeight: 700, fontSize: '0.7rem',
        bgcolor: tono.fondo,
        color:   tono.texto,
      }}
    />
  );
}

function FilaLiquidacion({ liq, puedeEditar, onEditar, onEliminar, onDesprendible }) {
  return (
    <TableRow hover>
      <TableCell sx={{ fontSize: '0.8rem' }}>
        <Typography sx={{ fontWeight: 600, fontSize: 'inherit' }}>{liq.empleadoNombre}</Typography>
        {liq.cargo && <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{liq.cargo}</Typography>}
      </TableCell>
      <TableCell align="right" sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{fmtCOP(liq.salarioBase)}</TableCell>
      <TableCell align="right" sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{fmtCOP(liq.auxilioTransporte)}</TableCell>
      <TableCell align="right" sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{fmtCOP(liq.totalDevengado)}</TableCell>
      <TableCell align="right" sx={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'error.main' }}>{fmtCOP(liq.totalDeducciones)}</TableCell>
      <TableCell align="right" sx={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700, color: 'success.main' }}>{fmtCOP(liq.netoPagar)}</TableCell>
      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        <Tooltip title="Desprendible de pago (PDF)">
          <IconButton size="small" aria-label="Desprendible de pago" onClick={() => onDesprendible(liq)}>
            <PictureAsPdfIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {puedeEditar && (
          <Tooltip title="Editar liquidación">
            <IconButton size="small" color="primary" aria-label="Editar liquidación" onClick={() => onEditar(liq)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
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

function PeriodoCard({ periodo, puedeEditar, onCerrar, onEliminar, onAutoLiquidar, onCambio }) {
  const [expandido, setExpandido] = useState(false);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [cargandoLiq, setCargandoLiq] = useState(false);
  const [editando, setEditando] = useState(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const confirm = useConfirm();
  const toast   = useToast();
  const config  = useConfiguracion();

  const cargarLiq = useCallback(async () => {
    if (!expandido) return;
    setCargandoLiq(true);
    try {
      const { data } = await nominaRepository.listarLiquidaciones(periodo.id);
      setLiquidaciones(data);
    } catch (e) {
      toast(mensajeErrorApi(e, { accion: 'cargar las liquidaciones' }), 'error');
    } finally {
      setCargandoLiq(false);
    }
  }, [expandido, periodo.id, toast]);

  useEffect(() => { cargarLiq(); }, [cargarLiq]);

  const handleEliminarLiq = async (liq) => {
    if (!await confirm(`¿Eliminar liquidación de ${liq.empleadoNombre}?`)) return;
    try {
      await nominaRepository.eliminarLiquidacion(liq.id);
      setLiquidaciones(prev => prev.filter(l => l.id !== liq.id));
    } catch (e) {
      toast(mensajeErrorApi(e, { accion: 'eliminar la liquidación' }), 'error');
    }
  };

  const handleGuardada = (liq) => {
    setLiquidaciones(prev => prev.map(l => (l.id === liq.id ? liq : l)));
    setEditando(null);
    toast(`Liquidación de ${liq.empleadoNombre} actualizada.`, 'success');
    onCambio?.();
  };

  const handleDesprendibles = async (lista) => {
    setGenerandoPdf(true);
    try {
      await generarDesprendiblesPDF(periodo, lista, config);
    } catch (e) {
      console.error(e);
      toast('No se pudo generar el desprendible de pago. Intenta de nuevo.', 'error');
    } finally {
      setGenerandoPdf(false);
    }
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
          bgcolor: (t) => alpha(periodo.estado === 'cerrado' ? t.palette.success.main : t.palette.warning.main, 0.07),
          cursor: 'pointer', '&:hover': { bgcolor: (t) => alpha(periodo.estado === 'cerrado' ? t.palette.success.main : t.palette.warning.main, 0.15) },
        }}
        onClick={() => setExpandido(e => !e)}
      >
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>
            {MESES[periodo.mes - 1]} {periodo.anio}
          </Typography>
          <Typography sx={{ color: 'text.secondary' }} variant="caption">
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
            <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', py: 2, textAlign: 'center' }}>
              Sin liquidaciones. Usa el botón <AutorenewIcon fontSize="inherit" /> para auto-liquidar.
            </Typography>
          ) : (
            <>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end', mb: 1 }}>
              <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
                onClick={() => exportarNominaExcel(periodo, liquidaciones)}>
                Exportar Excel
              </Button>
              <Button size="small" variant="outlined" disabled={generandoPdf}
                startIcon={generandoPdf ? <CircularProgress size={14} color="inherit" /> : <PictureAsPdfIcon />}
                onClick={() => handleDesprendibles(liquidaciones)}>
                Desprendibles (todos)
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'superficie2' }}>
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
                      onEditar={setEditando}
                      onEliminar={handleEliminarLiq}
                      onDesprendible={liq => handleDesprendibles([liq])}
                    />
                  ))}
                  <TableRow sx={{ bgcolor: 'superficie2' }}>
                    <TableCell colSpan={5} sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Total nómina</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.82rem', fontFamily: 'monospace', color: 'success.main' }}>
                      {fmtCOP(totalNeto)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            </>
          )}
        </Box>
      )}

      <EditarLiquidacionDialog
        liquidacion={editando}
        onClose={() => setEditando(null)}
        onGuardada={handleGuardada}
      />
    </Paper>
  );
}

// Reglas del formulario de nuevo período
const ESQUEMA_PERIODO = {
  mes:  { etiqueta: 'Mes',         reglas: [r.seleccion('Julio')] },
  anio: { etiqueta: 'Año',         reglas: [r.seleccion(String(new Date().getFullYear()))] },
  obs:  { etiqueta: 'Observación', reglas: [r.texto({ max: 500 })] },
};

function NuevoPeriodoDialog({ open, onClose, onCreado }) {
  const mesActual = new Date().getMonth() + 1;
  const anioActual = new Date().getFullYear();
  const [mes,  setMes]  = useState(mesActual);
  const [anio, setAnio] = useState(anioActual);
  const [obs,  setObs]  = useState('');
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState('');
  const v = useValidacion(ESQUEMA_PERIODO, { mes, anio, obs });
  const { reiniciar } = v;

  useEffect(() => { if (open) reiniciar(); }, [open, reiniciar]);

  const handleGuardar = async () => {
    if (!v.validarTodo()) return;
    setGuardando(true); setErr('');
    try {
      const { data } = await nominaRepository.crearPeriodo({ mes, anio, observacion: obs || null });
      onCreado(data);
    } catch (e) {
      setErr(mensajeErrorApi(e, { accion: 'crear el período' }));
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
          <FormControl fullWidth size="small" error={!!v.err('mes')}>
            <InputLabel>Mes</InputLabel>
            <Select value={mes} label="Mes" onBlur={() => v.tocar('mes')} onChange={e => setMes(e.target.value)}>
              {MESES.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
            </Select>
            {v.err('mes') && <FormHelperText>{v.err('mes')}</FormHelperText>}
          </FormControl>
          <FormControl fullWidth size="small" error={!!v.err('anio')}>
            <InputLabel>Año</InputLabel>
            <Select value={anio} label="Año" onBlur={() => v.tocar('anio')} onChange={e => setAnio(e.target.value)}>
              {ANIOS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
            {v.err('anio') && <FormHelperText>{v.err('anio')}</FormHelperText>}
          </FormControl>
          <TextField
            size="small" label="Observación (opcional)" multiline rows={2}
            value={obs} onChange={e => setObs(e.target.value)} {...v.props('obs')}
          />
        </Box>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion="crear el período" />
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
    } catch (e) {
      err(mensajeErrorApi(e, { accion: 'cargar los períodos de nómina' }));
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
    } catch (e) { err(mensajeErrorApi(e, { accion: 'cerrar el período' })); }
  };

  const handleEliminar = async (periodo) => {
    if (!await confirm(`¿Eliminar el período ${MESES[periodo.mes - 1]} ${periodo.anio}? Se eliminarán todas sus liquidaciones.`)) return;
    try {
      await nominaRepository.eliminarPeriodo(periodo.id);
      setPeriodos(prev => prev.filter(p => p.id !== periodo.id));
      ok('Período eliminado.');
    } catch (e) { err(mensajeErrorApi(e, { accion: 'eliminar el período' })); }
  };

  const handleAutoLiquidar = async (periodoId) => {
    try {
      const { data } = await nominaRepository.autoLiquidar(periodoId, { soloActivos: true });
      cargar();
      ok(`${data.length} liquidaciones procesadas.`);
      return data;
    } catch (e) { err(mensajeErrorApi(e, { accion: 'auto-liquidar la nómina' })); return null; }
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
        <Typography variant="body2" sx={{ color: 'text.secondary', ml: 'auto' }}>
          {periodos.length} período{periodos.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {cargando && (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
      )}

      {!cargando && periodos.length === 0 && (
        <Box sx={{ py: 8, textAlign: 'center', border: '1.5px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <Typography sx={{ color: 'text.secondary' }}>No hay períodos de nómina para {anioFiltro}</Typography>
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
          onCambio={cargar}
        />
      ))}

      <NuevoPeriodoDialog
        open={dialOpen}
        onClose={() => setDialOpen(false)}
        onCreado={handleCreado}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={snack.sev === 'error' ? 8000 : 3500}
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

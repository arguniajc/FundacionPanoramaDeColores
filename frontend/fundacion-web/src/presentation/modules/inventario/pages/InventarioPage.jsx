import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Select, FormControl, InputLabel, IconButton, Tooltip,
  Chip, Avatar, Divider, CircularProgress, Snackbar, Alert, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  InputAdornment,
} from '@mui/material';
import AddIcon           from '@mui/icons-material/Add';
import EditIcon          from '@mui/icons-material/Edit';
import DeleteIcon        from '@mui/icons-material/Delete';
import SwapHorizIcon     from '@mui/icons-material/SwapHoriz';
import HistoryIcon       from '@mui/icons-material/History';
import Inventory2Icon    from '@mui/icons-material/Inventory2';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';
import TrendingUpIcon    from '@mui/icons-material/TrendingUp';
import SearchIcon        from '@mui/icons-material/Search';
import CloseIcon         from '@mui/icons-material/Close';
import { inventarioRepository } from '../../../../infrastructure/repositories/inventarioRepository';

const COLOR   = '#4E1B95';
const UNIDADES = ['unidad','kg','g','lt','ml','metro','caja','paquete','rollo','hoja','otro'];

function fmtNum(n) {
  const v = Number(n);
  return v % 1 === 0 ? v.toLocaleString('es-CO') : v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtFecha(d) {
  return new Date(d).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

function estadoStock(item) {
  if (item.stockActual <= 0)
    return { label: 'Sin stock', color: 'error', pct: 0 };
  if (item.stockMinimo > 0 && item.stockActual < item.stockMinimo)
    return { label: 'Stock bajo', color: 'warning', pct: Math.min(100, (item.stockActual / item.stockMinimo) * 100) };
  return { label: 'En stock', color: 'success', pct: item.stockMinimo > 0 ? Math.min(100, (item.stockActual / (item.stockMinimo * 2)) * 100) : 100 };
}

// ── Tarjeta de estadística ────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, loading }) {
  return (
    <Box sx={{
      border: '1.5px solid #e2d9f3', borderRadius: 2, p: 2.5,
      bgcolor: '#fdfbff', display: 'flex', alignItems: 'center', gap: 2,
    }}>
      <Box sx={{
        width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
        bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
      }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </Typography>
        {loading
          ? <CircularProgress size={18} sx={{ mt: 0.5 }} />
          : <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
              {value}
            </Typography>}
      </Box>
    </Box>
  );
}

// ── Tarjeta de artículo ───────────────────────────────────────────────────────
function ItemCard({ item, onMovimiento, onEditar, onEliminar, onHistorial }) {
  const est = estadoStock(item);
  const initials = item.nombre.slice(0, 2).toUpperCase();

  return (
    <Box sx={{
      border: '1.5px solid #e2d9f3', borderRadius: 2, overflow: 'hidden',
      bgcolor: '#fdfbff', display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 2, pb: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Avatar sx={{ bgcolor: COLOR, width: 40, height: 40, fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>
          {initials}
        </Avatar>
        <Box minWidth={0} flex={1}>
          <Typography fontWeight={800} sx={{ lineHeight: 1.3, fontSize: '0.92rem' }} noWrap title={item.nombre}>
            {item.nombre}
          </Typography>
          {item.codigo && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Código: {item.codigo}
            </Typography>
          )}
        </Box>
      </Box>

      <Divider />

      {/* Body */}
      <Box sx={{ px: 2, py: 1.8, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Stock */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.6 }}>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontWeight: 600 }}>
              Stock actual
            </Typography>
            <Chip
              label={est.label}
              color={est.color}
              size="small"
              sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
            />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color: 'text.primary', lineHeight: 1 }}>
            {fmtNum(item.stockActual)}
            <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 400, color: 'text.secondary', ml: 0.5 }}>
              {item.unidadMedida}
            </Typography>
          </Typography>
          {item.stockMinimo > 0 && (
            <LinearProgress
              variant="determinate"
              value={est.pct}
              color={est.color}
              sx={{ mt: 0.8, height: 5, borderRadius: 3 }}
            />
          )}
        </Box>

        {/* Min stock + unit */}
        <Grid container spacing={1}>
          <Grid size={6}>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Mínimo</Typography>
            <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: 'text.primary' }}>
              {fmtNum(item.stockMinimo)} {item.unidadMedida}
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Unidad</Typography>
            <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: 'text.primary', textTransform: 'capitalize' }}>
              {item.unidadMedida}
            </Typography>
          </Grid>
        </Grid>

        {item.descripcion && (
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontStyle: 'italic' }} noWrap title={item.descripcion}>
            {item.descripcion}
          </Typography>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{
        px: 1.5, py: 1, bgcolor: 'rgba(78,27,149,0.04)',
        borderTop: '1.5px solid #e2d9f3',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Tooltip title="Registrar movimiento">
          <Button
            size="small"
            variant="contained"
            startIcon={<SwapHorizIcon />}
            onClick={() => onMovimiento(item)}
            sx={{ bgcolor: COLOR, fontWeight: 700, fontSize: '0.72rem', px: 1.2, '&:hover': { bgcolor: '#3b1270' } }}
          >
            Movimiento
          </Button>
        </Tooltip>
        <Box display="flex" gap={0.3}>
          <Tooltip title="Historial">
            <IconButton size="small" onClick={() => onHistorial(item)}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => onEditar(item)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => onEliminar(item)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

// ── Dialog: Nuevo / Editar artículo ──────────────────────────────────────────
const ITEM_VACIO = { codigo: '', nombre: '', descripcion: '', unidadMedida: 'unidad', stockActual: 0, stockMinimo: 0 };

function NuevoItemDialog({ open, item, onClose, onGuardado }) {
  const editando = !!item;
  const [form,       setForm]       = useState(ITEM_VACIO);
  const [guardando,  setGuardando]  = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    if (open) {
      setForm(item
        ? { codigo: item.codigo ?? '', nombre: item.nombre, descripcion: item.descripcion ?? '',
            unidadMedida: item.unidadMedida, stockActual: item.stockActual, stockMinimo: item.stockMinimo }
        : ITEM_VACIO);
      setError('');
    }
  }, [open, item]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    if (Number(form.stockMinimo) < 0) { setError('El stock mínimo no puede ser negativo.'); return; }
    if (!editando && Number(form.stockActual) < 0) { setError('El stock inicial no puede ser negativo.'); return; }
    setGuardando(true); setError('');
    try {
      let result;
      if (editando) {
        const { data } = await inventarioRepository.actualizarItem(item.id, {
          codigo: form.codigo || null, nombre: form.nombre, descripcion: form.descripcion || null,
          unidadMedida: form.unidadMedida, stockMinimo: Number(form.stockMinimo),
        });
        result = data;
      } else {
        const { data } = await inventarioRepository.crearItem({
          codigo: form.codigo || null, nombre: form.nombre, descripcion: form.descripcion || null,
          unidadMedida: form.unidadMedida,
          stockActual: Number(form.stockActual), stockMinimo: Number(form.stockMinimo),
        });
        result = data;
      }
      onGuardado(result, editando);
    } catch (e) {
      setError(e?.response?.data?.mensaje || 'Error al guardar el artículo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>
        {editando ? 'Editar artículo' : 'Nuevo artículo'}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={8}>
            <TextField fullWidth size="small" label="Nombre *" value={form.nombre}
              onChange={e => set('nombre', e.target.value)} />
          </Grid>
          <Grid size={4}>
            <TextField fullWidth size="small" label="Código" value={form.codigo}
              onChange={e => set('codigo', e.target.value)} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Descripción" multiline rows={2}
              value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </Grid>
          <Grid size={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Unidad</InputLabel>
              <Select value={form.unidadMedida} label="Unidad" onChange={e => set('unidadMedida', e.target.value)}>
                {UNIDADES.map(u => <MenuItem key={u} value={u} sx={{ textTransform: 'capitalize' }}>{u}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          {!editando && (
            <Grid size={4}>
              <TextField fullWidth size="small" label="Stock inicial" type="number"
                inputProps={{ min: 0, step: 1 }}
                value={form.stockActual} onChange={e => set('stockActual', e.target.value)} />
            </Grid>
          )}
          <Grid size={editando ? 8 : 4}>
            <TextField fullWidth size="small" label="Stock mínimo" type="number"
              inputProps={{ min: 0, step: 1 }}
              value={form.stockMinimo} onChange={e => set('stockMinimo', e.target.value)}
              helperText="Alerta cuando el stock baje de este valor" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}
          sx={{ bgcolor: COLOR, fontWeight: 700, '&:hover': { bgcolor: '#3b1270' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : editando ? 'Guardar cambios' : 'Crear artículo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Dialog: Registrar movimiento ──────────────────────────────────────────────
function RegistrarMovimientoDialog({ open, item, tipos, onClose, onRegistrado }) {
  const [form,      setForm]      = useState({ tipoMovimientoId: '', cantidad: '', motivo: '', donante: '' });
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const tipoSel = tipos.find(t => t.id === Number(form.tipoMovimientoId));
  const esDonacion = tipoSel?.codigo?.includes('DONACION');

  useEffect(() => {
    if (open) { setForm({ tipoMovimientoId: tipos[0]?.id ?? '', cantidad: '', motivo: '', donante: '' }); setError(''); }
  }, [open, tipos]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!form.tipoMovimientoId) { setError('Seleccione el tipo de movimiento.'); return; }
    const cant = Number(form.cantidad);
    if (!cant || cant <= 0) { setError('La cantidad debe ser mayor a cero.'); return; }
    setGuardando(true); setError('');
    try {
      const { data } = await inventarioRepository.registrarMovimiento({
        itemId: item.id,
        tipoMovimientoId: Number(form.tipoMovimientoId),
        cantidad: cant,
        motivo:  form.motivo || null,
        donante: form.donante || null,
      });
      onRegistrado(item.id, data.nuevoStock);
    } catch (e) {
      setError(e?.response?.data?.mensaje || 'Error al registrar el movimiento.');
    } finally {
      setGuardando(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>
        Registrar movimiento
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Artículo: <strong>{item.nombre}</strong> · Stock actual: <strong>{fmtNum(item.stockActual)} {item.unidadMedida}</strong>
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de movimiento *</InputLabel>
              <Select value={form.tipoMovimientoId} label="Tipo de movimiento *"
                onChange={e => set('tipoMovimientoId', e.target.value)}>
                {tipos.map(t => (
                  <MenuItem key={t.id} value={t.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        bgcolor: t.afectaStock === '+' ? '#16a34a' : '#dc2626',
                      }} />
                      {t.nombre}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label={`Cantidad *`} type="number"
              inputProps={{ min: 0.01, step: 1 }}
              value={form.cantidad} onChange={e => set('cantidad', e.target.value)}
              InputProps={{
                endAdornment: <InputAdornment position="end">{item.unidadMedida}</InputAdornment>,
              }}
            />
          </Grid>
          {esDonacion && tipoSel?.afectaStock === '+' && (
            <Grid size={12}>
              <TextField fullWidth size="small" label="Donante (nombre o empresa)"
                value={form.donante} onChange={e => set('donante', e.target.value)} />
            </Grid>
          )}
          <Grid size={12}>
            <TextField fullWidth size="small" label="Motivo / observación" multiline rows={2}
              value={form.motivo} onChange={e => set('motivo', e.target.value)} />
          </Grid>
          {tipoSel && (
            <Grid size={12}>
              <Box sx={{
                bgcolor: tipoSel.afectaStock === '+' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${tipoSel.afectaStock === '+' ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: 1.5, px: 2, py: 1,
              }}>
                <Typography sx={{ fontSize: '0.78rem', color: tipoSel.afectaStock === '+' ? '#15803d' : '#dc2626', fontWeight: 600 }}>
                  {tipoSel.afectaStock === '+'
                    ? `Nuevo stock estimado: ${fmtNum(Number(item.stockActual) + Number(form.cantidad || 0))} ${item.unidadMedida}`
                    : `Nuevo stock estimado: ${fmtNum(Math.max(0, Number(item.stockActual) - Number(form.cantidad || 0)))} ${item.unidadMedida}`}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}
          sx={{ bgcolor: COLOR, fontWeight: 700, '&:hover': { bgcolor: '#3b1270' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Dialog: Historial de movimientos ─────────────────────────────────────────
function HistorialDialog({ open, item, onClose }) {
  const [movs,     setMovs]     = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (open && item) {
      setCargando(true);
      inventarioRepository.listarMovimientos({ itemId: item.id })
        .then(r => setMovs(r.data))
        .catch(() => {})
        .finally(() => setCargando(false));
    }
  }, [open, item]);

  if (!item) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography fontWeight={800} color={COLOR}>Historial de movimientos</Typography>
          <Typography variant="caption" color="text.secondary">{item.nombre}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {cargando ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : movs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Sin movimientos registrados.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'rgba(78,27,149,0.06)' } }}>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell align="right">Stock resultante</TableCell>
                  <TableCell>Motivo / Donante</TableCell>
                  <TableCell>Usuario</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movs.map(m => (
                  <TableRow key={m.id} hover>
                    <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtFecha(m.fechaMovimiento)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: m.afectaStock === '+' ? '#16a34a' : '#dc2626' }} />
                        <Typography sx={{ fontSize: '0.78rem' }}>{m.nombreTipo}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: m.afectaStock === '+' ? '#16a34a' : '#dc2626' }}>
                        {m.afectaStock === '+' ? '+' : '-'}{fmtNum(m.cantidad)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                      {fmtNum(m.stockResultante)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', maxWidth: 180 }}>
                      <Typography noWrap sx={{ fontSize: '0.78rem' }} title={[m.motivo, m.donante].filter(Boolean).join(' · ')}>
                        {[m.donante && `Donante: ${m.donante}`, m.motivo].filter(Boolean).join(' · ') || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      {m.usuarioEmail ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function InventarioPage() {
  const [items,        setItems]        = useState([]);
  const [tipos,        setTipos]        = useState([]);
  const [stats,        setStats]        = useState({ totalItems: 0, stockBajo: 0, movimientosMes: 0 });
  const [cargando,     setCargando]     = useState(false);
  const [buscar,       setBuscar]       = useState('');
  const [dialItem,     setDialItem]     = useState({ open: false, item: null });
  const [dialMov,      setDialMov]      = useState({ open: false, item: null });
  const [dialHistorial,setDialHistorial]= useState({ open: false, item: null });
  const [snack,        setSnack]        = useState({ open: false, msg: '', sev: 'success' });
  const [eliminando,   setEliminando]   = useState(null);

  const ok  = (msg) => setSnack({ open: true, msg, sev: 'success' });
  const err = (msg) => setSnack({ open: true, msg, sev: 'error' });

  const cargarTodo = useCallback(async () => {
    setCargando(true);
    try {
      const [itemsRes, tiposRes, statsRes] = await Promise.all([
        inventarioRepository.listarItems(),
        inventarioRepository.listarTipos(),
        inventarioRepository.stats(),
      ]);
      setItems(itemsRes.data);
      setTipos(tiposRes.data);
      setStats(statsRes.data);
    } catch {
      err('No se pudo cargar el inventario.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  const cargarItems = useCallback(async (q) => {
    try {
      const { data } = await inventarioRepository.listarItems(q ? { buscar: q } : undefined);
      setItems(data);
    } catch {
      err('Error al buscar artículos.');
    }
  }, []);

  const recargarStats = async () => {
    try { const { data } = await inventarioRepository.stats(); setStats(data); } catch {}
  };

  // Búsqueda con debounce ligero
  useEffect(() => {
    const t = setTimeout(() => cargarItems(buscar), 280);
    return () => clearTimeout(t);
  }, [buscar, cargarItems]);

  const handleGuardado = (itemData, editando) => {
    if (editando) setItems(prev => prev.map(i => i.id === itemData.id ? itemData : i));
    else { setItems(prev => [itemData, ...prev]); recargarStats(); }
    setDialItem({ open: false, item: null });
    ok(editando ? 'Artículo actualizado.' : 'Artículo creado.');
  };

  const handleMovimientoRegistrado = (itemId, nuevoStock) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, stockActual: nuevoStock } : i));
    setDialMov({ open: false, item: null });
    recargarStats();
    ok('Movimiento registrado.');
  };

  const handleEliminar = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.nombre}"? Si tiene movimientos registrados quedará desactivado.`)) return;
    setEliminando(item.id);
    try {
      await inventarioRepository.eliminarItem(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      recargarStats();
      ok('Artículo eliminado.');
    } catch {
      err('No se pudo eliminar el artículo.');
    } finally {
      setEliminando(null);
    }
  };

  const filtrados = items; // El filtro lo maneja el backend vía búsqueda

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box sx={{ width: 4, height: 26, borderRadius: 1, bgcolor: COLOR }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>Inventario</Typography>
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', pl: 0.5 }}>
            Control de bienes, materiales y donaciones de la fundación
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialItem({ open: true, item: null })}
          sx={{ bgcolor: COLOR, fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#3b1270' } }}
        >
          Nuevo artículo
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            icon={<Inventory2Icon />} label="Total artículos"
            value={stats.totalItems} color={COLOR} loading={cargando}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            icon={<WarningAmberIcon />} label="Stock bajo"
            value={stats.stockBajo} color="#d97706" loading={cargando}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            icon={<TrendingUpIcon />} label="Movimientos este mes"
            value={stats.movimientosMes} color="#16a34a" loading={cargando}
          />
        </Grid>
      </Grid>

      {/* Búsqueda */}
      <Box sx={{ mb: 2.5 }}>
        <TextField
          size="small"
          placeholder="Buscar por nombre o código…"
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
            endAdornment: buscar
              ? <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setBuscar('')}><CloseIcon fontSize="small" /></IconButton>
                </InputAdornment>
              : null,
          }}
          sx={{ width: { xs: '100%', sm: 340 } }}
        />
      </Box>

      {/* Items grid */}
      {cargando && items.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
      ) : filtrados.length === 0 ? (
        <Box sx={{
          py: 8, textAlign: 'center', border: '1.5px dashed #e2d9f3',
          borderRadius: 2, bgcolor: '#fdfbff',
        }}>
          <Inventory2Icon sx={{ fontSize: 48, color: '#c8b4e8', mb: 1.5 }} />
          <Typography fontWeight={700} color="text.secondary">
            {buscar ? 'No se encontraron artículos' : 'No hay artículos en el inventario'}
          </Typography>
          {!buscar && (
            <Button
              variant="contained" startIcon={<AddIcon />} sx={{ mt: 2, bgcolor: COLOR, fontWeight: 700 }}
              onClick={() => setDialItem({ open: true, item: null })}
            >
              Agregar primer artículo
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2} alignItems="stretch">
          {filtrados.map(item => (
            <Grid key={item.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <ItemCard
                item={item}
                onMovimiento={i => setDialMov({ open: true, item: i })}
                onEditar={i => setDialItem({ open: true, item: i })}
                onEliminar={handleEliminar}
                onHistorial={i => setDialHistorial({ open: true, item: i })}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialogs */}
      <NuevoItemDialog
        open={dialItem.open}
        item={dialItem.item}
        onClose={() => setDialItem({ open: false, item: null })}
        onGuardado={handleGuardado}
      />
      <RegistrarMovimientoDialog
        open={dialMov.open}
        item={dialMov.item}
        tipos={tipos}
        onClose={() => setDialMov({ open: false, item: null })}
        onRegistrado={handleMovimientoRegistrado}
      />
      <HistorialDialog
        open={dialHistorial.open}
        item={dialHistorial.item}
        onClose={() => setDialHistorial({ open: false, item: null })}
      />

      {/* Snackbar */}
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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Grid, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Select, FormControl, InputLabel, IconButton, Tooltip,
  Chip, Avatar, Divider, CircularProgress, Snackbar, Alert, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  InputAdornment, Autocomplete,
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
import MoveDownIcon      from '@mui/icons-material/MoveDown';
import LocationOnIcon    from '@mui/icons-material/LocationOn';
import RemoveCircleIcon  from '@mui/icons-material/RemoveCircle';
import { inventarioRepository } from '../../../../infrastructure/repositories/inventarioRepository';
import { sedesRepository }      from '../../../../infrastructure/repositories/sedesRepository';

const COLOR = '#4E1B95';

const CATEGORIAS = [
  'Material escolar', 'Equipos electrónicos', 'Deportivo',
  'Ropa y calzado', 'Alimentos', 'Medicamentos',
  'Muebles y enseres', 'Herramientas', 'Otros',
];
const UNIDADES = ['unidad','kg','g','lt','ml','metro','caja','paquete','rollo','hoja','otro'];

const CAT_COLOR = {
  'Material escolar':    '#7c3aed',
  'Equipos electrónicos':'#0ea5e9',
  'Deportivo':           '#16a34a',
  'Ropa y calzado':      '#d97706',
  'Alimentos':           '#dc2626',
  'Medicamentos':        '#db2777',
  'Muebles y enseres':   '#64748b',
  'Herramientas':        '#92400e',
  'Otros':               '#6b7280',
};

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
    return { label: 'Stock bajo', color: 'warning', pct: Math.min(99, (item.stockActual / item.stockMinimo) * 100) };
  return {
    label: 'En stock', color: 'success',
    pct: item.stockMinimo > 0 ? Math.min(100, (item.stockActual / (item.stockMinimo * 2)) * 100) : 100,
  };
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, loading }) {
  return (
    <Box sx={{ border: '1.5px solid #e2d9f3', borderRadius: 2, p: 2.5, bgcolor: '#fdfbff', display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </Typography>
        {loading
          ? <CircularProgress size={18} sx={{ mt: 0.5 }} />
          : <Typography sx={{ fontSize: '1.55rem', fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>{value}</Typography>}
      </Box>
    </Box>
  );
}

// ── ItemCard ──────────────────────────────────────────────────────────────────
function ItemCard({ item, onMovimiento, onEditar, onEliminar, onHistorial, onTransferir }) {
  const est = estadoStock(item);
  const catColor = CAT_COLOR[item.categoria] ?? '#6b7280';

  return (
    <Box sx={{ border: '1.5px solid #e2d9f3', borderRadius: 2, overflow: 'hidden', bgcolor: '#fdfbff', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 2, pb: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Avatar sx={{ bgcolor: catColor, width: 40, height: 40, fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
          {item.nombre.slice(0, 2).toUpperCase()}
        </Avatar>
        <Box minWidth={0} flex={1}>
          <Typography fontWeight={800} sx={{ lineHeight: 1.3, fontSize: '0.92rem' }} noWrap title={item.nombre}>
            {item.nombre}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3, flexWrap: 'wrap' }}>
            {item.codigo && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>#{item.codigo}</Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* Body */}
      <Box sx={{ px: 2, py: 1.8, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.4 }}>
        {/* Categoría + sede */}
        <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap' }}>
          <Chip label={item.categoria} size="small"
            sx={{ bgcolor: `${catColor}15`, color: catColor, fontWeight: 700, fontSize: '0.68rem', height: 20 }} />
          {item.nombreSede && (
            <Chip icon={<LocationOnIcon sx={{ fontSize: '12px !important' }} />}
              label={item.nombreSede} size="small" variant="outlined"
              sx={{ fontSize: '0.68rem', height: 20, borderColor: '#d9c9f5', color: 'text.secondary' }} />
          )}
        </Box>

        {/* Stock */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}>Stock actual</Typography>
            <Chip label={est.label} color={est.color} size="small"
              sx={{ fontWeight: 700, fontSize: '0.68rem', height: 20 }} />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: 'text.primary', lineHeight: 1 }}>
            {fmtNum(item.stockActual)}
            <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 400, color: 'text.secondary', ml: 0.5 }}>
              {item.unidadMedida}
            </Typography>
          </Typography>
          {item.stockMinimo > 0 && (
            <LinearProgress variant="determinate" value={est.pct} color={est.color}
              sx={{ mt: 0.7, height: 4, borderRadius: 3 }} />
          )}
        </Box>

        {/* Min + unidad */}
        <Grid container spacing={1}>
          <Grid size={6}>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Mínimo</Typography>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>
              {fmtNum(item.stockMinimo)} {item.unidadMedida}
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Unidad</Typography>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'capitalize' }}>
              {item.unidadMedida}
            </Typography>
          </Grid>
        </Grid>

        {item.descripcion && (
          <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary', fontStyle: 'italic' }} noWrap title={item.descripcion}>
            {item.descripcion}
          </Typography>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ px: 1.5, py: 1, bgcolor: 'rgba(78,27,149,0.04)', borderTop: '1.5px solid #e2d9f3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button size="small" variant="contained" startIcon={<SwapHorizIcon />} onClick={() => onMovimiento(item)}
          sx={{ bgcolor: COLOR, fontWeight: 700, fontSize: '0.7rem', px: 1, '&:hover': { bgcolor: '#3b1270' } }}>
          Movimiento
        </Button>
        <Box display="flex" gap={0.3}>
          <Tooltip title="Transferir a otra sede">
            <IconButton size="small" onClick={() => onTransferir(item)} sx={{ color: '#0ea5e9' }}>
              <MoveDownIcon fontSize="small" />
            </IconButton>
          </Tooltip>
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
const ITEM_VACIO = { codigo: '', nombre: '', descripcion: '', unidadMedida: 'unidad', categoria: 'Otros', stockActual: 0, stockMinimo: 0 };

function NuevoItemDialog({ open, item, sedes, sedeSelId, onClose, onGuardado }) {
  const editando = !!item;
  const [form,      setForm]      = useState(ITEM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (open) {
      setForm(item
        ? { codigo: item.codigo ?? '', nombre: item.nombre, descripcion: item.descripcion ?? '',
            unidadMedida: item.unidadMedida, categoria: item.categoria, stockActual: item.stockActual, stockMinimo: item.stockMinimo }
        : { ...ITEM_VACIO, sedeId: sedeSelId ?? '' });
      setError('');
    }
  }, [open, item, sedeSelId]);

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
          unidadMedida: form.unidadMedida, categoria: form.categoria,
          stockMinimo: Number(form.stockMinimo),
        });
        result = data;
      } else {
        const { data } = await inventarioRepository.crearItem({
          sedeId: form.sedeId || null,
          codigo: form.codigo || null, nombre: form.nombre, descripcion: form.descripcion || null,
          unidadMedida: form.unidadMedida, categoria: form.categoria,
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
          {!editando && (
            <Grid size={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Sede *</InputLabel>
                <Select value={form.sedeId ?? ''} label="Sede *" onChange={e => set('sedeId', e.target.value)}>
                  {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid size={8}>
            <TextField fullWidth size="small" label="Nombre *" value={form.nombre}
              onChange={e => set('nombre', e.target.value)} />
          </Grid>
          <Grid size={4}>
            <TextField fullWidth size="small" label="Código" value={form.codigo}
              onChange={e => set('codigo', e.target.value)} />
          </Grid>
          <Grid size={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Categoría</InputLabel>
              <Select value={form.categoria} label="Categoría" onChange={e => set('categoria', e.target.value)}>
                {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Unidad</InputLabel>
              <Select value={form.unidadMedida} label="Unidad" onChange={e => set('unidadMedida', e.target.value)}>
                {UNIDADES.map(u => <MenuItem key={u} value={u} sx={{ textTransform: 'capitalize' }}>{u}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Descripción" multiline rows={2}
              value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </Grid>
          {!editando && (
            <Grid size={6}>
              <TextField fullWidth size="small" label="Stock inicial" type="number"
                inputProps={{ min: 0, step: 1 }} value={form.stockActual}
                onChange={e => set('stockActual', e.target.value)} />
            </Grid>
          )}
          <Grid size={editando ? 12 : 6}>
            <TextField fullWidth size="small" label="Stock mínimo" type="number"
              inputProps={{ min: 0, step: 1 }} value={form.stockMinimo}
              onChange={e => set('stockMinimo', e.target.value)}
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
  const [form,      setForm]      = useState({ tipoMovimientoId: '', cantidad: '', motivo: '', donante: '', donanteObj: null, buscandoDonante: false });
  const [donantes,  setDonantes]  = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');
  const buscarTimer = useRef(null);

  // Excluir los tipos de transferencia del movimiento manual
  const tiposFiltrados = tipos.filter(t => !t.codigo.startsWith('TRANSFERENCIA'));
  const tipoSel = tiposFiltrados.find(t => t.id === Number(form.tipoMovimientoId));
  const esDonacionRecibida = tipoSel?.codigo === 'DONACION_RECIBIDA';

  useEffect(() => {
    if (open) {
      setForm({ tipoMovimientoId: tiposFiltrados[0]?.id ?? '', cantidad: '', motivo: '', donante: '', donanteObj: null, buscandoDonante: false });
      setDonantes([]);
      setError('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const buscarDonantes = (texto) => {
    clearTimeout(buscarTimer.current);
    if (!texto || texto.length < 2) { setDonantes([]); return; }
    set('buscandoDonante', true);
    buscarTimer.current = setTimeout(async () => {
      try {
        const { data } = await inventarioRepository.buscarDonantes(texto);
        setDonantes(data);
      } catch {} finally {
        set('buscandoDonante', false);
      }
    }, 280);
  };

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
        motivo:    form.motivo || null,
        donante:   form.donanteObj ? form.donanteObj.nombre : (form.donante || null),
        donanteId: form.donanteObj?.id ?? null,
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
      <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>Registrar movimiento</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          <strong>{item.nombre}</strong> · Stock: <strong>{fmtNum(item.stockActual)} {item.unidadMedida}</strong>
          {item.nombreSede && <> · <strong>{item.nombreSede}</strong></>}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de movimiento *</InputLabel>
              <Select value={form.tipoMovimientoId} label="Tipo de movimiento *"
                onChange={e => set('tipoMovimientoId', e.target.value)}>
                {tiposFiltrados.map(t => (
                  <MenuItem key={t.id} value={t.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: t.afectaStock === '+' ? '#16a34a' : '#dc2626' }} />
                      {t.nombre}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Cantidad *" type="number"
              inputProps={{ min: 0.01, step: 1 }} value={form.cantidad}
              onChange={e => set('cantidad', e.target.value)}
              InputProps={{ endAdornment: <InputAdornment position="end">{item.unidadMedida}</InputAdornment> }}
            />
          </Grid>
          {esDonacionRecibida && (
            <Grid size={12}>
              <Autocomplete
                freeSolo
                size="small"
                options={donantes}
                getOptionLabel={d => typeof d === 'string' ? d : `${d.nombre}${d.documento ? ` (${d.documento})` : ''}`}
                loading={form.buscandoDonante}
                onInputChange={(_, v) => { set('donante', v); buscarDonantes(v); }}
                onChange={(_, v) => set('donanteObj', typeof v === 'object' ? v : null)}
                renderInput={params => (
                  <TextField {...params} label="Donante" placeholder="Buscar donante o escribir nombre…"
                    InputProps={{ ...params.InputProps, endAdornment: form.buscandoDonante ? <CircularProgress size={16} /> : params.InputProps.endAdornment }} />
                )}
              />
            </Grid>
          )}
          <Grid size={12}>
            <TextField fullWidth size="small" label="Motivo / observación" multiline rows={2}
              value={form.motivo} onChange={e => set('motivo', e.target.value)} />
          </Grid>
          {tipoSel && form.cantidad && (
            <Grid size={12}>
              <Box sx={{
                bgcolor: tipoSel.afectaStock === '+' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${tipoSel.afectaStock === '+' ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: 1.5, px: 2, py: 1,
              }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: tipoSel.afectaStock === '+' ? '#15803d' : '#dc2626' }}>
                  Stock resultante estimado:{' '}
                  {tipoSel.afectaStock === '+'
                    ? fmtNum(Number(item.stockActual) + Number(form.cantidad || 0))
                    : fmtNum(Math.max(0, Number(item.stockActual) - Number(form.cantidad || 0)))
                  } {item.unidadMedida}
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

// ── Dialog: Transferencia entre sedes ────────────────────────────────────────
function TransferenciaDialog({ open, item, sedes, onClose, onTransferida }) {
  const [form,      setForm]      = useState({ sedeDestinoId: '', cantidad: '', motivo: '' });
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const sedesDestino = sedes.filter(s => s.id !== item?.sedeId);

  useEffect(() => {
    if (open) { setForm({ sedeDestinoId: sedesDestino[0]?.id ?? '', cantidad: '', motivo: '' }); setError(''); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!form.sedeDestinoId) { setError('Seleccione la sede destino.'); return; }
    const cant = Number(form.cantidad);
    if (!cant || cant <= 0) { setError('La cantidad debe ser mayor a cero.'); return; }
    setGuardando(true); setError('');
    try {
      const { data } = await inventarioRepository.transferir({
        itemOrigenId: item.id,
        sedeDestinoId: form.sedeDestinoId,
        cantidad: cant,
        motivo: form.motivo || null,
      });
      onTransferida(data);
    } catch (e) {
      setError(e?.response?.data?.mensaje || 'Error al realizar la transferencia.');
    } finally {
      setGuardando(false);
    }
  };

  if (!item) return null;

  const sedeDest = sedes.find(s => s.id === form.sedeDestinoId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: '#0ea5e9' }}>Transferir a otra sede</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          <strong>{item.nombre}</strong> · Stock: <strong>{fmtNum(item.stockActual)} {item.unidadMedida}</strong>
          {item.nombreSede && <> · Origen: <strong>{item.nombreSede}</strong></>}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Sede destino *</InputLabel>
              <Select value={form.sedeDestinoId} label="Sede destino *"
                onChange={e => set('sedeDestinoId', e.target.value)}>
                {sedesDestino.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Cantidad *" type="number"
              inputProps={{ min: 0.01, step: 1 }} value={form.cantidad}
              onChange={e => set('cantidad', e.target.value)}
              InputProps={{ endAdornment: <InputAdornment position="end">{item.unidadMedida}</InputAdornment> }}
            />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Motivo (opcional)" value={form.motivo}
              onChange={e => set('motivo', e.target.value)} />
          </Grid>
          {form.cantidad > 0 && sedeDest && (
            <Grid size={12}>
              <Box sx={{ bgcolor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 1.5, px: 2, py: 1 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#1d4ed8' }}>
                  {item.nombreSede || 'Origen'} → {sedeDest.nombre}: {fmtNum(form.cantidad)} {item.unidadMedida}
                </Typography>
                <Typography sx={{ fontSize: '0.73rem', color: '#3b82f6' }}>
                  Si el artículo no existe en la sede destino, se creará automáticamente.
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}
          sx={{ bgcolor: '#0ea5e9', fontWeight: 700, '&:hover': { bgcolor: '#0284c7' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : 'Transferir'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Dialog: Historial ─────────────────────────────────────────────────────────
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
          <Typography variant="caption" color="text.secondary">{item.nombre} · {item.nombreSede}</Typography>
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
                  <TableCell align="right">Stock result.</TableCell>
                  <TableCell>Donante / Sede destino</TableCell>
                  <TableCell>Motivo</TableCell>
                  <TableCell>Usuario</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movs.map(m => (
                  <TableRow key={m.id} hover>
                    <TableCell sx={{ fontSize: '0.76rem', whiteSpace: 'nowrap' }}>{fmtFecha(m.fechaMovimiento)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: m.afectaStock === '+' ? '#16a34a' : '#dc2626' }} />
                        <Typography sx={{ fontSize: '0.76rem' }}>{m.nombreTipo}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: m.afectaStock === '+' ? '#16a34a' : '#dc2626' }}>
                        {m.afectaStock === '+' ? '+' : '-'}{fmtNum(m.cantidad)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      {fmtNum(m.stockResultante)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.76rem' }}>
                      {m.nombreDonante || (m.nombreSedeDestino && `→ ${m.nombreSedeDestino}`) || (m.donante) || '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.76rem', maxWidth: 140 }}>
                      <Typography noWrap sx={{ fontSize: '0.76rem' }} title={m.motivo}>{m.motivo || '—'}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
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
  const [sedes,        setSedes]        = useState([]);
  const [sedeSel,      setSedeSel]      = useState('');
  const [categoriaFil, setCategoriaFil] = useState('');
  const [items,        setItems]        = useState([]);
  const [tipos,        setTipos]        = useState([]);
  const [stats,        setStats]        = useState({ totalItems: 0, stockBajo: 0, movimientosMes: 0, sinStock: 0 });
  const [cargando,     setCargando]     = useState(false);
  const [buscar,       setBuscar]       = useState('');
  const [dialItem,     setDialItem]     = useState({ open: false, item: null });
  const [dialMov,      setDialMov]      = useState({ open: false, item: null });
  const [dialTransf,   setDialTransf]   = useState({ open: false, item: null });
  const [dialHistorial,setDialHistorial]= useState({ open: false, item: null });
  const [snack,        setSnack]        = useState({ open: false, msg: '', sev: 'success' });

  const ok  = msg => setSnack({ open: true, msg, sev: 'success' });
  const err = msg => setSnack({ open: true, msg, sev: 'error' });

  // Cargar sedes y tipos (una sola vez)
  useEffect(() => {
    sedesRepository.listar({ soloActivas: true })
      .then(r => {
        const lista = r.data;
        setSedes(lista);
        if (lista.length > 0) setSedeSel(lista[0].id);
      })
      .catch(() => err('No se pudieron cargar las sedes.'));

    inventarioRepository.listarTipos()
      .then(r => setTipos(r.data))
      .catch(() => {});
  }, []);

  // Cargar items + stats cuando cambia sede, búsqueda o categoría
  const cargarItems = useCallback(async (params) => {
    setCargando(true);
    try {
      const [itemsRes, statsRes] = await Promise.all([
        inventarioRepository.listarItems(params),
        inventarioRepository.stats(params.sedeId ? { sedeId: params.sedeId } : {}),
      ]);
      setItems(itemsRes.data);
      setStats(statsRes.data);
    } catch {
      err('No se pudieron cargar los artículos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = {};
      if (sedeSel)      params.sedeId    = sedeSel;
      if (buscar)       params.buscar    = buscar;
      if (categoriaFil) params.categoria = categoriaFil;
      cargarItems(params);
    }, 260);
    return () => clearTimeout(t);
  }, [sedeSel, buscar, categoriaFil, cargarItems]);

  const recargarStats = async () => {
    try {
      const { data } = await inventarioRepository.stats(sedeSel ? { sedeId: sedeSel } : {});
      setStats(data);
    } catch {}
  };

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

  const handleTransferida = (data) => {
    // Actualizar stock del item origen en la lista actual
    setItems(prev => prev.map(i => i.id === data.itemOrigenId ? { ...i, stockActual: data.nuevoStockOrigen } : i));
    // Si el item destino también está visible (misma sede), actualizarlo o recargarlo
    const tieneDestino = items.find(i => i.id === data.itemDestinoId);
    if (tieneDestino)
      setItems(prev => prev.map(i => i.id === data.itemDestinoId ? { ...i, stockActual: data.nuevoStockDestino } : i));
    setDialTransf({ open: false, item: null });
    recargarStats();
    ok('Transferencia realizada.');
  };

  const handleEliminar = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.nombre}"? Si tiene movimientos quedará desactivado.`)) return;
    try {
      await inventarioRepository.eliminarItem(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      recargarStats();
      ok('Artículo eliminado.');
    } catch {
      err('No se pudo eliminar el artículo.');
    }
  };

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
            Control de bienes, materiales y donaciones por sede
          </Typography>
        </Box>
        <Button
          variant="contained" startIcon={<AddIcon />}
          onClick={() => setDialItem({ open: true, item: null })}
          sx={{ bgcolor: COLOR, fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#3b1270' } }}
        >
          Nuevo artículo
        </Button>
      </Box>

      {/* Selector de sede */}
      <Box sx={{ mb: 2.5 }}>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>Sede</InputLabel>
          <Select value={sedeSel} label="Sede" onChange={e => { setSedeSel(e.target.value); setBuscar(''); setCategoriaFil(''); }}>
            <MenuItem value="">Todas las sedes</MenuItem>
            {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={<Inventory2Icon />} label="Total artículos" value={stats.totalItems} color={COLOR} loading={cargando} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={<WarningAmberIcon />} label="Stock bajo" value={stats.stockBajo} color="#d97706" loading={cargando} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={<RemoveCircleIcon />} label="Sin stock" value={stats.sinStock} color="#dc2626" loading={cargando} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={<TrendingUpIcon />} label="Movimientos mes" value={stats.movimientosMes} color="#16a34a" loading={cargando} />
        </Grid>
      </Grid>

      {/* Filtros */}
      <Box sx={{ mb: 2.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Buscar por nombre o código…"
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>,
            endAdornment: buscar ? <InputAdornment position="end"><IconButton size="small" onClick={() => setBuscar('')}><CloseIcon fontSize="small" /></IconButton></InputAdornment> : null,
          }}
          sx={{ width: { xs: '100%', sm: 300 } }}
        />
        <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap' }}>
          <Chip
            label="Todas"
            onClick={() => setCategoriaFil('')}
            variant={categoriaFil === '' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', ...(categoriaFil === '' ? { bgcolor: COLOR, color: '#fff' } : {}) }}
          />
          {CATEGORIAS.map(cat => (
            <Chip
              key={cat}
              label={cat}
              onClick={() => setCategoriaFil(p => p === cat ? '' : cat)}
              variant={categoriaFil === cat ? 'filled' : 'outlined'}
              sx={{
                fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer',
                ...(categoriaFil === cat ? { bgcolor: CAT_COLOR[cat] ?? COLOR, color: '#fff' } : { borderColor: `${CAT_COLOR[cat]}80`, color: CAT_COLOR[cat] }),
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Grid de artículos */}
      {cargando && items.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center', border: '1.5px dashed #e2d9f3', borderRadius: 2, bgcolor: '#fdfbff' }}>
          <Inventory2Icon sx={{ fontSize: 48, color: '#c8b4e8', mb: 1.5 }} />
          <Typography fontWeight={700} color="text.secondary">
            {buscar || categoriaFil ? 'No se encontraron artículos con ese filtro' : 'No hay artículos en esta sede'}
          </Typography>
          {!buscar && !categoriaFil && (
            <Button variant="contained" startIcon={<AddIcon />}
              sx={{ mt: 2, bgcolor: COLOR, fontWeight: 700 }}
              onClick={() => setDialItem({ open: true, item: null })}>
              Agregar primer artículo
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2} alignItems="stretch">
          {items.map(item => (
            <Grid key={item.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <ItemCard
                item={item}
                onMovimiento={i => setDialMov({ open: true, item: i })}
                onEditar={i => setDialItem({ open: true, item: i })}
                onEliminar={handleEliminar}
                onHistorial={i => setDialHistorial({ open: true, item: i })}
                onTransferir={i => setDialTransf({ open: true, item: i })}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialogs */}
      <NuevoItemDialog
        open={dialItem.open} item={dialItem.item} sedes={sedes} sedeSelId={sedeSel}
        onClose={() => setDialItem({ open: false, item: null })}
        onGuardado={handleGuardado}
      />
      <RegistrarMovimientoDialog
        open={dialMov.open} item={dialMov.item} tipos={tipos}
        onClose={() => setDialMov({ open: false, item: null })}
        onRegistrado={handleMovimientoRegistrado}
      />
      <TransferenciaDialog
        open={dialTransf.open} item={dialTransf.item} sedes={sedes}
        onClose={() => setDialTransf({ open: false, item: null })}
        onTransferida={handleTransferida}
      />
      <HistorialDialog
        open={dialHistorial.open} item={dialHistorial.item}
        onClose={() => setDialHistorial({ open: false, item: null })}
      />

      <Snackbar open={snack.open} autoHideDuration={3500}
        onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(p => ({ ...p, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

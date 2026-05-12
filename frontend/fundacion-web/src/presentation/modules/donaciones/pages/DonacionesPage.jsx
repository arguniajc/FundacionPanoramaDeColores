import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Select, FormControl, InputLabel, IconButton, Tooltip,
  Chip, CircularProgress, Snackbar, Alert, InputAdornment, Autocomplete,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import AddIcon              from '@mui/icons-material/Add';
import DeleteIcon           from '@mui/icons-material/Delete';
import CloseIcon            from '@mui/icons-material/Close';
import AttachMoneyIcon      from '@mui/icons-material/AttachMoney';
import Inventory2Icon       from '@mui/icons-material/Inventory2';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import TrendingUpIcon       from '@mui/icons-material/TrendingUp';
import { donacionesRepository } from '../../../../infrastructure/repositories/donacionesRepository';
import { donantesRepository }   from '../../../../infrastructure/repositories/donantesRepository';
import { sedesRepository }      from '../../../../infrastructure/repositories/sedesRepository';
import { inventarioRepository } from '../../../../infrastructure/repositories/inventarioRepository';

const COLOR         = '#d97706';
const COLOR_ESPECIE = '#0ea5e9';

function fmtMoney(n) {
  return Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}
function fmtFecha(d) {
  return new Date(d).toLocaleDateString('es-CO', { dateStyle: 'medium' });
}
function hoy() {
  return new Date().toISOString().slice(0, 10);
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, loading }) {
  return (
    <Box sx={{ border: '1.5px solid #fde68a', borderRadius: 2, p: 2.5, bgcolor: '#fffbf0', display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </Typography>
        {loading
          ? <CircularProgress size={18} sx={{ mt: 0.5 }} />
          : <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>{value}</Typography>}
      </Box>
    </Box>
  );
}

// ── NuevaDonacionDialog ───────────────────────────────────────────────────────
const VACIO = {
  tipo: 'dinero',
  monto: '',
  reciboNumero: '',
  nombreItem: '',
  cantidad: '',
  unidadMedida: '',
  sedeId: '',
  programaId: '',
  descripcion: '',
  fechaDonacion: hoy(),
};

function NuevaDonacionDialog({ open, donanteInicial, onClose, onGuardada, sedes }) {
  const [donante,   setDonante]   = useState(null);
  const [form,      setForm]      = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');
  const [programas, setProgramas] = useState([]);
  const [opsDonante, setOpsDonante] = useState([]);
  const [buscandoD,  setBuscandoD]  = useState(false);
  const [opsItem,    setOpsItem]    = useState([]);
  const [buscandoI,  setBuscandoI]  = useState(false);
  const [itemSel,    setItemSel]    = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({ ...VACIO, fechaDonacion: hoy() });
    setError('');
    setItemSel(null);
    setOpsItem([]);
    if (donanteInicial) {
      setDonante(donanteInicial);
      setOpsDonante([donanteInicial]);
    } else {
      setDonante(null);
      setOpsDonante([]);
    }
  }, [open, donanteInicial]);

  useEffect(() => {
    if (!form.sedeId) { setProgramas([]); return; }
    sedesRepository.listarProgramas(form.sedeId)
      .then(({ data }) => setProgramas(data))
      .catch(() => setProgramas([]));
  }, [form.sedeId]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setSedeId = v => setForm(p => ({ ...p, sedeId: v, programaId: '' }));

  const buscarDonantes = useCallback(async (q) => {
    if (!q) return;
    setBuscandoD(true);
    try {
      const { data } = await donantesRepository.listar({ buscar: q });
      setOpsDonante(data.map(d => ({ id: d.id, nombre: d.nombre })));
    } catch {} finally { setBuscandoD(false); }
  }, []);

  const buscarItems = useCallback(async (q) => {
    if (!q) return;
    setBuscandoI(true);
    try {
      const { data } = await inventarioRepository.listarItems({ buscar: q });
      setOpsItem(data);
    } catch {} finally { setBuscandoI(false); }
  }, []);

  const guardar = async () => {
    if (!donante) { setError('Debe seleccionar un donante.'); return; }
    if (form.tipo === 'dinero' && (!form.monto || Number(form.monto) <= 0)) {
      setError('El monto es obligatorio para donaciones en dinero.'); return;
    }
    if (form.tipo === 'especie' && (!form.cantidad || Number(form.cantidad) <= 0)) {
      setError('La cantidad es obligatoria.'); return;
    }
    if (form.tipo === 'especie' && !itemSel && !form.nombreItem.trim()) {
      setError('Debe indicar el artículo o su nombre.'); return;
    }
    setGuardando(true); setError('');
    try {
      const payload = {
        donanteId:    donante.id,
        tipo:         form.tipo,
        monto:        form.tipo === 'dinero' ? Number(form.monto) : null,
        reciboNumero: form.reciboNumero.trim() || null,
        itemId:       itemSel?.id ?? null,
        nombreItem:   itemSel ? null : (form.nombreItem.trim() || null),
        cantidad:     form.tipo === 'especie' ? Number(form.cantidad) : null,
        unidadMedida: form.unidadMedida.trim() || null,
        sedeId:       form.sedeId || null,
        programaId:   form.programaId || null,
        descripcion:  form.descripcion.trim() || null,
        fechaDonacion: form.fechaDonacion || hoy(),
      };
      const { data } = await donacionesRepository.crear(payload);
      onGuardada(data);
    } catch (e) {
      setError(e?.response?.data?.mensaje || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>Nueva donación</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>

          {/* Donante */}
          <Grid size={12}>
            <Autocomplete
              options={opsDonante}
              getOptionLabel={o => o.nombre ?? ''}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              value={donante}
              onChange={(_, v) => setDonante(v)}
              onInputChange={(_, v, reason) => { if (reason === 'input') buscarDonantes(v); }}
              loading={buscandoD}
              noOptionsText="Escriba para buscar…"
              renderInput={p => (
                <TextField {...p} size="small" label="Donante *"
                  InputProps={{ ...p.InputProps, endAdornment: <>{buscandoD && <CircularProgress size={16} />}{p.InputProps.endAdornment}</> }}
                />
              )}
            />
          </Grid>

          {/* Tipo */}
          <Grid size={12}>
            <ToggleButtonGroup value={form.tipo} exclusive size="small"
              onChange={(_, v) => v && set('tipo', v)}
              sx={{ width: '100%' }}>
              <ToggleButton value="dinero" sx={{ flex: 1, fontWeight: 700 }}>
                <AttachMoneyIcon sx={{ fontSize: 17, mr: 0.5 }} /> Dinero
              </ToggleButton>
              <ToggleButton value="especie" sx={{ flex: 1, fontWeight: 700 }}>
                <Inventory2Icon sx={{ fontSize: 17, mr: 0.5 }} /> En especie
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {/* Dinero */}
          {form.tipo === 'dinero' && <>
            <Grid size={6}>
              <TextField fullWidth size="small" label="Monto *" type="number"
                value={form.monto} onChange={e => set('monto', e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth size="small" label="N° Recibo" value={form.reciboNumero}
                onChange={e => set('reciboNumero', e.target.value)} />
            </Grid>
          </>}

          {/* Especie */}
          {form.tipo === 'especie' && <>
            <Grid size={12}>
              <Autocomplete
                options={opsItem}
                getOptionLabel={o => (typeof o === 'string' ? o : o.nombre ?? '')}
                isOptionEqualToValue={(o, v) => o.id === v?.id}
                value={itemSel}
                onChange={(_, v) => {
                  setItemSel(v ?? null);
                  set('nombreItem', v?.nombre ?? '');
                  if (v?.unidadMedida) set('unidadMedida', v.unidadMedida);
                }}
                onInputChange={(_, v, reason) => { if (reason === 'input') buscarItems(v); }}
                loading={buscandoI}
                noOptionsText="Escriba para buscar…"
                renderInput={p => (
                  <TextField {...p} size="small" label="Artículo del inventario (opcional)"
                    placeholder="Buscar por nombre…"
                    InputProps={{ ...p.InputProps, endAdornment: <>{buscandoI && <CircularProgress size={16} />}{p.InputProps.endAdornment}</> }}
                  />
                )}
              />
            </Grid>
            {!itemSel && (
              <Grid size={12}>
                <TextField fullWidth size="small" label="Nombre del artículo *"
                  value={form.nombreItem} onChange={e => set('nombreItem', e.target.value)}
                  placeholder="Ej: Ropa, alimentos, útiles escolares…"
                />
              </Grid>
            )}
            <Grid size={6}>
              <TextField fullWidth size="small" label="Cantidad *" type="number"
                value={form.cantidad} onChange={e => set('cantidad', e.target.value)} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth size="small" label="Unidad de medida"
                value={form.unidadMedida} onChange={e => set('unidadMedida', e.target.value)}
                placeholder="kg, und, litros…" />
            </Grid>
          </>}

          {/* Sede + Programa */}
          <Grid size={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Sede (opcional)</InputLabel>
              <Select value={form.sedeId} label="Sede (opcional)" onChange={e => setSedeId(e.target.value)}>
                <MenuItem value=""><em>Sin sede</em></MenuItem>
                {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={6}>
            <FormControl fullWidth size="small" disabled={!form.sedeId || programas.length === 0}>
              <InputLabel>Programa (opcional)</InputLabel>
              <Select value={form.programaId} label="Programa (opcional)"
                onChange={e => set('programaId', e.target.value)}>
                <MenuItem value=""><em>Sin programa</em></MenuItem>
                {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          {/* Fecha + Descripción */}
          <Grid size={5}>
            <TextField fullWidth size="small" label="Fecha" type="date"
              value={form.fechaDonacion} onChange={e => set('fechaDonacion', e.target.value)}
              InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid size={7}>
            <TextField fullWidth size="small" label="Descripción" value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}
          sx={{ bgcolor: COLOR, fontWeight: 700, '&:hover': { bgcolor: '#b45309' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : 'Registrar donación'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function DonacionesPage() {
  const [donaciones,    setDonaciones]    = useState([]);
  const [stats,         setStats]         = useState(null);
  const [cargando,      setCargando]      = useState(false);
  const [sedes,         setSedes]         = useState([]);
  const [snack,         setSnack]         = useState({ open: false, msg: '', sev: 'success' });
  const [dialOpen,      setDialOpen]      = useState(false);
  const [donanteInicial,setDonanteInicial]= useState(null);

  // Filtros
  const [filtTipo,   setFiltTipo]   = useState('');
  const [filtSedeId, setFiltSedeId] = useState('');
  const [filtDesde,  setFiltDesde]  = useState('');
  const [filtHasta,  setFiltHasta]  = useState('');

  const ok  = msg => setSnack({ open: true, msg, sev: 'success' });
  const err = msg => setSnack({ open: true, msg, sev: 'error' });

  const recargarStats = () =>
    donacionesRepository.stats().then(({ data }) => setStats(data)).catch(() => {});

  useEffect(() => {
    sedesRepository.listar({ soloActivas: true }).then(({ data }) => setSedes(data)).catch(() => {});
    recargarStats();
  }, []);

  // Leer contexto de donante pasado desde DonantesPage
  useEffect(() => {
    const id     = localStorage.getItem('nuevaDonacionDonanteId');
    const nombre = localStorage.getItem('nuevaDonacionDonanteNombre');
    if (id && nombre) {
      localStorage.removeItem('nuevaDonacionDonanteId');
      localStorage.removeItem('nuevaDonacionDonanteNombre');
      setDonanteInicial({ id, nombre });
      setDialOpen(true);
    }
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = {};
      if (filtTipo)   params.tipo   = filtTipo;
      if (filtSedeId) params.sedeId = filtSedeId;
      if (filtDesde)  params.desde  = filtDesde;
      if (filtHasta)  params.hasta  = filtHasta;
      const { data } = await donacionesRepository.listar(params);
      setDonaciones(data);
    } catch { err('No se pudieron cargar las donaciones.'); }
    finally { setCargando(false); }
  }, [filtTipo, filtSedeId, filtDesde, filtHasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleGuardada = (data) => {
    setDonaciones(prev => [data, ...prev]);
    setDialOpen(false);
    setDonanteInicial(null);
    ok('Donación registrada.');
    recargarStats();
  };

  const handleEliminar = async (don) => {
    if (!window.confirm('¿Eliminar esta donación?')) return;
    try {
      await donacionesRepository.eliminar(don.id);
      setDonaciones(prev => prev.filter(d => d.id !== don.id));
      ok('Donación eliminada.');
      recargarStats();
    } catch { err('No se pudo eliminar.'); }
  };

  const hayFiltros = filtTipo || filtSedeId || filtDesde || filtHasta;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box sx={{ width: 4, height: 26, borderRadius: 1, bgcolor: COLOR }} />
            <Typography variant="h5" fontWeight={800}>Donaciones</Typography>
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', pl: 0.5 }}>
            Registro de donaciones en dinero y en especie
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setDonanteInicial(null); setDialOpen(true); }}
          sx={{ bgcolor: COLOR, fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#b45309' } }}>
          Nueva donación
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<AttachMoneyIcon />} label="Dinero este mes"
            value={fmtMoney(stats?.totalDineroMes)} color={COLOR} loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<TrendingUpIcon />} label="Dinero este año"
            value={fmtMoney(stats?.totalDineroAnio)} color="#7c3aed" loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<AttachMoneyIcon />} label="Total histórico"
            value={fmtMoney(stats?.totalDineroTotal)} color="#059669" loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<Inventory2Icon />} label="Especie este mes"
            value={stats?.totalEspecieMes ?? '—'} color={COLOR_ESPECIE} loading={!stats} />
        </Grid>
      </Grid>

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup value={filtTipo} exclusive size="small"
          onChange={(_, v) => setFiltTipo(v ?? '')}>
          <ToggleButton value="">Todas</ToggleButton>
          <ToggleButton value="dinero">Dinero</ToggleButton>
          <ToggleButton value="especie">Especie</ToggleButton>
        </ToggleButtonGroup>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Sede</InputLabel>
          <Select value={filtSedeId} label="Sede" onChange={e => setFiltSedeId(e.target.value)}>
            <MenuItem value="">Todas</MenuItem>
            {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField size="small" label="Desde" type="date" value={filtDesde}
          onChange={e => setFiltDesde(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
        <TextField size="small" label="Hasta" type="date" value={filtHasta}
          onChange={e => setFiltHasta(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
        {hayFiltros && (
          <Button size="small" startIcon={<CloseIcon />}
            onClick={() => { setFiltTipo(''); setFiltSedeId(''); setFiltDesde(''); setFiltHasta(''); }}>
            Limpiar
          </Button>
        )}
      </Box>

      {/* Tabla */}
      {cargando && donaciones.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
      ) : donaciones.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center', border: '1.5px dashed #fde68a', borderRadius: 2, bgcolor: '#fffbf0' }}>
          <VolunteerActivismIcon sx={{ fontSize: 48, color: '#fcd34d', mb: 1.5 }} />
          <Typography fontWeight={700} color="text.secondary">
            {hayFiltros ? 'No hay donaciones con estos filtros' : 'No hay donaciones registradas'}
          </Typography>
          {!hayFiltros && (
            <Button variant="contained" startIcon={<AddIcon />}
              sx={{ mt: 2, bgcolor: COLOR, fontWeight: 700 }}
              onClick={() => { setDonanteInicial(null); setDialOpen(true); }}>
              Registrar primera donación
            </Button>
          )}
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#fffbf0' }}>
                <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Donante</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Detalle</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sede / Programa</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {donaciones.map(d => (
                <TableRow key={d.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                    {fmtFecha(d.fechaDonacion)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.83rem', maxWidth: 170 }}>
                    <Typography fontWeight={600} fontSize="inherit" noWrap>
                      {d.nombreDonante}
                    </Typography>
                    <Typography fontSize="0.7rem" color="text.secondary">
                      {d.tipoDonante === 'empresa' ? 'Empresa' : 'Persona'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={d.tipo === 'dinero' ? 'Dinero' : 'Especie'} size="small"
                      sx={{
                        bgcolor: d.tipo === 'dinero' ? `${COLOR}18` : `${COLOR_ESPECIE}18`,
                        color:   d.tipo === 'dinero' ? COLOR : COLOR_ESPECIE,
                        fontWeight: 700, fontSize: '0.7rem',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.82rem' }}>
                    {d.tipo === 'dinero' ? (
                      <>
                        <strong>{fmtMoney(d.monto)}</strong>
                        {d.reciboNumero && (
                          <Typography component="span" sx={{ ml: 0.8, fontSize: '0.7rem', color: 'text.secondary' }}>
                            Recibo: {d.reciboNumero}
                          </Typography>
                        )}
                      </>
                    ) : (
                      <>
                        {d.cantidad} {d.unidadMedida || ''} — <strong>{d.nombreItem || '—'}</strong>
                      </>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', maxWidth: 160 }}>
                    {d.nombreSede || '—'}
                    {d.nombrePrograma ? (
                      <Typography component="span" sx={{ fontSize: '0.72rem', display: 'block', color: 'text.secondary' }}>
                        {d.nombrePrograma}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Eliminar donación">
                      <IconButton size="small" color="error" onClick={() => handleEliminar(d)}>
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

      <NuevaDonacionDialog
        open={dialOpen}
        donanteInicial={donanteInicial}
        onClose={() => { setDialOpen(false); setDonanteInicial(null); }}
        onGuardada={handleGuardada}
        sedes={sedes}
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

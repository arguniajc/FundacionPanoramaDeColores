import React, { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '../../../../shared/components/ConfirmDialog';
import {
  Box, Typography, Grid, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Select, FormControl, InputLabel, IconButton, Tooltip,
  Chip, Avatar, Divider, CircularProgress, Snackbar, Alert, InputAdornment,
  Autocomplete, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Paper, ToggleButtonGroup, ToggleButton, Tabs, Tab,
} from '@mui/material';
import AddIcon              from '@mui/icons-material/Add';
import EditIcon             from '@mui/icons-material/Edit';
import DeleteIcon           from '@mui/icons-material/Delete';
import SearchIcon           from '@mui/icons-material/Search';
import CloseIcon            from '@mui/icons-material/Close';
import AttachMoneyIcon      from '@mui/icons-material/AttachMoney';
import Inventory2Icon       from '@mui/icons-material/Inventory2';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import BusinessIcon         from '@mui/icons-material/Business';
import PersonIcon           from '@mui/icons-material/Person';
import EmailIcon            from '@mui/icons-material/Email';
import PhoneIcon            from '@mui/icons-material/Phone';
import LocationOnIcon       from '@mui/icons-material/LocationOn';
import TrendingUpIcon       from '@mui/icons-material/TrendingUp';
import { donantesRepository }   from '../../../../infrastructure/repositories/donantesRepository';
import { donacionesRepository } from '../../../../infrastructure/repositories/donacionesRepository';
import { sedesRepository }      from '../../../../infrastructure/repositories/sedesRepository';
import { inventarioRepository } from '../../../../infrastructure/repositories/inventarioRepository';
import { useAuth } from '../../../../application/auth/AuthContext';

const COLOR_DONANTES  = '#2D984F';
const COLOR_DONACIONES = '#d97706';
const COLOR_ESPECIE    = '#0ea5e9';

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
function StatCard({ icon, label, value, color, borderColor, bgColor, loading }) {
  return (
    <Box sx={{ border: `1.5px solid ${borderColor}`, borderRadius: 2, p: 2.5,
        bgcolor: bgColor, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ width: 46, height: 46, borderRadius: '50%', bgcolor: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </Typography>
        {loading
          ? <CircularProgress size={18} sx={{ mt: 0.5 }} />
          : <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.2 }}>{value}</Typography>}
      </Box>
    </Box>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function DonacionesPage() {
  const [tab, setTab] = useState(0);
  const [donanteParaDonacion, setDonanteParaDonacion] = useState(null);

  const abrirDonacionDesde = (donante) => {
    setDonanteParaDonacion(donante);
    setTab(1);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 26, borderRadius: 1, bgcolor: COLOR_DONANTES }} />
          <Typography variant="h5" fontWeight={800}>Donantes y Donaciones</Typography>
        </Box>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', pl: 0.5 }}>
          Gestión de donantes y registro de donaciones en dinero o especie
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          label="Donantes"
          icon={<VolunteerActivismIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
        />
        <Tab
          label="Donaciones"
          icon={<AttachMoneyIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
        />
      </Tabs>

      {tab === 0 && (
        <TabDonantes onNuevaDonacion={abrirDonacionDesde} />
      )}
      {tab === 1 && (
        <TabDonaciones
          donanteInicial={donanteParaDonacion}
          onClearDonanteInicial={() => setDonanteParaDonacion(null)}
        />
      )}
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB DONANTES
// ══════════════════════════════════════════════════════════════════════════════

function DonanteCard({ donante, onEditar, onEliminar, onNuevaDonacion }) {
  const esEmpresa = donante.tipo === 'empresa';
  const color = esEmpresa ? '#0ea5e9' : COLOR_DONANTES;

  return (
    <Box sx={{ border: '1.5px solid #c8e6c9', borderRadius: 2, overflow: 'hidden',
        bgcolor: '#f9fdf9', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2, pt: 2, pb: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Avatar sx={{ bgcolor: color, width: 42, height: 42, fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
          {donante.nombre.slice(0, 2).toUpperCase()}
        </Avatar>
        <Box minWidth={0} flex={1}>
          <Typography fontWeight={800} sx={{ fontSize: '0.92rem', lineHeight: 1.3 }} noWrap title={donante.nombre}>
            {donante.nombre}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3 }}>
            <Chip
              icon={esEmpresa
                ? <BusinessIcon sx={{ fontSize: '11px !important' }} />
                : <PersonIcon   sx={{ fontSize: '11px !important' }} />}
              label={esEmpresa ? 'Empresa' : 'Persona'} size="small"
              sx={{ fontSize: '0.68rem', height: 20, bgcolor: `${color}18`, color, fontWeight: 700, border: 'none' }}
            />
            {!donante.activo && (
              <Chip label="Inactivo" size="small" color="default" sx={{ fontSize: '0.68rem', height: 20 }} />
            )}
          </Box>
        </Box>
      </Box>

      <Divider />

      <Box sx={{ px: 2, py: 1.8, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
        <Grid container spacing={1}>
          <Grid size={6}>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Total donado</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: COLOR_DONANTES }}>
              {donante.totalDinero > 0 ? fmtMoney(donante.totalDinero) : '—'}
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Donaciones</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>
              {donante.totalDonaciones}
              {donante.totalEspecie > 0 && (
                <Typography component="span" sx={{ fontSize: '0.72rem', color: 'text.secondary', ml: 0.4 }}>
                  ({donante.totalEspecie} especie)
                </Typography>
              )}
            </Typography>
          </Grid>
        </Grid>

        {donante.ultimaDonacion && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            Última donación: <strong>{fmtFecha(donante.ultimaDonacion)}</strong>
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
          {donante.documento && (
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              Doc: <strong>{donante.documento}</strong>
            </Typography>
          )}
          {donante.email && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EmailIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }} noWrap>{donante.email}</Typography>
            </Box>
          )}
          {donante.telefono && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PhoneIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{donante.telefono}</Typography>
            </Box>
          )}
          {donante.ciudad && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationOnIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{donante.ciudad}</Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ px: 1.5, py: 1, bgcolor: 'rgba(45,152,79,0.04)', borderTop: '1.5px solid #c8e6c9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button size="small" variant="contained" startIcon={<VolunteerActivismIcon />}
          onClick={() => onNuevaDonacion(donante)}
          sx={{ bgcolor: COLOR_DONANTES, fontWeight: 700, fontSize: '0.7rem', px: 1,
              '&:hover': { bgcolor: '#1e7a38' } }}>
          Donación
        </Button>
        <Box display="flex" gap={0.3}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => onEditar(donante)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => onEliminar(donante)}><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

const VACIO_DONANTE = { nombre: '', tipo: 'persona', documento: '', email: '', telefono: '', ciudad: '', notas: '' };

function DonanteDialog({ open, donante, onClose, onGuardado }) {
  const editando = !!donante;
  const [form,      setForm]      = useState(VACIO_DONANTE);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (open) {
      setForm(donante
        ? { nombre: donante.nombre, tipo: donante.tipo, documento: donante.documento ?? '',
            email: donante.email ?? '', telefono: donante.telefono ?? '',
            ciudad: donante.ciudad ?? '', notas: donante.notas ?? '' }
        : VACIO_DONANTE);
      setError('');
    }
  }, [open, donante]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setGuardando(true); setError('');
    try {
      const { data } = editando
        ? await donantesRepository.editar(donante.id, { ...form, nombre: form.nombre.trim() })
        : await donantesRepository.crear({ ...form, nombre: form.nombre.trim() });
      onGuardado(data, editando);
    } catch {
      setError('Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR_DONANTES }}>
        {editando ? 'Editar donante' : 'Nuevo donante'}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={8}>
            <TextField fullWidth size="small" label="Nombre *" value={form.nombre}
              onChange={e => set('nombre', e.target.value)} />
          </Grid>
          <Grid size={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo</InputLabel>
              <Select value={form.tipo} label="Tipo" onChange={e => set('tipo', e.target.value)}>
                <MenuItem value="persona">Persona</MenuItem>
                <MenuItem value="empresa">Empresa</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth size="small" label="Documento / NIT" value={form.documento}
              onChange={e => set('documento', e.target.value)} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth size="small" label="Ciudad" value={form.ciudad}
              onChange={e => set('ciudad', e.target.value)} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth size="small" label="Email" type="email" value={form.email}
              onChange={e => set('email', e.target.value)} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth size="small" label="Teléfono" value={form.telefono}
              onChange={e => set('telefono', e.target.value)} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Notas" multiline rows={2} value={form.notas}
              onChange={e => set('notas', e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}
          sx={{ bgcolor: COLOR_DONANTES, fontWeight: 700, '&:hover': { bgcolor: '#1e7a38' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : editando ? 'Guardar' : 'Crear donante'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function TabDonantes({ onNuevaDonacion }) {
  const { puedo } = useAuth();
  const confirm = useConfirm();
  const [donantes,  setDonantes]  = useState([]);
  const [cargando,  setCargando]  = useState(false);
  const [buscar,    setBuscar]    = useState('');
  const [dialDon,   setDialDon]   = useState({ open: false, donante: null });
  const [snack,     setSnack]     = useState({ open: false, msg: '', sev: 'success' });

  const ok  = msg => setSnack({ open: true, msg, sev: 'success' });
  const err = msg => setSnack({ open: true, msg, sev: 'error' });

  const cargar = useCallback(async (q) => {
    setCargando(true);
    try {
      const { data } = await donantesRepository.listar(q ? { buscar: q } : {});
      setDonantes(data);
    } catch { err('No se pudieron cargar los donantes.'); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const t = setTimeout(() => cargar(buscar), 280);
    return () => clearTimeout(t);
  }, [buscar, cargar]);

  const handleGuardado = (data, editando) => {
    if (editando) setDonantes(prev => prev.map(d => d.id === data.id ? data : d));
    else          setDonantes(prev => [data, ...prev]);
    setDialDon({ open: false, donante: null });
    ok(editando ? 'Donante actualizado.' : 'Donante creado.');
  };

  const handleEliminar = async (donante) => {
    if (!await confirm(`¿Eliminar a "${donante.nombre}"? Si tiene donaciones quedará inactivo.`)) return;
    try {
      await donantesRepository.eliminar(donante.id);
      setDonantes(prev => prev.filter(d => d.id !== donante.id));
      ok('Donante eliminado.');
    } catch { err('No se pudo eliminar.'); }
  };

  const totalDinero      = donantes.reduce((s, d) => s + Number(d.totalDinero || 0), 0);
  const totalConDonacion = donantes.filter(d => d.totalDonaciones > 0).length;

  return (
    <>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard icon={<VolunteerActivismIcon />} label="Total donantes"
            value={donantes.length} color={COLOR_DONANTES}
            borderColor="#c8e6c9" bgColor="#f9fdf9" loading={cargando} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard icon={<AttachMoneyIcon />} label="Total donado (dinero)"
            value={fmtMoney(totalDinero)} color={COLOR_DONACIONES}
            borderColor="#fde68a" bgColor="#fffbf0" loading={cargando} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard icon={<VolunteerActivismIcon />} label="Con donaciones"
            value={totalConDonacion} color="#0ea5e9"
            borderColor="#bae6fd" bgColor="#f0f9ff" loading={cargando} />
        </Grid>
      </Grid>

      {/* Acciones */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        <TextField size="small" placeholder="Buscar por nombre, documento o email…"
          value={buscar} onChange={e => setBuscar(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>,
            endAdornment: buscar ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setBuscar('')}><CloseIcon fontSize="small" /></IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ width: { xs: '100%', sm: 340 } }}
        />
        {puedo('donantes', 'crear') && (
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => setDialDon({ open: true, donante: null })}
            sx={{ bgcolor: COLOR_DONANTES, fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#1e7a38' } }}>
            Nuevo donante
          </Button>
        )}
      </Box>

      {/* Grid de tarjetas */}
      {cargando && donantes.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
      ) : donantes.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center', border: '1.5px dashed #c8e6c9', borderRadius: 2, bgcolor: '#f9fdf9' }}>
          <VolunteerActivismIcon sx={{ fontSize: 48, color: '#a5d6a7', mb: 1.5 }} />
          <Typography fontWeight={700} color="text.secondary">
            {buscar ? 'No se encontraron donantes' : 'No hay donantes registrados'}
          </Typography>
          {!buscar && puedo('donantes', 'crear') && (
            <Button variant="contained" startIcon={<AddIcon />}
              sx={{ mt: 2, bgcolor: COLOR_DONANTES, fontWeight: 700 }}
              onClick={() => setDialDon({ open: true, donante: null })}>
              Registrar primer donante
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2} alignItems="stretch">
          {donantes.map(d => (
            <Grid key={d.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <DonanteCard
                donante={d}
                onEditar={x => setDialDon({ open: true, donante: x })}
                onEliminar={handleEliminar}
                onNuevaDonacion={onNuevaDonacion}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <DonanteDialog
        open={dialDon.open} donante={dialDon.donante}
        onClose={() => setDialDon({ open: false, donante: null })}
        onGuardado={handleGuardado}
      />

      <Snackbar open={snack.open} autoHideDuration={3500}
        onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled"
          onClose={() => setSnack(p => ({ ...p, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB DONACIONES
// ══════════════════════════════════════════════════════════════════════════════

const VACIO_DON = {
  tipo: 'dinero', monto: '', reciboNumero: '', nombreItem: '',
  cantidad: '', unidadMedida: '', sedeId: '', programaId: '',
  descripcion: '', fechaDonacion: hoy(),
};

function NuevaDonacionDialog({ open, donanteInicial, onClose, onGuardada, sedes }) {
  const [donante,    setDonante]    = useState(null);
  const [form,       setForm]       = useState(VACIO_DON);
  const [guardando,  setGuardando]  = useState(false);
  const [error,      setError]      = useState('');
  const [programas,  setProgramas]  = useState([]);
  const [opsDonante, setOpsDonante] = useState([]);
  const [buscandoD,  setBuscandoD]  = useState(false);
  const [opsItem,    setOpsItem]    = useState([]);
  const [buscandoI,  setBuscandoI]  = useState(false);
  const [itemSel,    setItemSel]    = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({ ...VACIO_DON, fechaDonacion: hoy() });
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
      const { data } = await donacionesRepository.crear({
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
      });
      onGuardada(data);
    } catch (e) {
      setError(e?.response?.data?.mensaje || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR_DONACIONES }}>Nueva donación</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
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

          <Grid size={12}>
            <ToggleButtonGroup value={form.tipo} exclusive size="small"
              onChange={(_, v) => v && set('tipo', v)} sx={{ width: '100%' }}>
              <ToggleButton value="dinero"  sx={{ flex: 1, fontWeight: 700 }}>
                <AttachMoneyIcon sx={{ fontSize: 17, mr: 0.5 }} /> Dinero
              </ToggleButton>
              <ToggleButton value="especie" sx={{ flex: 1, fontWeight: 700 }}>
                <Inventory2Icon sx={{ fontSize: 17, mr: 0.5 }} /> En especie
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {form.tipo === 'dinero' && <>
            <Grid size={6}>
              <TextField fullWidth size="small" label="Monto *" type="number"
                value={form.monto} onChange={e => set('monto', e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth size="small" label="N° Recibo" value={form.reciboNumero}
                onChange={e => set('reciboNumero', e.target.value)} />
            </Grid>
          </>}

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
                  placeholder="Ej: Ropa, alimentos, útiles escolares…" />
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
          sx={{ bgcolor: COLOR_DONACIONES, fontWeight: 700, '&:hover': { bgcolor: '#b45309' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : 'Registrar donación'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function TabDonaciones({ donanteInicial, onClearDonanteInicial }) {
  const { puedo } = useAuth();
  const confirm = useConfirm();
  const [donaciones,    setDonaciones]    = useState([]);
  const [stats,         setStats]         = useState(null);
  const [cargando,      setCargando]      = useState(false);
  const [sedes,         setSedes]         = useState([]);
  const [snack,         setSnack]         = useState({ open: false, msg: '', sev: 'success' });
  const [dialOpen,      setDialOpen]      = useState(false);

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

  // Abrir diálogo automáticamente cuando viene desde la tarjeta de un donante
  useEffect(() => {
    if (donanteInicial) setDialOpen(true);
  }, [donanteInicial]);

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
    onClearDonanteInicial();
    ok('Donación registrada.');
    recargarStats();
  };

  const handleCerrarDialog = () => {
    setDialOpen(false);
    onClearDonanteInicial();
  };

  const handleEliminar = async (don) => {
    if (!await confirm('¿Eliminar esta donación?')) return;
    try {
      await donacionesRepository.eliminar(don.id);
      setDonaciones(prev => prev.filter(d => d.id !== don.id));
      ok('Donación eliminada.');
      recargarStats();
    } catch { err('No se pudo eliminar.'); }
  };

  const hayFiltros = filtTipo || filtSedeId || filtDesde || filtHasta;

  return (
    <>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<AttachMoneyIcon />} label="Dinero este mes"
            value={fmtMoney(stats?.totalDineroMes)} color={COLOR_DONACIONES}
            borderColor="#fde68a" bgColor="#fffbf0" loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<TrendingUpIcon />} label="Dinero este año"
            value={fmtMoney(stats?.totalDineroAnio)} color="#7c3aed"
            borderColor="#e9d5ff" bgColor="#faf5ff" loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<AttachMoneyIcon />} label="Total histórico"
            value={fmtMoney(stats?.totalDineroTotal)} color="#059669"
            borderColor="#a7f3d0" bgColor="#f0fdf4" loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<Inventory2Icon />} label="Especie este mes"
            value={stats?.totalEspecieMes ?? '—'} color={COLOR_ESPECIE}
            borderColor="#bae6fd" bgColor="#f0f9ff" loading={!stats} />
        </Grid>
      </Grid>

      {/* Acciones + Filtros */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
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
        {puedo('donaciones', 'crear') && (
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => { onClearDonanteInicial(); setDialOpen(true); }}
            sx={{ bgcolor: COLOR_DONACIONES, fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#b45309' } }}>
            Nueva donación
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
          {!hayFiltros && puedo('donaciones', 'crear') && (
            <Button variant="contained" startIcon={<AddIcon />}
              sx={{ mt: 2, bgcolor: COLOR_DONACIONES, fontWeight: 700 }}
              onClick={() => { onClearDonanteInicial(); setDialOpen(true); }}>
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
                <TableCell sx={{ fontWeight: 700, display: { xs: 'none', sm: 'table-cell' } }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Detalle</TableCell>
                <TableCell sx={{ fontWeight: 700, display: { xs: 'none', md: 'table-cell' } }}>Sede / Programa</TableCell>
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
                    <Typography fontWeight={600} fontSize="inherit" noWrap>{d.nombreDonante}</Typography>
                    <Typography fontSize="0.7rem" color="text.secondary">
                      {d.tipoDonante === 'empresa' ? 'Empresa' : 'Persona'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Chip label={d.tipo === 'dinero' ? 'Dinero' : 'Especie'} size="small"
                      sx={{
                        bgcolor: d.tipo === 'dinero' ? `${COLOR_DONACIONES}18` : `${COLOR_ESPECIE}18`,
                        color:   d.tipo === 'dinero' ? COLOR_DONACIONES : COLOR_ESPECIE,
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
                      <>{d.cantidad} {d.unidadMedida || ''} — <strong>{d.nombreItem || '—'}</strong></>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', maxWidth: 160, display: { xs: 'none', md: 'table-cell' } }}>
                    {d.nombreSede || '—'}
                    {d.nombrePrograma && (
                      <Typography component="span" sx={{ fontSize: '0.72rem', display: 'block', color: 'text.secondary' }}>
                        {d.nombrePrograma}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {puedo('donaciones', 'eliminar') && (
                      <Tooltip title="Eliminar donación">
                        <IconButton size="small" color="error" onClick={() => handleEliminar(d)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
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
        onClose={handleCerrarDialog}
        onGuardada={handleGuardada}
        sedes={sedes}
      />

      <Snackbar open={snack.open} autoHideDuration={3500}
        onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled"
          onClose={() => setSnack(p => ({ ...p, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </>
  );
}

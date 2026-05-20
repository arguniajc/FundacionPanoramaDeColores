import React, { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '../../../../shared/components/ConfirmDialog';
import {
  Box, Typography, Grid, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, IconButton, Tooltip,
  Chip, Avatar, Divider, CircularProgress, Snackbar, Alert, InputAdornment,
} from '@mui/material';
import AddIcon             from '@mui/icons-material/Add';
import EditIcon            from '@mui/icons-material/Edit';
import DeleteIcon          from '@mui/icons-material/Delete';
import SearchIcon          from '@mui/icons-material/Search';
import CloseIcon           from '@mui/icons-material/Close';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import BusinessIcon        from '@mui/icons-material/Business';
import PersonIcon          from '@mui/icons-material/Person';
import AttachMoneyIcon     from '@mui/icons-material/AttachMoney';
import EmailIcon           from '@mui/icons-material/Email';
import PhoneIcon           from '@mui/icons-material/Phone';
import LocationOnIcon      from '@mui/icons-material/LocationOn';
import { donantesRepository } from '../../../../infrastructure/repositories/donantesRepository';

const COLOR = '#2D984F';

function fmtMoney(n) {
  return Number(n).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}
function fmtFecha(d) {
  return new Date(d).toLocaleDateString('es-CO', { dateStyle: 'medium' });
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, loading }) {
  return (
    <Box sx={{ border: '1.5px solid #c8e6c9', borderRadius: 2, p: 2.5, bgcolor: '#f9fdf9', display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ width: 46, height: 46, borderRadius: '50%', bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </Typography>
        {loading
          ? <CircularProgress size={18} sx={{ mt: 0.5 }} />
          : <Typography sx={{ fontSize: '1.45rem', fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>{value}</Typography>}
      </Box>
    </Box>
  );
}

// ── DonanteCard ───────────────────────────────────────────────────────────────
function DonanteCard({ donante, onEditar, onEliminar, onNuevaDonacion }) {
  const esEmpresa = donante.tipo === 'empresa';
  const colorAvatar = esEmpresa ? '#0ea5e9' : COLOR;

  return (
    <Box sx={{ border: '1.5px solid #c8e6c9', borderRadius: 2, overflow: 'hidden', bgcolor: '#f9fdf9', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 2, pb: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Avatar sx={{ bgcolor: colorAvatar, width: 42, height: 42, fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
          {donante.nombre.slice(0, 2).toUpperCase()}
        </Avatar>
        <Box minWidth={0} flex={1}>
          <Typography fontWeight={800} sx={{ fontSize: '0.92rem', lineHeight: 1.3 }} noWrap title={donante.nombre}>
            {donante.nombre}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3 }}>
            <Chip
              icon={esEmpresa ? <BusinessIcon sx={{ fontSize: '11px !important' }} /> : <PersonIcon sx={{ fontSize: '11px !important' }} />}
              label={esEmpresa ? 'Empresa' : 'Persona'}
              size="small"
              sx={{ fontSize: '0.68rem', height: 20, bgcolor: `${colorAvatar}18`, color: colorAvatar, fontWeight: 700, border: 'none' }}
            />
            {!donante.activo && (
              <Chip label="Inactivo" size="small" color="default" sx={{ fontSize: '0.68rem', height: 20 }} />
            )}
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* Body */}
      <Box sx={{ px: 2, py: 1.8, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
        {/* Stats donaciones */}
        <Grid container spacing={1}>
          <Grid size={6}>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Total donado</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: COLOR }}>
              {donante.totalDinero > 0 ? fmtMoney(donante.totalDinero) : '—'}
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Donaciones</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: 'text.primary' }}>
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

        {/* Contacto */}
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

      {/* Footer */}
      <Box sx={{ px: 1.5, py: 1, bgcolor: 'rgba(45,152,79,0.04)', borderTop: '1.5px solid #c8e6c9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button size="small" variant="contained" startIcon={<VolunteerActivismIcon />}
          onClick={() => onNuevaDonacion(donante)}
          sx={{ bgcolor: COLOR, fontWeight: 700, fontSize: '0.7rem', px: 1, '&:hover': { bgcolor: '#1e7a38' } }}>
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

// ── Dialog: Nuevo / Editar donante ────────────────────────────────────────────
const VACIO = { nombre: '', tipo: 'persona', documento: '', email: '', telefono: '', ciudad: '', notas: '' };

function DonanteDialog({ open, donante, onClose, onGuardado }) {
  const editando = !!donante;
  const [form,      setForm]      = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (open) {
      setForm(donante
        ? { nombre: donante.nombre, tipo: donante.tipo, documento: donante.documento ?? '',
            email: donante.email ?? '', telefono: donante.telefono ?? '',
            ciudad: donante.ciudad ?? '', notas: donante.notas ?? '' }
        : VACIO);
      setError('');
    }
  }, [open, donante]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setGuardando(true); setError('');
    try {
      const payload = { ...form, nombre: form.nombre.trim() };
      const { data } = editando
        ? await donantesRepository.editar(donante.id, payload)
        : await donantesRepository.crear(payload);
      onGuardado(data, editando);
    } catch (e) {
      setError(e?.response?.data?.mensaje || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>
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
            <TextField select fullWidth size="small" label="Tipo"
              value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              <MenuItem value="persona">Persona</MenuItem>
              <MenuItem value="empresa">Empresa</MenuItem>
            </TextField>
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
          sx={{ bgcolor: COLOR, fontWeight: 700, '&:hover': { bgcolor: '#1e7a38' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : editando ? 'Guardar' : 'Crear donante'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function DonantesPage() {
  const confirm = useConfirm();
  const [donantes,  setDonantes]  = useState([]);
  const [cargando,  setCargando]  = useState(false);
  const [buscar,    setBuscar]    = useState('');
  const [dialDon,   setDialDon]   = useState({ open: false, donante: null });
  const [snack,     setSnack]     = useState({ open: false, msg: '', sev: 'success' });

  // Navegar a donaciones con el donante preseleccionado
  const [donantePendiente, setDonantePendiente] = useState(null);

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
    else setDonantes(prev => [data, ...prev]);
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

  // stats derivados
  const totalDonantes    = donantes.length;
  const totalDinero      = donantes.reduce((s, d) => s + Number(d.totalDinero || 0), 0);
  const totalConDonacion = donantes.filter(d => d.totalDonaciones > 0).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box sx={{ width: 4, height: 26, borderRadius: 1, bgcolor: COLOR }} />
            <Typography variant="h5" fontWeight={800}>Donantes</Typography>
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', pl: 0.5 }}>
            Personas y empresas que apoyan la fundación
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => setDialDon({ open: true, donante: null })}
          sx={{ bgcolor: COLOR, fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#1e7a38' } }}>
          Nuevo donante
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard icon={<VolunteerActivismIcon />} label="Total donantes" value={totalDonantes} color={COLOR} loading={cargando} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard icon={<AttachMoneyIcon />} label="Total donado (dinero)" value={fmtMoney(totalDinero)} color="#d97706" loading={cargando} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard icon={<VolunteerActivismIcon />} label="Con donaciones" value={totalConDonacion} color="#0ea5e9" loading={cargando} />
        </Grid>
      </Grid>

      {/* Búsqueda */}
      <Box sx={{ mb: 2.5 }}>
        <TextField size="small" placeholder="Buscar por nombre, documento o email…"
          value={buscar} onChange={e => setBuscar(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>,
            endAdornment: buscar ? <InputAdornment position="end"><IconButton size="small" onClick={() => setBuscar('')}><CloseIcon fontSize="small" /></IconButton></InputAdornment> : null,
          }}
          sx={{ width: { xs: '100%', sm: 340 } }}
        />
      </Box>

      {/* Grid */}
      {cargando && donantes.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
      ) : donantes.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center', border: '1.5px dashed #c8e6c9', borderRadius: 2, bgcolor: '#f9fdf9' }}>
          <VolunteerActivismIcon sx={{ fontSize: 48, color: '#a5d6a7', mb: 1.5 }} />
          <Typography fontWeight={700} color="text.secondary">
            {buscar ? 'No se encontraron donantes' : 'No hay donantes registrados'}
          </Typography>
          {!buscar && (
            <Button variant="contained" startIcon={<AddIcon />}
              sx={{ mt: 2, bgcolor: COLOR, fontWeight: 700 }}
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
                onNuevaDonacion={x => {
                  // Navegar a la página de donaciones (manejado via localStorage para pasar contexto)
                  localStorage.setItem('nuevaDonacionDonanteId', x.id);
                  localStorage.setItem('nuevaDonacionDonanteNombre', x.nombre);
                  window.location.hash = '/sede/donaciones';
                }}
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
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(p => ({ ...p, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

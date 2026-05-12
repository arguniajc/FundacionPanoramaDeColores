import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Select, FormControl, InputLabel, IconButton, Tooltip,
  Chip, Avatar, Divider, CircularProgress, Snackbar, Alert, InputAdornment,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
} from '@mui/material';
// FormControl, InputLabel, Select, MenuItem siguen usándose en AsignacionesDialog
import AddIcon             from '@mui/icons-material/Add';
import EditIcon            from '@mui/icons-material/Edit';
import DeleteIcon          from '@mui/icons-material/Delete';
import SearchIcon          from '@mui/icons-material/Search';
import CloseIcon           from '@mui/icons-material/Close';
import PeopleIcon          from '@mui/icons-material/People';
import PersonIcon          from '@mui/icons-material/Person';
import EmailIcon           from '@mui/icons-material/Email';
import PhoneIcon           from '@mui/icons-material/Phone';
import LocationOnIcon      from '@mui/icons-material/LocationOn';
import WorkIcon            from '@mui/icons-material/Work';
import AssignmentIcon      from '@mui/icons-material/Assignment';
import AccessTimeIcon      from '@mui/icons-material/AccessTime';
import { voluntariosRepository } from '../../../../infrastructure/repositories/voluntariosRepository';
import { sedesRepository }        from '../../../../infrastructure/repositories/sedesRepository';
import { CampoFecha, CampoDocumento, CampoCiudad } from '../../../../shared/components/form/FormControles';

const COLOR = '#7c3aed';

function fmtFecha(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('es-CO', { dateStyle: 'medium' });
}
function toInputDate(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, loading }) {
  return (
    <Box sx={{ border: '1.5px solid #ede9fe', borderRadius: 2, p: 2.5, bgcolor: '#faf5ff', display: 'flex', alignItems: 'center', gap: 2 }}>
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

// ── VoluntarioCard ────────────────────────────────────────────────────────────
function VoluntarioCard({ voluntario: v, onEditar, onEliminar, onAsignaciones }) {
  return (
    <Box sx={{ border: '1.5px solid #ede9fe', borderRadius: 2, overflow: 'hidden', bgcolor: '#faf5ff', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 2, pb: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Avatar sx={{ bgcolor: COLOR, width: 42, height: 42, fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
          {v.nombre.slice(0, 2).toUpperCase()}
        </Avatar>
        <Box minWidth={0} flex={1}>
          <Typography fontWeight={800} sx={{ fontSize: '0.92rem', lineHeight: 1.3 }} noWrap title={v.nombre}>
            {v.nombre}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3, flexWrap: 'wrap' }}>
            {v.profesion && (
              <Chip icon={<WorkIcon sx={{ fontSize: '11px !important' }} />}
                label={v.profesion} size="small"
                sx={{ fontSize: '0.68rem', height: 20, bgcolor: `${COLOR}18`, color: COLOR, fontWeight: 700, border: 'none' }}
              />
            )}
            {!v.activo && (
              <Chip label="Inactivo" size="small" color="default" sx={{ fontSize: '0.68rem', height: 20 }} />
            )}
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* Body */}
      <Box sx={{ px: 2, py: 1.8, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Stats */}
        <Grid container spacing={1}>
          <Grid size={6}>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Programas</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: COLOR }}>
              {v.totalProgramas}
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Horas/semana</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary' }}>
              {v.horasSemanales > 0 ? `${v.horasSemanales}h` : '—'}
            </Typography>
          </Grid>
        </Grid>

        {v.fechaInicio && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            Desde: <strong>{fmtFecha(v.fechaInicio)}</strong>
          </Typography>
        )}

        {/* Contacto */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
          {v.documento && (
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {v.tipoDocumento ? `${v.tipoDocumento}: ` : 'Doc: '}<strong>{v.documento}</strong>
            </Typography>
          )}
          {v.email && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EmailIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }} noWrap>{v.email}</Typography>
            </Box>
          )}
          {v.telefono && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PhoneIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{v.telefono}</Typography>
            </Box>
          )}
          {v.ciudad && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationOnIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{v.ciudad}</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ px: 1.5, py: 1, bgcolor: `${COLOR}08`, borderTop: '1.5px solid #ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button size="small" variant="outlined" startIcon={<AssignmentIcon />}
          onClick={() => onAsignaciones(v)}
          sx={{ fontWeight: 700, fontSize: '0.7rem', px: 1, color: COLOR, borderColor: COLOR, '&:hover': { borderColor: COLOR, bgcolor: `${COLOR}10` } }}>
          Programas
        </Button>
        <Box display="flex" gap={0.3}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => onEditar(v)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => onEliminar(v)}><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

// ── VoluntarioDialog (crear/editar) ───────────────────────────────────────────
const VACIO_VOL = {
  nombre: '', tipoDocumento: '', documento: '', email: '', telefono: '',
  ciudad: '', fechaNacimiento: '', fechaInicio: '', profesion: '', notas: '',
};

function VoluntarioDialog({ open, voluntario, onClose, onGuardado }) {
  const editando = !!voluntario;
  const [form, setForm] = useState(VACIO_VOL);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(voluntario ? {
      nombre:          voluntario.nombre,
      tipoDocumento:   voluntario.tipoDocumento ?? '',
      documento:       voluntario.documento ?? '',
      email:           voluntario.email ?? '',
      telefono:        voluntario.telefono ?? '',
      ciudad:          voluntario.ciudad ?? '',
      fechaNacimiento: toInputDate(voluntario.fechaNacimiento),
      fechaInicio:     toInputDate(voluntario.fechaInicio),
      profesion:       voluntario.profesion ?? '',
      notas:           voluntario.notas ?? '',
    } : VACIO_VOL);
  }, [open, voluntario]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setGuardando(true); setError('');
    try {
      const payload = {
        nombre:          form.nombre.trim(),
        tipoDocumento:   form.tipoDocumento || null,
        documento:       form.documento.trim() || null,
        email:           form.email.trim() || null,
        telefono:        form.telefono.trim() || null,
        ciudad:          form.ciudad.trim() || null,
        fechaNacimiento: form.fechaNacimiento || null,
        fechaInicio:     form.fechaInicio || null,
        profesion:       form.profesion.trim() || null,
        notas:           form.notas.trim() || null,
      };
      const { data } = editando
        ? await voluntariosRepository.editar(voluntario.id, payload)
        : await voluntariosRepository.crear(payload);
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
        {editando ? 'Editar voluntario' : 'Nuevo voluntario'}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Nombre completo *" value={form.nombre}
              onChange={e => set('nombre', e.target.value)} />
          </Grid>
          <Grid size={12}>
            <CampoDocumento
              tipoDocumento={form.tipoDocumento} documento={form.documento}
              onChangeTipo={v => set('tipoDocumento', v)}
              onChangeNumero={v => set('documento', v)}
            />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth size="small" label="Email" type="email" value={form.email}
              onChange={e => set('email', e.target.value)} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth size="small" label="Teléfono" value={form.telefono}
              onChange={e => set('telefono', e.target.value)} />
          </Grid>
          <Grid size={6}>
            <CampoCiudad value={form.ciudad} onChange={v => set('ciudad', v)} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth size="small" label="Profesión / Oficio" value={form.profesion}
              onChange={e => set('profesion', e.target.value)} />
          </Grid>
          <Grid size={6}>
            <CampoFecha label="Fecha nacimiento" value={form.fechaNacimiento}
              onChange={v => set('fechaNacimiento', v)} />
          </Grid>
          <Grid size={6}>
            <CampoFecha label="Inicio voluntariado" value={form.fechaInicio}
              onChange={v => set('fechaInicio', v)} />
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
          sx={{ bgcolor: COLOR, fontWeight: 700, '&:hover': { bgcolor: '#5b21b6' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : editando ? 'Guardar' : 'Crear voluntario'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── AsignacionesDialog ────────────────────────────────────────────────────────
function AsignacionesDialog({ open, voluntario, onClose }) {
  const [asignaciones, setAsignaciones] = useState([]);
  const [cargando,     setCargando]     = useState(false);
  const [sedes,        setSedes]        = useState([]);
  const [programas,    setProgramas]    = useState([]);
  const [form,         setForm]         = useState({ sedeId: '', programaId: '', horasSemanales: '', fechaInicio: '' });
  const [guardando,    setGuardando]    = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => {
    if (!open || !voluntario) return;
    setCargando(true);
    setForm({ sedeId: '', programaId: '', horasSemanales: '', fechaInicio: '' });
    setError('');
    voluntariosRepository.listarAsignaciones(voluntario.id)
      .then(({ data }) => setAsignaciones(data))
      .catch(() => {})
      .finally(() => setCargando(false));
    sedesRepository.listar({ soloActivas: true }).then(({ data }) => setSedes(data)).catch(() => {});
  }, [open, voluntario]);

  useEffect(() => {
    if (!form.sedeId) { setProgramas([]); setForm(p => ({ ...p, programaId: '' })); return; }
    sedesRepository.listarProgramas(form.sedeId)
      .then(({ data }) => setProgramas(data))
      .catch(() => setProgramas([]));
    setForm(p => ({ ...p, programaId: '' }));
  }, [form.sedeId]);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const agregar = async () => {
    if (!form.sedeId && !form.programaId) { setError('Selecciona al menos una sede o programa.'); return; }
    setGuardando(true); setError('');
    try {
      const { data } = await voluntariosRepository.agregarAsignacion(voluntario.id, {
        programaId:     form.programaId || null,
        sedeId:         form.sedeId || null,
        horasSemanales: Number(form.horasSemanales) || 0,
        fechaInicio:    form.fechaInicio || null,
      });
      setAsignaciones(prev => [data, ...prev]);
      setForm({ sedeId: '', programaId: '', horasSemanales: '', fechaInicio: '' });
    } catch (e) {
      setError(e?.response?.data?.mensaje || 'Error al agregar.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (asig) => {
    if (!window.confirm('¿Eliminar esta asignación?')) return;
    try {
      await voluntariosRepository.eliminarAsignacion(asig.id);
      setAsignaciones(prev => prev.filter(a => a.id !== asig.id));
    } catch {}
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>
        Programas — {voluntario?.nombre}
      </DialogTitle>
      <DialogContent dividers>
        {/* Tabla asignaciones */}
        {cargando ? (
          <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress /></Box>
        ) : asignaciones.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
            <AssignmentIcon sx={{ fontSize: 40, color: '#ede9fe', mb: 1 }} />
            <Typography fontSize="0.9rem">Sin asignaciones aún</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#faf5ff' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Sede</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Programa</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Horas/sem</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Desde</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {asignaciones.map(a => (
                  <TableRow key={a.id} hover>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{a.nombreSede || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{a.nombrePrograma || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{a.horasSemanales > 0 ? `${a.horasSemanales}h` : '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{fmtFecha(a.fechaInicio) || '—'}</TableCell>
                    <TableCell align="right">
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

        {/* Agregar nueva asignación */}
        <Typography fontWeight={700} sx={{ mb: 1.5, color: COLOR, fontSize: '0.85rem' }}>
          Agregar asignación
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Sede</InputLabel>
              <Select value={form.sedeId} label="Sede" onChange={e => setF('sedeId', e.target.value)}>
                <MenuItem value=""><em>Sin sede</em></MenuItem>
                {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small" disabled={!form.sedeId || programas.length === 0}>
              <InputLabel>Programa</InputLabel>
              <Select value={form.programaId} label="Programa" onChange={e => setF('programaId', e.target.value)}>
                <MenuItem value=""><em>Sin programa</em></MenuItem>
                {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField fullWidth size="small" label="Horas/sem" type="number"
              value={form.horasSemanales} onChange={e => setF('horasSemanales', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField fullWidth size="small" label="Desde" type="date"
              value={form.fechaInicio} onChange={e => setF('fechaInicio', e.target.value)}
              InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid size={12}>
            <Button variant="contained" startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
              onClick={agregar} disabled={guardando}
              sx={{ bgcolor: COLOR, fontWeight: 700, '&:hover': { bgcolor: '#5b21b6' } }}>
              Agregar
            </Button>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function VoluntariosPage() {
  const [voluntarios,   setVoluntarios]   = useState([]);
  const [stats,         setStats]         = useState(null);
  const [cargando,      setCargando]      = useState(false);
  const [buscar,        setBuscar]        = useState('');
  const [dialVol,       setDialVol]       = useState({ open: false, voluntario: null });
  const [dialAsig,      setDialAsig]      = useState({ open: false, voluntario: null });
  const [snack,         setSnack]         = useState({ open: false, msg: '', sev: 'success' });

  const ok  = msg => setSnack({ open: true, msg, sev: 'success' });
  const err = msg => setSnack({ open: true, msg, sev: 'error' });

  const recargarStats = () =>
    voluntariosRepository.stats().then(({ data }) => setStats(data)).catch(() => {});

  const cargar = useCallback(async (q) => {
    setCargando(true);
    try {
      const { data } = await voluntariosRepository.listar(q ? { buscar: q } : {});
      setVoluntarios(data);
    } catch { err('No se pudieron cargar los voluntarios.'); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); recargarStats(); }, [cargar]);

  useEffect(() => {
    const t = setTimeout(() => cargar(buscar), 280);
    return () => clearTimeout(t);
  }, [buscar, cargar]);

  const handleGuardado = (data, editando) => {
    if (editando) setVoluntarios(prev => prev.map(v => v.id === data.id ? data : v));
    else setVoluntarios(prev => [data, ...prev]);
    setDialVol({ open: false, voluntario: null });
    ok(editando ? 'Voluntario actualizado.' : 'Voluntario creado.');
    recargarStats();
  };

  const handleEliminar = async (v) => {
    if (!window.confirm(`¿Eliminar a "${v.nombre}"? Si tiene asignaciones quedará inactivo.`)) return;
    try {
      await voluntariosRepository.eliminar(v.id);
      setVoluntarios(prev => prev.filter(x => x.id !== v.id));
      ok('Voluntario eliminado.');
      recargarStats();
    } catch { err('No se pudo eliminar.'); }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box sx={{ width: 4, height: 26, borderRadius: 1, bgcolor: COLOR }} />
            <Typography variant="h5" fontWeight={800}>Voluntarios</Typography>
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', pl: 0.5 }}>
            Personas que dedican su tiempo a la fundación
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => setDialVol({ open: true, voluntario: null })}
          sx={{ bgcolor: COLOR, fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#5b21b6' } }}>
          Nuevo voluntario
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<PeopleIcon />} label="Total voluntarios"
            value={stats?.totalVoluntarios ?? '—'} color={COLOR} loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<PersonIcon />} label="Activos"
            value={stats?.totalActivos ?? '—'} color="#059669" loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<AssignmentIcon />} label="Programas cubiertos"
            value={stats?.programasCubiertos ?? '—'} color="#d97706" loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<AccessTimeIcon />} label="Horas/semana (total)"
            value={stats ? `${stats.totalHorasSemanales}h` : '—'} color="#0ea5e9" loading={!stats} />
        </Grid>
      </Grid>

      {/* Búsqueda */}
      <Box sx={{ mb: 2.5 }}>
        <TextField size="small" placeholder="Buscar por nombre, documento, email o profesión…"
          value={buscar} onChange={e => setBuscar(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>,
            endAdornment: buscar
              ? <InputAdornment position="end"><IconButton size="small" onClick={() => setBuscar('')}><CloseIcon fontSize="small" /></IconButton></InputAdornment>
              : null,
          }}
          sx={{ width: { xs: '100%', sm: 380 } }}
        />
      </Box>

      {/* Grid */}
      {cargando && voluntarios.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
      ) : voluntarios.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center', border: '1.5px dashed #ede9fe', borderRadius: 2, bgcolor: '#faf5ff' }}>
          <PeopleIcon sx={{ fontSize: 48, color: '#c4b5fd', mb: 1.5 }} />
          <Typography fontWeight={700} color="text.secondary">
            {buscar ? 'No se encontraron voluntarios' : 'No hay voluntarios registrados'}
          </Typography>
          {!buscar && (
            <Button variant="contained" startIcon={<AddIcon />}
              sx={{ mt: 2, bgcolor: COLOR, fontWeight: 700 }}
              onClick={() => setDialVol({ open: true, voluntario: null })}>
              Registrar primer voluntario
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2} alignItems="stretch">
          {voluntarios.map(v => (
            <Grid key={v.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <VoluntarioCard
                voluntario={v}
                onEditar={x => setDialVol({ open: true, voluntario: x })}
                onEliminar={handleEliminar}
                onAsignaciones={x => setDialAsig({ open: true, voluntario: x })}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <VoluntarioDialog
        open={dialVol.open} voluntario={dialVol.voluntario}
        onClose={() => setDialVol({ open: false, voluntario: null })}
        onGuardado={handleGuardado}
      />

      <AsignacionesDialog
        open={dialAsig.open} voluntario={dialAsig.voluntario}
        onClose={() => setDialAsig({ open: false, voluntario: null })}
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

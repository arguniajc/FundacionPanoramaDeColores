import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, CircularProgress, Grid, IconButton,
  InputAdornment, Snackbar, TextField, Typography,
} from '@mui/material';
import AddIcon    from '@mui/icons-material/Add';
import CloseIcon  from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon  from '@mui/icons-material/Assignment';
import AccessTimeIcon  from '@mui/icons-material/AccessTime';
import SearchIcon from '@mui/icons-material/Search';
import { voluntariosRepository } from '../../../../infrastructure/repositories/voluntariosRepository';
import { useConfirm }             from '../../../../shared/components/ConfirmDialog';
import { COLOR }               from './components/helpers';
import { StatCard }            from './components/StatCard';
import { VoluntarioCard }      from './components/VoluntarioCard';
import { VoluntarioDialog }    from './components/VoluntarioDialog';
import { AsignacionesDialog }  from './components/AsignacionesDialog';

export default function VoluntariosPage() {
  const confirm = useConfirm();
  const [voluntarios, setVoluntarios] = useState([]);
  const [stats,       setStats]       = useState(null);
  const [cargando,    setCargando]    = useState(false);
  const [buscar,      setBuscar]      = useState('');
  const [dialVol,     setDialVol]     = useState({ open: false, voluntario: null });
  const [dialAsig,    setDialAsig]    = useState({ open: false, voluntario: null });
  const [snack,       setSnack]       = useState({ open: false, msg: '', sev: 'success' });

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

  const handleAsignacionCambio = useCallback(async (id) => {
    try {
      const { data } = await voluntariosRepository.obtener(id);
      setVoluntarios(prev => prev.map(v => v.id === id ? data : v));
    } catch {}
    recargarStats();
  }, []);

  const handleEliminar = async (v) => {
    if (!await confirm(`¿Eliminar a "${v.nombre}"? Si tiene asignaciones quedará inactivo.`)) return;
    try {
      await voluntariosRepository.eliminar(v.id);
      setVoluntarios(prev => prev.filter(x => x.id !== v.id));
      ok('Voluntario eliminado.');
      recargarStats();
    } catch { err('No se pudo eliminar.'); }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
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

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<PeopleIcon />}     label="Total voluntarios"    value={stats?.totalVoluntarios ?? '—'}               color={COLOR}     loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<PersonIcon />}     label="Nuevos este mes"      value={stats?.nuevosEsteMes ?? '—'}                  color="#059669"   loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<AssignmentIcon />} label="Programas cubiertos"  value={stats?.programasCubiertos ?? '—'}             color="#d97706"   loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<AccessTimeIcon />} label="Horas/semana (total)" value={stats ? `${stats.totalHorasSemanales}h` : '—'} color="#0ea5e9" loading={!stats} />
        </Grid>
      </Grid>

      <Box sx={{ mb: 2.5 }}>
        <TextField size="small" placeholder="Buscar por nombre, documento, email o profesión…"
          value={buscar} onChange={e => setBuscar(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>,
            endAdornment: buscar
              ? <InputAdornment position="end"><IconButton size="small" onClick={() => setBuscar('')}><CloseIcon fontSize="small" /></IconButton></InputAdornment>
              : null,
          }}
          sx={{ width: { xs: '100%', sm: 380 } }} />
      </Box>

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
              <VoluntarioCard voluntario={v}
                onEditar={x => setDialVol({ open: true, voluntario: x })}
                onEliminar={handleEliminar}
                onAsignaciones={x => setDialAsig({ open: true, voluntario: x })} />
            </Grid>
          ))}
        </Grid>
      )}

      <VoluntarioDialog
        open={dialVol.open} voluntario={dialVol.voluntario}
        onClose={() => setDialVol({ open: false, voluntario: null })}
        onGuardado={handleGuardado} />

      <AsignacionesDialog
        open={dialAsig.open} voluntario={dialAsig.voluntario}
        onClose={() => setDialAsig({ open: false, voluntario: null })}
        onCambio={handleAsignacionCambio} />

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

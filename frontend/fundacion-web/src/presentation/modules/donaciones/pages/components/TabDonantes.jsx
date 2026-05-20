import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, Grid, IconButton, InputAdornment, Snackbar, TextField, Typography,
} from '@mui/material';
import AddIcon               from '@mui/icons-material/Add';
import AttachMoneyIcon       from '@mui/icons-material/AttachMoney';
import CloseIcon             from '@mui/icons-material/Close';
import SearchIcon            from '@mui/icons-material/Search';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { donantesRepository } from '../../../../../infrastructure/repositories/donantesRepository';
import { useAuth }            from '../../../../../application/auth/AuthContext';
import { useConfirm }         from '../../../../../shared/components/ConfirmDialog';
import { COLOR_DONANTES, fmtMoney } from './helpers';
import { StatCard } from './StatCard';
import { DonanteCard }   from './DonanteCard';
import { DonanteDialog } from './DonanteDialog';

export function TabDonantes({ onNuevaDonacion }) {
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
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard icon={<VolunteerActivismIcon />} label="Total donantes"
            value={donantes.length} color={COLOR_DONANTES}
            borderColor="#c8e6c9" bgColor="#f9fdf9" loading={cargando} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard icon={<AttachMoneyIcon />} label="Total donado (dinero)"
            value={fmtMoney(totalDinero)} color="#d97706"
            borderColor="#fde68a" bgColor="#fffbf0" loading={cargando} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard icon={<VolunteerActivismIcon />} label="Con donaciones"
            value={totalConDonacion} color="#0ea5e9"
            borderColor="#bae6fd" bgColor="#f0f9ff" loading={cargando} />
        </Grid>
      </Grid>

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

      {cargando && donantes.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <VolunteerActivismIcon sx={{ fontSize: 48, color: '#a5d6a7', mb: 1.5 }} />
          <Typography fontWeight={700} color="text.secondary">Cargando donantes…</Typography>
        </Box>
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

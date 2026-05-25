import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Grid, Paper, Snackbar, Typography,
} from '@mui/material';
import AddIcon        from '@mui/icons-material/Add';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import apiClient from '@/infrastructure/http/apiClient';
import { DialogSede }     from './components/DialogSede';
import { DialogPrograma } from './components/DialogPrograma';
import { TarjetaSede }    from './components/TarjetaSede';

export default function SedesPage() {
  const [sedes,    setSedes]    = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error,    setError]    = useState('');
  const [toast,    setToast]    = useState('');

  const [dialogSede,      setDialogSede]      = useState({ abierto: false, inicial: null });
  const [dialogPrograma,  setDialogPrograma]  = useState({ abierto: false, sedeId: null, inicial: null });
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const [eliminando,      setEliminando]      = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try {
      const { data } = await apiClient.get('/api/sedes');
      setSedes(data);
    } catch {
      setError('No se pudieron cargar las sedes.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const handleGuardadoSede = (sedeActualizada) => {
    setSedes(prev => {
      const existe = prev.find(s => s.id === sedeActualizada.id);
      if (existe) return prev.map(s => s.id === sedeActualizada.id ? sedeActualizada : s);
      return [...prev, sedeActualizada];
    });
    setDialogSede({ abierto: false, inicial: null });
    setToast('Sede guardada correctamente');
  };

  const handleToggleSede = async (sede) => {
    try {
      const { data } = await apiClient.patch(`/api/sedes/${sede.id}/toggle`);
      setSedes(prev => prev.map(s => s.id === data.id ? data : s));
    } catch { setError('Error al cambiar estado de la sede.'); }
  };

  const handleEliminarSede = async () => {
    if (!confirmEliminar) return;
    setEliminando(true);
    try {
      await apiClient.delete(`/api/sedes/${confirmEliminar.item.id}`);
      setSedes(prev => prev.filter(s => s.id !== confirmEliminar.item.id));
      setConfirmEliminar(null);
      setToast('Sede eliminada');
    } catch { setError('No se pudo eliminar la sede. Puede que tenga programas activos.'); }
    finally { setEliminando(false); }
  };

  const handleGuardadoPrograma = (prog) => {
    setSedes(prev => prev.map(s => {
      if (s.id !== prog.sedeId) return s;
      const existe = s.programas?.find(p => p.id === prog.id);
      const programas = existe
        ? s.programas.map(p => p.id === prog.id ? prog : p)
        : [...(s.programas ?? []), prog];
      return { ...s, programas };
    }));
    setDialogPrograma({ abierto: false, sedeId: null, inicial: null });
    setToast('Programa guardado correctamente');
  };

  const handleTogglePrograma = async (prog) => {
    try {
      const { data } = await apiClient.patch(`/api/sedes/programas/${prog.id}/toggle`);
      setSedes(prev => prev.map(s => {
        if (s.id !== data.sedeId) return s;
        return { ...s, programas: s.programas.map(p => p.id === data.id ? data : p) };
      }));
    } catch { setError('Error al cambiar estado del programa.'); }
  };

  const handleEliminarPrograma = async () => {
    if (!confirmEliminar) return;
    setEliminando(true);
    try {
      await apiClient.delete(`/api/sedes/programas/${confirmEliminar.item.id}`);
      setSedes(prev => prev.map(s => ({
        ...s,
        programas: s.programas?.filter(p => p.id !== confirmEliminar.item.id) ?? [],
      })));
      setConfirmEliminar(null);
      setToast('Programa eliminado');
    } catch { setError('No se pudo eliminar el programa.'); }
    finally { setEliminando(false); }
  };

  const handleConfirmarEliminar = () => {
    if (confirmEliminar?.tipo === 'sede')    return handleEliminarSede();
    if (confirmEliminar?.tipo === 'programa') return handleEliminarPrograma();
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{
        background: 'linear-gradient(135deg, var(--color-primario), var(--color-secundario))',
        borderRadius: 3, p: { xs: 2, sm: 3 }, mb: 3, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2,
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <LocationOnIcon sx={{ fontSize: 32, opacity: 0.85 }} />
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>Sedes y Programas</Typography>
            <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.3 }}>
              Gestiona las sedes y los programas de la fundación
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => setDialogSede({ abierto: true, inicial: null })}
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }, fontWeight: 700 }}>
          Nueva sede
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {cargando ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress sx={{ color: 'var(--color-primario)' }} />
        </Box>
      ) : sedes.length === 0 ? (
        <Paper elevation={0} sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 5, textAlign: 'center' }}>
          <LocationOnIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
          <Typography color="text.secondary">No hay sedes registradas.</Typography>
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => setDialogSede({ abierto: true, inicial: null })}
            sx={{ mt: 2, bgcolor: 'var(--color-primario)' }}>
            Crear primera sede
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2} alignItems="flex-start">
          {sedes.map(sede => (
            <Grid key={sede.id} size={{ xs: 12, lg: 6 }}>
              <TarjetaSede sede={sede}
                onEditar={s    => setDialogSede({ abierto: true, inicial: s })}
                onEliminar={s  => setConfirmEliminar({ tipo: 'sede', item: s })}
                onToggle={handleToggleSede}
                onNuevoPrograma={s    => setDialogPrograma({ abierto: true, sedeId: s.id, inicial: null })}
                onEditarPrograma={(s, p) => setDialogPrograma({ abierto: true, sedeId: s.id, inicial: p })}
                onEliminarPrograma={p => setConfirmEliminar({ tipo: 'programa', item: p })}
                onTogglePrograma={handleTogglePrograma} />
            </Grid>
          ))}
        </Grid>
      )}

      <DialogSede abierto={dialogSede.abierto} inicial={dialogSede.inicial}
        onCerrar={() => setDialogSede({ abierto: false, inicial: null })}
        onGuardado={handleGuardadoSede} />

      <DialogPrograma abierto={dialogPrograma.abierto} sedeId={dialogPrograma.sedeId} inicial={dialogPrograma.inicial}
        onCerrar={() => setDialogPrograma({ abierto: false, sedeId: null, inicial: null })}
        onGuardado={handleGuardadoPrograma} />

      <Dialog open={!!confirmEliminar} onClose={() => setConfirmEliminar(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#c62828', fontWeight: 700 }}>
          ¿Eliminar {confirmEliminar?.tipo === 'sede' ? 'sede' : 'programa'}?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Se eliminará <strong>{confirmEliminar?.item?.nombre}</strong>. Esta acción no se puede deshacer.
            {confirmEliminar?.tipo === 'sede' && ' Se eliminarán también todos sus programas.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmEliminar(null)} variant="outlined">Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleConfirmarEliminar} disabled={eliminando}>
            {eliminando ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}

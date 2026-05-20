import { useState, useEffect } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, TextField, useMediaQuery, useTheme,
} from '@mui/material';
import apiClient from '../../../../../infrastructure/http/apiClient';

export function DialogSede({ abierto, onCerrar, onGuardado, inicial }) {
  const [form,     setForm]     = useState({ nombre: '', direccion: '', ciudad: '', telefono: '' });
  const [guardando, setGuardando] = useState(false);
  const [error,    setError]    = useState('');
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (abierto) setForm({
      nombre:    inicial?.nombre    ?? '',
      direccion: inicial?.direccion ?? '',
      ciudad:    inicial?.ciudad    ?? '',
      telefono:  inicial?.telefono  ?? '',
    });
    setError('');
  }, [abierto, inicial]);

  const set = campo => e => setForm(p => ({ ...p, [campo]: e.target.value }));

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setGuardando(true); setError('');
    try {
      const resp = inicial?.id
        ? await apiClient.put(`/api/sedes/${inicial.id}`, form)
        : await apiClient.post('/api/sedes', form);
      onGuardado(resp.data);
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onClose={onCerrar} maxWidth="sm" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2 } }}>
      <DialogTitle sx={{ bgcolor: 'var(--color-primario)', color: 'white', fontWeight: 700 }}>
        {inicial?.id ? 'Editar sede' : 'Nueva sede'}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2.5} mt={0}>
          <Grid size={12}>
            <TextField fullWidth label="Nombre *" size="small" value={form.nombre} onChange={set('nombre')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth label="Dirección" size="small" value={form.direccion} onChange={set('direccion')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Ciudad" size="small" value={form.ciudad} onChange={set('ciudad')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Teléfono" size="small" value={form.telefono} onChange={set('telefono')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardar}
          disabled={guardando || !form.nombre.trim()}
          sx={{ bgcolor: 'var(--color-primario)' }}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

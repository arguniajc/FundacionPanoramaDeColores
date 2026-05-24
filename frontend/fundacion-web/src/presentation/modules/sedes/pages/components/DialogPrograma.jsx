import { useState, useEffect } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, TextField, useMediaQuery, useTheme,
} from '@mui/material';
import apiClient from '../../../../../infrastructure/http/apiClient';

export function DialogPrograma({ abierto, onCerrar, onGuardado, sedeId, inicial }) {
  const [form,     setForm]     = useState({ nombre: '', descripcion: '', cupoMaximo: '' });
  const [guardando, setGuardando] = useState(false);
  const [error,    setError]    = useState('');
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (abierto) setForm({
      nombre:      inicial?.nombre      ?? '',
      descripcion: inicial?.descripcion ?? '',
      cupoMaximo:  inicial?.cupoMaximo  ?? '',
    });
    setError('');
  }, [abierto, inicial]);

  const set = campo => e => setForm(p => ({ ...p, [campo]: e.target.value }));

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setGuardando(true); setError('');
    try {
      const payload = {
        sedeId,
        nombre:      form.nombre,
        descripcion: form.descripcion || null,
        cupoMaximo:  form.cupoMaximo ? parseInt(form.cupoMaximo) : null,
      };
      const resp = inicial?.id
        ? await apiClient.put(`/api/sedes/programas/${inicial.id}`, payload)
        : await apiClient.post('/api/sedes/programas', payload);
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
      <DialogTitle sx={{ bgcolor: 'var(--color-secundario)', color: 'white', fontWeight: 700 }}>
        {inicial?.id ? 'Editar programa' : 'Nuevo programa'}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2.5} mt={0}>
          <Grid size={12}>
            <TextField fullWidth label="Nombre *" size="small" value={form.nombre} onChange={set('nombre')} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Descripción" size="small" multiline rows={2}
              value={form.descripcion} onChange={set('descripcion')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Cupo máximo" size="small" type="number"
              value={form.cupoMaximo} onChange={set('cupoMaximo')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardar}
          disabled={guardando || !form.nombre.trim()}
          sx={{ bgcolor: 'var(--color-secundario)' }}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

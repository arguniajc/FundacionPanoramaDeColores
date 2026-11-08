import { useState, useEffect } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, TextField, useMediaQuery, useTheme,
} from '@mui/material';
import apiClient from '@/infrastructure/http/apiClient';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { CampoCiudad } from '@/shared/components/form/FormControles';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  nombre:    { etiqueta: 'Nombre',    reglas: [r.obligatorio('Sede Siloé'), r.texto({ min: 3, max: 150 })] },
  direccion: { etiqueta: 'Dirección', reglas: [r.texto({ min: 5, max: 300, ejemplo: 'Calle 5 # 40-20' })] },
  telefono:  { etiqueta: 'Teléfono',  reglas: [r.telefono()] },
};

export function DialogSede({ abierto, onCerrar, onGuardado, inicial }) {
  const [form,     setForm]     = useState({ nombre: '', direccion: '', ciudad: '', telefono: '' });
  const [guardando, setGuardando] = useState(false);
  const [error,    setError]    = useState('');
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const v = useValidacion(ESQUEMA, form);
  const { reiniciar } = v;

  useEffect(() => {
    if (abierto) setForm({
      nombre:    inicial?.nombre    ?? '',
      direccion: inicial?.direccion ?? '',
      ciudad:    inicial?.ciudad    ?? '',
      telefono:  inicial?.telefono  ?? '',
    });
    setError('');
    reiniciar();
  }, [abierto, inicial, reiniciar]);

  const set = campo => e => setForm(p => ({ ...p, [campo]: e.target.value }));

  const handleGuardar = async () => {
    if (!v.validarTodo()) return;
    setGuardando(true); setError('');
    try {
      const resp = inicial?.id
        ? await apiClient.put(`/api/sedes/${inicial.id}`, form)
        : await apiClient.post('/api/sedes', form);
      onGuardado(resp.data);
    } catch (err) {
      setError(mensajeErrorApi(err, { accion: 'guardar la sede', conflicto: 'Ya existe una sede con ese nombre.' }));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : 2 } } }} open={abierto} onClose={onCerrar} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ bgcolor: 'var(--color-primario)', color: 'white', fontWeight: 700 }}>
        {inicial?.id ? 'Editar sede' : 'Nueva sede'}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid sx={{ mt: 0 }} container spacing={2.5}>
          <Grid size={12}>
            <TextField fullWidth label="Nombre *" size="small" value={form.nombre} onChange={set('nombre')}
              {...v.props('nombre')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth label="Dirección" size="small" value={form.direccion} onChange={set('direccion')}
              {...v.props('direccion')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CampoCiudad value={form.ciudad} onChange={v => setForm(p => ({ ...p, ciudad: v }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Teléfono" size="small" value={form.telefono} onChange={set('telefono')}
              {...v.props('telefono')} />
          </Grid>
        </Grid>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion={inicial?.id ? 'guardar' : 'crear la sede'} />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardar}
          disabled={guardando}
          sx={{ bgcolor: 'var(--color-primario)' }}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

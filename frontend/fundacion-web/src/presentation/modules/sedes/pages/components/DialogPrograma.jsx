import { useState, useEffect } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, TextField, useMediaQuery, useTheme,
} from '@mui/material';
import apiClient from '@/infrastructure/http/apiClient';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  nombre:      { etiqueta: 'Nombre',      reglas: [r.obligatorio('Escuela de fútbol'), r.texto({ min: 3, max: 150 })] },
  descripcion: { etiqueta: 'Descripción', reglas: [r.texto({ max: 500 })] },
  cupoMaximo:  { etiqueta: 'Cupo máximo', reglas: [r.numero({ min: 1, entero: true, unidad: 'cupos', ejemplo: '30' })] },
};

export function DialogPrograma({ abierto, onCerrar, onGuardado, sedeId, inicial }) {
  const [form,     setForm]     = useState({ nombre: '', descripcion: '', cupoMaximo: '' });
  const [guardando, setGuardando] = useState(false);
  const [error,    setError]    = useState('');
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const v = useValidacion(ESQUEMA, form);
  const { reiniciar } = v;

  useEffect(() => {
    if (abierto) setForm({
      nombre:      inicial?.nombre      ?? '',
      descripcion: inicial?.descripcion ?? '',
      cupoMaximo:  inicial?.cupoMaximo  ?? '',
    });
    setError('');
    reiniciar();
  }, [abierto, inicial, reiniciar]);

  const set = campo => e => setForm(p => ({ ...p, [campo]: e.target.value }));

  const handleGuardar = async () => {
    if (!v.validarTodo()) return;
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
    } catch (err) {
      setError(mensajeErrorApi(err, { accion: 'guardar el programa', conflicto: 'Ya existe un programa con ese nombre en la sede.' }));
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
            <TextField fullWidth label="Nombre *" size="small" value={form.nombre} onChange={set('nombre')}
              {...v.props('nombre')} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Descripción" size="small" multiline rows={2}
              value={form.descripcion} onChange={set('descripcion')} {...v.props('descripcion')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Cupo máximo" size="small" type="number"
              value={form.cupoMaximo} onChange={set('cupoMaximo')} {...v.props('cupoMaximo')} />
          </Grid>
        </Grid>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion={inicial?.id ? 'guardar' : 'crear el programa'} />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardar}
          disabled={guardando}
          sx={{ bgcolor: 'var(--color-secundario)' }}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

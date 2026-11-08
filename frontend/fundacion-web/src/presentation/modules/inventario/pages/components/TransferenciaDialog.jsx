import { useState, useEffect } from 'react';
import {
  Alert, Box, Button, CircularProgress, DialogActions, DialogContent,
  DialogTitle, FormControl, FormHelperText, Grid, InputAdornment, InputLabel, MenuItem, Select,
  TextField, Typography,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import { inventarioRepository } from '@/infrastructure/repositories/inventarioRepository';
import { fmtNum } from './helpers';
import { useTheme, alpha } from '@mui/material/styles';
import { colorEstado } from '@/shared/theme/paleta';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';

const aNumero = v => Number(String(v).replace(',', '.'));

// Reglas del formulario. `_origen`, `_stock` y `_unidad` se agregan al validar (dependen del artículo).
const ESQUEMA = {
  sedeDestinoId: { etiqueta: 'Sede destino', reglas: [
    r.seleccion('Sede Norte'),
    r.propia((v, f) => (v && f._origen && v === f._origen ? 'La sede destino debe ser distinta de la sede de origen.' : '')),
  ] },
  cantidad: { etiqueta: 'Cantidad', reglas: [
    r.obligatorio('5'),
    r.numero({ ejemplo: '5' }),
    r.propia(v => (aNumero(v) <= 0 ? 'La cantidad debe ser mayor que 0. Ejemplo: 5' : '')),
    // No se puede transferir más de lo que hay en la sede de origen
    r.propia((v, f) => {
      const stock = Number(f._stock) || 0;
      if (aNumero(v) <= stock) return '';
      return stock <= 0
        ? 'No hay unidades disponibles en esta sede para transferir.'
        : `Solo hay ${fmtNum(stock)} ${f._unidad || 'unidades'} disponibles en esta sede. Escribe una cantidad entre 1 y ${fmtNum(stock)}.`;
    }),
  ] },
};

export function TransferenciaDialog({ open, item, sedes, onClose, onTransferida }) {
  const theme = useTheme();
  const [form,      setForm]      = useState({ sedeDestinoId: '', cantidad: '', motivo: '' });
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const sedesDestino = sedes.filter(s => s.id !== item?.sedeId);
  const v = useValidacion(ESQUEMA, { ...form, _origen: item?.sedeId, _stock: item?.stockActual, _unidad: item?.unidadMedida });
  const { reiniciar } = v;

  useEffect(() => {
    if (open) { setForm({ sedeDestinoId: sedesDestino[0]?.id ?? '', cantidad: '', motivo: '' }); setError(''); reiniciar(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!v.validarTodo()) return;
    const cant = aNumero(form.cantidad);
    setGuardando(true); setError('');
    try {
      const { data } = await inventarioRepository.transferir({
        itemOrigenId: item.id,
        sedeDestinoId: form.sedeDestinoId,
        cantidad: cant,
        motivo: form.motivo || null,
      });
      onTransferida(data);
    } catch (e) {
      setError(mensajeErrorApi(e, { accion: 'realizar la transferencia' }));
    } finally {
      setGuardando(false);
    }
  };

  if (!item) return null;

  const sedeDest = sedes.find(s => s.id === form.sedeDestinoId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: 'info.main' }}>Transferir a otra sede</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          <strong>{item.nombre}</strong> · Stock: <strong>{fmtNum(item.stockActual)} {item.unidadMedida}</strong>
          {item.nombreSede && <> · Origen: <strong>{item.nombreSede}</strong></>}
        </Typography>
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={12}>
            <FormControl fullWidth size="small" error={!!v.err('sedeDestinoId')}>
              <InputLabel>Sede destino *</InputLabel>
              <Select value={form.sedeDestinoId} label="Sede destino *"
                onBlur={() => v.tocar('sedeDestinoId')}
                onChange={e => set('sedeDestinoId', e.target.value)}>
                {sedesDestino.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
              </Select>
              {v.err('sedeDestinoId') && <FormHelperText>{v.err('sedeDestinoId')}</FormHelperText>}
            </FormControl>
          </Grid>
          <Grid size={12}>
            <TextField slotProps={{ htmlInput: { min: 0.01, step: 1 }, input: { endAdornment: <InputAdornment position="end">{item.unidadMedida}</InputAdornment> } }} fullWidth size="small" label="Cantidad *" type="number" value={form.cantidad}
              onChange={e => set('cantidad', e.target.value)}
              {...v.props('cantidad')}
            />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Motivo (opcional)" value={form.motivo}
              onChange={e => set('motivo', e.target.value)} />
          </Grid>
          {form.cantidad > 0 && sedeDest && (
            <Grid size={12}>
              <Box sx={{ bgcolor: colorEstado('info', theme.palette.mode).fondo, border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.35), borderRadius: 1.5, px: 2, py: 1 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: colorEstado('info', theme.palette.mode).texto }}>
                  {item.nombreSede || 'Origen'} → {sedeDest.nombre}: {fmtNum(form.cantidad)} {item.unidadMedida}
                </Typography>
                <Typography sx={{ fontSize: '0.73rem', color: 'info.main' }}>
                  Si el artículo no existe en la sede destino, se creará automáticamente.
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion="realizar la transferencia" />
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}
          sx={{ bgcolor: '#0ea5e9', fontWeight: 700, '&:hover': { bgcolor: '#0284c7' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : 'Transferir'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

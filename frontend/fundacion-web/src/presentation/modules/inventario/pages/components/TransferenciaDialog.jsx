import { useState, useEffect } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, Grid, InputAdornment, InputLabel, MenuItem, Select,
  TextField, Typography,
} from '@mui/material';
import { inventarioRepository } from '../../../../../infrastructure/repositories/inventarioRepository';
import { fmtNum } from './helpers';

export function TransferenciaDialog({ open, item, sedes, onClose, onTransferida }) {
  const [form,      setForm]      = useState({ sedeDestinoId: '', cantidad: '', motivo: '' });
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const sedesDestino = sedes.filter(s => s.id !== item?.sedeId);

  useEffect(() => {
    if (open) { setForm({ sedeDestinoId: sedesDestino[0]?.id ?? '', cantidad: '', motivo: '' }); setError(''); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!form.sedeDestinoId) { setError('Seleccione la sede destino.'); return; }
    const cant = Number(form.cantidad);
    if (!cant || cant <= 0) { setError('La cantidad debe ser mayor a cero.'); return; }
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
      setError(e?.response?.data?.mensaje || 'Error al realizar la transferencia.');
    } finally {
      setGuardando(false);
    }
  };

  if (!item) return null;

  const sedeDest = sedes.find(s => s.id === form.sedeDestinoId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: '#0ea5e9' }}>Transferir a otra sede</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          <strong>{item.nombre}</strong> · Stock: <strong>{fmtNum(item.stockActual)} {item.unidadMedida}</strong>
          {item.nombreSede && <> · Origen: <strong>{item.nombreSede}</strong></>}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Sede destino *</InputLabel>
              <Select value={form.sedeDestinoId} label="Sede destino *"
                onChange={e => set('sedeDestinoId', e.target.value)}>
                {sedesDestino.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Cantidad *" type="number"
              inputProps={{ min: 0.01, step: 1 }} value={form.cantidad}
              onChange={e => set('cantidad', e.target.value)}
              InputProps={{ endAdornment: <InputAdornment position="end">{item.unidadMedida}</InputAdornment> }}
            />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Motivo (opcional)" value={form.motivo}
              onChange={e => set('motivo', e.target.value)} />
          </Grid>
          {form.cantidad > 0 && sedeDest && (
            <Grid size={12}>
              <Box sx={{ bgcolor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 1.5, px: 2, py: 1 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#1d4ed8' }}>
                  {item.nombreSede || 'Origen'} → {sedeDest.nombre}: {fmtNum(form.cantidad)} {item.unidadMedida}
                </Typography>
                <Typography sx={{ fontSize: '0.73rem', color: '#3b82f6' }}>
                  Si el artículo no existe en la sede destino, se creará automáticamente.
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
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

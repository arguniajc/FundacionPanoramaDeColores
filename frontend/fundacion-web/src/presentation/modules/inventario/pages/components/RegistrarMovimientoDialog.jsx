import { useState, useEffect, useRef } from 'react';
import {
  Alert, Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, Grid, InputAdornment, InputLabel,
  MenuItem, Select, TextField, Typography,
} from '@mui/material';
import { inventarioRepository } from '@/infrastructure/repositories/inventarioRepository';
import { COLOR, fmtNum } from './helpers';

export function RegistrarMovimientoDialog({ open, item, tipos, onClose, onRegistrado }) {
  const [form,      setForm]      = useState({ tipoMovimientoId: '', cantidad: '', motivo: '', donante: '', donanteObj: null, buscandoDonante: false });
  const [donantes,  setDonantes]  = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');
  const buscarTimer = useRef(null);

  const tiposFiltrados = tipos.filter(t => !t.codigo.startsWith('TRANSFERENCIA'));
  const tipoSel = tiposFiltrados.find(t => t.id === Number(form.tipoMovimientoId));
  const esDonacionRecibida = tipoSel?.codigo === 'DONACION_RECIBIDA';

  useEffect(() => {
    if (open) {
      setForm({ tipoMovimientoId: tiposFiltrados[0]?.id ?? '', cantidad: '', motivo: '', donante: '', donanteObj: null, buscandoDonante: false });
      setDonantes([]);
      setError('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const buscarDonantes = (texto) => {
    clearTimeout(buscarTimer.current);
    if (!texto || texto.length < 2) { setDonantes([]); return; }
    set('buscandoDonante', true);
    buscarTimer.current = setTimeout(async () => {
      try {
        const { data } = await inventarioRepository.buscarDonantes(texto);
        setDonantes(data);
      } catch {} finally {
        set('buscandoDonante', false);
      }
    }, 280);
  };

  const guardar = async () => {
    if (!form.tipoMovimientoId) { setError('Seleccione el tipo de movimiento.'); return; }
    const cant = Number(form.cantidad);
    if (!cant || cant <= 0) { setError('La cantidad debe ser mayor a cero.'); return; }
    setGuardando(true); setError('');
    try {
      const { data } = await inventarioRepository.registrarMovimiento({
        itemId: item.id,
        tipoMovimientoId: Number(form.tipoMovimientoId),
        cantidad: cant,
        motivo:    form.motivo || null,
        donante:   form.donanteObj ? form.donanteObj.nombre : (form.donante || null),
        donanteId: form.donanteObj?.id ?? null,
      });
      onRegistrado(item.id, data.nuevoStock);
    } catch (e) {
      setError(e?.response?.data?.mensaje || 'Error al registrar el movimiento.');
    } finally {
      setGuardando(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>Registrar movimiento</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          <strong>{item.nombre}</strong> · Stock: <strong>{fmtNum(item.stockActual)} {item.unidadMedida}</strong>
          {item.nombreSede && <> · <strong>{item.nombreSede}</strong></>}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de movimiento *</InputLabel>
              <Select value={form.tipoMovimientoId} label="Tipo de movimiento *"
                onChange={e => set('tipoMovimientoId', e.target.value)}>
                {tiposFiltrados.map(t => (
                  <MenuItem key={t.id} value={t.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: t.afectaStock === '+' ? '#16a34a' : '#dc2626' }} />
                      {t.nombre}
                    </Box>
                  </MenuItem>
                ))}
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
          {esDonacionRecibida && (
            <Grid size={12}>
              <Autocomplete
                freeSolo
                size="small"
                options={donantes}
                getOptionLabel={d => typeof d === 'string' ? d : `${d.nombre}${d.documento ? ` (${d.documento})` : ''}`}
                loading={form.buscandoDonante}
                onInputChange={(_, v) => { set('donante', v); buscarDonantes(v); }}
                onChange={(_, v) => set('donanteObj', typeof v === 'object' ? v : null)}
                renderInput={params => (
                  <TextField {...params} label="Donante" placeholder="Buscar donante o escribir nombre…"
                    InputProps={{ ...params.InputProps, endAdornment: form.buscandoDonante ? <CircularProgress size={16} /> : params.InputProps.endAdornment }} />
                )}
              />
            </Grid>
          )}
          <Grid size={12}>
            <TextField fullWidth size="small" label="Motivo / observación" multiline rows={2}
              value={form.motivo} onChange={e => set('motivo', e.target.value)} />
          </Grid>
          {tipoSel && form.cantidad && (
            <Grid size={12}>
              <Box sx={{
                bgcolor: tipoSel.afectaStock === '+' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${tipoSel.afectaStock === '+' ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: 1.5, px: 2, py: 1,
              }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: tipoSel.afectaStock === '+' ? '#15803d' : '#dc2626' }}>
                  Stock resultante estimado:{' '}
                  {tipoSel.afectaStock === '+'
                    ? fmtNum(Number(item.stockActual) + Number(form.cantidad || 0))
                    : fmtNum(Math.max(0, Number(item.stockActual) - Number(form.cantidad || 0)))
                  } {item.unidadMedida}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}
          sx={{ bgcolor: COLOR, fontWeight: 700, '&:hover': { bgcolor: '#3b1270' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

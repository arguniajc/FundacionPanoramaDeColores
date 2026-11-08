import { useState, useEffect, useRef } from 'react';
import {
  Alert, Autocomplete, Box, Button, CircularProgress, DialogActions,
  DialogContent, DialogTitle, FormControl, FormHelperText, Grid, InputAdornment, InputLabel,
  MenuItem, Select, TextField, Typography,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import { inventarioRepository } from '@/infrastructure/repositories/inventarioRepository';
import { COLOR, fmtNum } from './helpers';
import { useTheme, alpha } from '@mui/material/styles';
import { colorEstado } from '@/shared/theme/paleta';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';

const aNumero = v => Number(String(v).replace(',', '.'));

// Reglas del formulario. `_stock`, `_unidad` y `_sale` se agregan al validar (dependen del artículo y del tipo).
const ESQUEMA = {
  tipoMovimientoId: { etiqueta: 'Tipo de movimiento', reglas: [r.seleccion('Entrada por compra o Salida por entrega')] },
  cantidad: { etiqueta: 'Cantidad', reglas: [
    r.obligatorio('10'),
    r.numero({ ejemplo: '10' }),
    r.propia(v => (aNumero(v) <= 0 ? 'La cantidad debe ser mayor que 0. Ejemplo: 10' : '')),
    // En las salidas no se puede sacar más de lo que hay en la sede
    r.propia((v, f) => {
      if (!f._sale) return '';
      const stock = Number(f._stock) || 0;
      if (aNumero(v) <= stock) return '';
      return stock <= 0
        ? 'No hay unidades disponibles en esta sede, no se puede registrar una salida.'
        : `Solo hay ${fmtNum(stock)} ${f._unidad || 'unidades'} disponibles en esta sede. Escribe una cantidad entre 1 y ${fmtNum(stock)}.`;
    }),
  ] },
};

export function RegistrarMovimientoDialog({ open, item, tipos, onClose, onRegistrado }) {
  const theme = useTheme();
  const [form,      setForm]      = useState({ tipoMovimientoId: '', cantidad: '', motivo: '', donante: '', donanteObj: null, buscandoDonante: false });
  const [donantes,  setDonantes]  = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');
  const buscarTimer = useRef(null);

  const tiposFiltrados = tipos.filter(t => !t.codigo.startsWith('TRANSFERENCIA'));
  const tipoSel = tiposFiltrados.find(t => t.id === Number(form.tipoMovimientoId));
  const esDonacionRecibida = tipoSel?.codigo === 'DONACION_RECIBIDA';
  const v = useValidacion(ESQUEMA, {
    ...form, _stock: item?.stockActual, _unidad: item?.unidadMedida, _sale: !!tipoSel && tipoSel.afectaStock !== '+',
  });
  const { reiniciar } = v;

  useEffect(() => {
    if (open) {
      setForm({ tipoMovimientoId: tiposFiltrados[0]?.id ?? '', cantidad: '', motivo: '', donante: '', donanteObj: null, buscandoDonante: false });
      setDonantes([]);
      setError('');
      reiniciar();
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
      } catch { /* opcional: el donante también se puede escribir a mano */ } finally {
        set('buscandoDonante', false);
      }
    }, 280);
  };

  const guardar = async () => {
    if (!v.validarTodo()) return;
    const cant = aNumero(form.cantidad);
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
      setError(mensajeErrorApi(e, { accion: 'registrar el movimiento' }));
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
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={12}>
            <FormControl fullWidth size="small" error={!!v.err('tipoMovimientoId')}>
              <InputLabel id="registrar-movimiento-dialog-tipo-de-movimiento-label">Tipo de movimiento *</InputLabel>
              <Select labelId="registrar-movimiento-dialog-tipo-de-movimiento-label" value={form.tipoMovimientoId} label="Tipo de movimiento *"
                onBlur={() => v.tocar('tipoMovimientoId')}
                onChange={e => set('tipoMovimientoId', e.target.value)}>
                {tiposFiltrados.map(t => (
                  <MenuItem key={t.id} value={t.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: t.afectaStock === '+' ? 'success.main' : 'error.main' }} />
                      {t.nombre}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              {v.err('tipoMovimientoId') && <FormHelperText>{v.err('tipoMovimientoId')}</FormHelperText>}
            </FormControl>
          </Grid>
          <Grid size={12}>
            <TextField slotProps={{ htmlInput: { min: 0.01, step: 1 }, input: { endAdornment: <InputAdornment position="end">{item.unidadMedida}</InputAdornment> } }} fullWidth size="small" label="Cantidad *" type="number" value={form.cantidad}
              onChange={e => set('cantidad', e.target.value)}
              {...v.props('cantidad')}
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
                    slotProps={{ ...params.slotProps, input: { ...params.slotProps.input, endAdornment: form.buscandoDonante ? <CircularProgress size={16} /> : params.slotProps.input.endAdornment } }} />
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
                bgcolor: colorEstado(tipoSel.afectaStock === '+' ? 'exito' : 'error', theme.palette.mode).fondo,
                border: '1px solid', borderColor: alpha(tipoSel.afectaStock === '+' ? theme.palette.success.main : theme.palette.error.main, 0.35),
                borderRadius: 1.5, px: 2, py: 1,
              }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: colorEstado(tipoSel.afectaStock === '+' ? 'exito' : 'error', theme.palette.mode).texto }}>
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
      <ResumenErrores {...v.resumen} accion="registrar el movimiento" />
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}
          sx={{ bgcolor: COLOR, fontWeight: 700, '&:hover': { bgcolor: 'var(--color-gradiente)' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

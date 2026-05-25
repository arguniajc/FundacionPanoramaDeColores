import { useState, useEffect } from 'react';
import {
  Alert, Box, Button, CircularProgress, Collapse, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, Grid, InputLabel, MenuItem, Select, TextField, Typography,
} from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { inventarioRepository } from '@/infrastructure/repositories/inventarioRepository';
import { COLOR, CATEGORIAS } from './helpers';
import { CampoUnidadMedida } from '@/shared/components/form/FormControles';

const TIPOS_TENENCIA = [
  { value: 'propio',        label: 'Propio',              desc: 'Pertenece a la fundación' },
  { value: 'comodato',      label: 'Comodato',            desc: 'Prestado por entidad externa' },
  { value: 'donacion_uso',  label: 'Donación en uso',     desc: 'Donado para uso, sin transferencia de propiedad' },
  { value: 'arrendamiento', label: 'Arrendamiento',       desc: 'Alquilado por la fundación' },
];

const ITEM_VACIO = {
  nombre: '', descripcion: '', unidadMedida: 'unidad', categoria: 'Otros',
  stockActual: 0, stockMinimo: 0,
  tipoTenencia: 'propio', comodante: '', comodatoContrato: '',
  comodatoFechaInicio: '', comodatoFechaFin: '',
};

export function NuevoItemDialog({ open, item, sedes, sedeSelId, onClose, onGuardado }) {
  const editando = !!item;
  const [form,      setForm]      = useState(ITEM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (open) {
      setForm(item
        ? {
            nombre: item.nombre, descripcion: item.descripcion ?? '',
            unidadMedida: item.unidadMedida, categoria: item.categoria,
            stockActual: item.stockActual, stockMinimo: item.stockMinimo,
            tipoTenencia:       item.tipoTenencia       ?? 'propio',
            comodante:          item.comodante          ?? '',
            comodatoContrato:   item.comodatoContrato   ?? '',
            comodatoFechaInicio: item.comodatoFechaInicio ?? '',
            comodatoFechaFin:   item.comodatoFechaFin   ?? '',
          }
        : { ...ITEM_VACIO, sedeId: sedeSelId ?? '' });
      setError('');
    }
  }, [open, item, sedeSelId]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const esComodato = form.tipoTenencia === 'comodato';

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    if (Number(form.stockMinimo) < 0) { setError('El stock mínimo no puede ser negativo.'); return; }
    if (!editando && Number(form.stockActual) < 0) { setError('El stock inicial no puede ser negativo.'); return; }
    if (esComodato && !form.comodante.trim()) { setError('El nombre del comodante es obligatorio.'); return; }
    if (esComodato && form.comodatoFechaInicio && form.comodatoFechaFin &&
        form.comodatoFechaInicio > form.comodatoFechaFin) {
      setError('La fecha de inicio del contrato debe ser anterior a la fecha fin.'); return;
    }
    setGuardando(true); setError('');
    try {
      const comodatoPayload = {
        tipoTenencia:       form.tipoTenencia,
        comodante:          esComodato ? (form.comodante.trim()        || null) : null,
        comodatoContrato:   esComodato ? (form.comodatoContrato.trim() || null) : null,
        comodatoFechaInicio: esComodato ? (form.comodatoFechaInicio    || null) : null,
        comodatoFechaFin:   esComodato ? (form.comodatoFechaFin        || null) : null,
      };
      let result;
      if (editando) {
        const { data } = await inventarioRepository.actualizarItem(item.id, {
          nombre: form.nombre, descripcion: form.descripcion || null,
          unidadMedida: form.unidadMedida, categoria: form.categoria,
          stockMinimo: Number(form.stockMinimo),
          ...comodatoPayload,
        });
        result = data;
      } else {
        const { data } = await inventarioRepository.crearItem({
          sedeId: form.sedeId || null,
          nombre: form.nombre, descripcion: form.descripcion || null,
          unidadMedida: form.unidadMedida, categoria: form.categoria,
          stockActual: Number(form.stockActual), stockMinimo: Number(form.stockMinimo),
          ...comodatoPayload,
        });
        result = data;
      }
      onGuardado(result, editando);
    } catch (e) {
      setError(e?.response?.data?.mensaje || 'Error al guardar el artículo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>
        {editando ? 'Editar artículo' : 'Nuevo artículo'}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          {!editando && (
            <Grid size={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Sede *</InputLabel>
                <Select value={form.sedeId ?? ''} label="Sede *" onChange={e => set('sedeId', e.target.value)}>
                  {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid size={editando ? 8 : 12}>
            <TextField fullWidth size="small" label="Nombre *" value={form.nombre}
              onChange={e => set('nombre', e.target.value)} />
          </Grid>
          {editando && item?.codigo && (
            <Grid size={4}>
              <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, px: 1.5, py: '6px', bgcolor: 'action.hover' }}>
                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', lineHeight: 1 }}>Código</Typography>
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, fontFamily: 'monospace' }}>
                  {item.codigo}
                </Typography>
              </Box>
            </Grid>
          )}
          <Grid size={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Categoría</InputLabel>
              <Select value={form.categoria} label="Categoría" onChange={e => set('categoria', e.target.value)}>
                {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={6}>
            <CampoUnidadMedida value={form.unidadMedida} onChange={v => set('unidadMedida', v)} label="Unidad" />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Descripción" multiline rows={2}
              value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </Grid>
          {!editando && (
            <Grid size={6}>
              <TextField fullWidth size="small" label="Stock inicial" type="number"
                inputProps={{ min: 0, step: 1 }} value={form.stockActual}
                onChange={e => set('stockActual', e.target.value)} />
            </Grid>
          )}
          <Grid size={editando ? 12 : 6}>
            <TextField fullWidth size="small" label="Stock mínimo" type="number"
              inputProps={{ min: 0, step: 1 }} value={form.stockMinimo}
              onChange={e => set('stockMinimo', e.target.value)}
              helperText="Alerta cuando el stock baje de este valor" />
          </Grid>

          {/* Tipo de tenencia */}
          <Grid size={12}>
            <Divider sx={{ my: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                Tipo de tenencia
              </Typography>
            </Divider>
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de tenencia *</InputLabel>
              <Select value={form.tipoTenencia} label="Tipo de tenencia *"
                onChange={e => set('tipoTenencia', e.target.value)}>
                {TIPOS_TENENCIA.map(t => (
                  <MenuItem key={t.value} value={t.value}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{t.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.desc}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Campos de comodato — visibles solo cuando tipo = comodato */}
          <Grid size={12}>
            <Collapse in={esComodato} unmountOnExit>
              <Box sx={{ border: '1.5px solid #e8b84b', borderRadius: 2, p: 2, bgcolor: '#fffbea' }}>
                <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                  <HandshakeIcon sx={{ color: '#b45309', fontSize: 18 }} />
                  <Typography variant="caption" fontWeight={800} color="#b45309"
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Información del comodato
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField fullWidth size="small" label="Comodante (entidad que presta) *"
                      placeholder="Nombre de la entidad o persona que presta el artículo"
                      value={form.comodante} onChange={e => set('comodante', e.target.value)} />
                  </Grid>
                  <Grid size={12}>
                    <TextField fullWidth size="small" label="N° contrato / acta"
                      placeholder="Ej: CON-2024-001"
                      value={form.comodatoContrato} onChange={e => set('comodatoContrato', e.target.value)} />
                  </Grid>
                  <Grid size={6}>
                    <TextField fullWidth size="small" label="Fecha inicio contrato" type="date"
                      value={form.comodatoFechaInicio} onChange={e => set('comodatoFechaInicio', e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                      helperText="¿Cuándo inicia?" />
                  </Grid>
                  <Grid size={6}>
                    <TextField fullWidth size="small" label="Fecha fin / devolución" type="date"
                      value={form.comodatoFechaFin} onChange={e => set('comodatoFechaFin', e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                      helperText="¿Cuándo se devuelve?" />
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}
          sx={{ bgcolor: COLOR, fontWeight: 700, '&:hover': { bgcolor: '#3b1270' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : editando ? 'Guardar cambios' : 'Crear artículo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

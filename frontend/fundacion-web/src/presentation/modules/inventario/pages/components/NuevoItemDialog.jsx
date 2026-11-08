import { useState, useEffect } from 'react';
import {
  Alert, Box, Button, CircularProgress, Collapse, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, FormHelperText, Grid, InputLabel, MenuItem, Select, TextField, Typography,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { inventarioRepository } from '@/infrastructure/repositories/inventarioRepository';
import { COLOR, CATEGORIAS } from './helpers';
import { useTheme, alpha } from '@mui/material/styles';
import { colorEstado } from '@/shared/theme/paleta';
import { CampoUnidadMedida } from '@/shared/components/form/FormControles';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';

const esComodatoForm = f => f.tipoTenencia === 'comodato';

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo.
// `_editando` se agrega al validar: la sede y el stock inicial solo se piden al crear.
const ESQUEMA = {
  sedeId:       { etiqueta: 'Sede', reglas: [r.si(f => !f._editando, r.seleccion('Sede Principal'))] },
  nombre:       { etiqueta: 'Nombre', reglas: [r.obligatorio('Cuaderno cuadriculado 100 hojas'), r.texto({ min: 2, max: 150 })] },
  categoria:    { etiqueta: 'Categoría', reglas: [r.seleccion('Material escolar')] },
  unidadMedida: { etiqueta: 'Unidad', reglas: [r.obligatorio('unidad, kg o caja'), r.texto({ max: 50 })] },
  stockActual:  { etiqueta: 'Stock inicial', reglas: [r.si(f => !f._editando, r.numero({ min: 0, ejemplo: '20' }))] },
  stockMinimo:  { etiqueta: 'Stock mínimo', reglas: [r.numero({ min: 0, entero: true, ejemplo: '5' })] },
  comodante:    { etiqueta: 'Comodante', reglas: [r.si(esComodatoForm, r.obligatorio('Alcaldía de Cali')), r.texto({ max: 150 })] },
  comodatoFechaInicio: { etiqueta: 'Fecha inicio contrato', reglas: [r.si(esComodatoForm, r.fecha({ ejemplo: '2025-01-15' }))] },
  comodatoFechaFin:    { etiqueta: 'Fecha fin / devolución', reglas: [
    r.si(esComodatoForm, r.fecha({ ejemplo: '2025-12-31' })),
    r.si(esComodatoForm, r.fechaDesde('comodatoFechaInicio', 'la fecha de inicio del contrato')),
  ] },
};

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
  const theme = useTheme();
  const editando = !!item;
  const [form,      setForm]      = useState(ITEM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');
  const v = useValidacion(ESQUEMA, { ...form, _editando: editando });
  const { reiniciar } = v;

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
      reiniciar();
    }
  }, [open, item, sedeSelId, reiniciar]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const esComodato = form.tipoTenencia === 'comodato';

  const guardar = async () => {
    if (!v.validarTodo()) return;
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
      setError(mensajeErrorApi(e, { accion: 'guardar el artículo' }));
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
        <Grid container spacing={2}>
          {!editando && (
            <Grid size={12}>
              <FormControl fullWidth size="small" error={!!v.err('sedeId')}>
                <InputLabel>Sede *</InputLabel>
                <Select value={form.sedeId ?? ''} label="Sede *" onChange={e => set('sedeId', e.target.value)}
                  onBlur={() => v.tocar('sedeId')}>
                  {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                </Select>
                {v.err('sedeId') && <FormHelperText>{v.err('sedeId')}</FormHelperText>}
              </FormControl>
            </Grid>
          )}
          <Grid size={editando ? 8 : 12}>
            <TextField fullWidth size="small" label="Nombre *" value={form.nombre}
              onChange={e => set('nombre', e.target.value)} {...v.props('nombre')} />
          </Grid>
          {editando && item?.codigo && (
            <Grid size={4}>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: '6px', bgcolor: 'action.hover' }}>
                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', lineHeight: 1 }}>Código</Typography>
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, fontFamily: 'monospace' }}>
                  {item.codigo}
                </Typography>
              </Box>
            </Grid>
          )}
          <Grid size={6}>
            <FormControl fullWidth size="small" error={!!v.err('categoria')}>
              <InputLabel>Categoría</InputLabel>
              <Select value={form.categoria} label="Categoría" onChange={e => set('categoria', e.target.value)}
                onBlur={() => v.tocar('categoria')}>
                {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
              {v.err('categoria') && <FormHelperText>{v.err('categoria')}</FormHelperText>}
            </FormControl>
          </Grid>
          <Grid size={6}>
            <CampoUnidadMedida value={form.unidadMedida} onChange={u => set('unidadMedida', u)} label="Unidad" required />
            {v.err('unidadMedida') && <FormHelperText error>{v.err('unidadMedida')}</FormHelperText>}
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Descripción" multiline rows={2}
              value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </Grid>
          {!editando && (
            <Grid size={6}>
              <TextField slotProps={{ htmlInput: { min: 0, step: 1 } }} fullWidth size="small" label="Stock inicial" type="number" value={form.stockActual}
                onChange={e => set('stockActual', e.target.value)} {...v.props('stockActual')} />
            </Grid>
          )}
          <Grid size={editando ? 12 : 6}>
            <TextField slotProps={{ htmlInput: { min: 0, step: 1 } }} fullWidth size="small" label="Stock mínimo" type="number" value={form.stockMinimo}
              onChange={e => set('stockMinimo', e.target.value)}
              {...v.props('stockMinimo', 'Alerta cuando el stock baje de este valor')} />
          </Grid>

          {/* Tipo de tenencia */}
          <Grid size={12}>
            <Divider sx={{ my: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', px: 1 }}>
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
                      <Typography sx={{ fontWeight: 600 }} variant="body2">{t.label}</Typography>
                      <Typography sx={{ color: 'text.secondary' }} variant="caption">{t.desc}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Campos de comodato — visibles solo cuando tipo = comodato */}
          <Grid size={12}>
            <Collapse in={esComodato} unmountOnExit>
              <Box sx={{ border: '1.5px solid', borderColor: alpha(theme.palette.warning.main, 0.5), borderRadius: 2, p: 2, bgcolor: colorEstado('aviso', theme.palette.mode).fondo }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <HandshakeIcon sx={{ color: colorEstado('aviso', theme.palette.mode).texto, fontSize: 18 }} />
                  <Typography variant="caption"
                    sx={{ fontWeight: 800, color: colorEstado('aviso', theme.palette.mode).texto, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Información del comodato
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField fullWidth size="small" label="Comodante (entidad que presta) *"
                      placeholder="Nombre de la entidad o persona que presta el artículo"
                      value={form.comodante} onChange={e => set('comodante', e.target.value)} {...v.props('comodante')} />
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
                      {...v.props('comodatoFechaInicio', '¿Cuándo inicia?')} />
                  </Grid>
                  <Grid size={6}>
                    <TextField fullWidth size="small" label="Fecha fin / devolución" type="date"
                      value={form.comodatoFechaFin} onChange={e => set('comodatoFechaFin', e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                      {...v.props('comodatoFechaFin', '¿Cuándo se devuelve?')} />
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </Grid>
        </Grid>
      </DialogContent>
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mx: 3, mt: 1.5, mb: 0 }}>
          {error}
        </Alert>
      )}
      <ResumenErrores {...v.resumen} accion={editando ? 'guardar los cambios' : 'crear el artículo'} />
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}
          sx={{ bgcolor: COLOR, fontWeight: 700, '&:hover': { bgcolor: 'var(--color-gradiente)' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : editando ? 'Guardar cambios' : 'Crear artículo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

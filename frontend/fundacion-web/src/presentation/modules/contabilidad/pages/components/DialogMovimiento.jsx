import { useState, useEffect } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, FormHelperText, Grid, InputAdornment, InputLabel,
  MenuItem, Radio, RadioGroup, Select, TextField, Typography,
} from '@mui/material';
import { hoy } from './formato';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';

const TIPOS_SOPORTE = [
  'Factura electrónica', 'Recibo de caja', 'Consignación bancaria',
  'Comprobante de nómina', 'Comprobante de egreso', 'Otro',
];

const TARIFAS_RETENCION = [
  { label: '3.5% — Honorarios (persona jurídica)',   value: 3.5  },
  { label: '4% — Honorarios (persona natural)',       value: 4    },
  { label: '6% — Servicios generales',                value: 6    },
  { label: '10% — Arrendamientos',                    value: 10   },
  { label: '11% — Servicios de transporte de carga',  value: 11   },
  { label: '15% — Honorarios y comisiones especiales',value: 15   },
];

// Fecha no futura, comparada con hoy() (el mismo valor que se pone por defecto)
const noFutura = r.propia(v => (v && v > hoy() ? 'La fecha no puede ser futura. Revisa el día y el año.' : ''));
const esEgreso = form => form.tipo === 'egreso';

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  fecha:       { etiqueta: 'Fecha',         reglas: [r.obligatorio('2026-03-15'), r.fecha({ ejemplo: '2026-03-15' }), noFutura] },
  monto:       { etiqueta: 'Monto',         reglas: [r.obligatorio('150000'), r.monto('150000')] },
  concepto:    { etiqueta: 'Concepto',      reglas: [r.obligatorio('Compra de útiles escolares'), r.texto({ min: 3, ejemplo: 'Compra de útiles escolares' })] },
  cuentaId:    { etiqueta: 'Cuenta',        reglas: [r.seleccion('Caja general o la cuenta bancaria')] },
  categoriaId: { etiqueta: 'Categoría PUC', reglas: [r.seleccion('4120 — Donaciones (ingreso) o 5195 — Diversos (egreso)')] },
  terceroDocumento: { etiqueta: 'NIT / Documento del tercero', reglas: [
    r.propia(v => (!r.nit()(v) || !r.documento({ alfanumerico: true })(v) ? ''
      : 'Escribe el NIT con guion y dígito de verificación, o el documento sin puntos ni espacios. Ejemplo: 900123456-7 o 1144123456')),
  ] },
  retencionPracticada: { etiqueta: 'Valor retenido', reglas: [
    r.si(esEgreso, r.numero({ min: 0, unidad: 'pesos', ejemplo: '5250' })),
    r.si(esEgreso, r.propia((v, form) => (v && Number(form.monto) > 0 && Number(v) > Number(form.monto)
      ? 'La retención no puede ser mayor que el monto del movimiento.' : ''))),
  ] },
};

export function DialogMovimiento({
  open, modo, data, tipoPreset, cuentaPreset,
  cuentas, categorias, programas, guardando, onClose, onGuardar,
}) {
  const EMPTY = {
    tipo: tipoPreset ?? 'ingreso',
    fecha: hoy(),
    concepto: '',
    monto: '',
    cuentaId: '',
    categoriaId: '',
    programaId: '',
    terceroNombre: '',
    terceroDocumento: '',
    numeroSoporte: '',
    descripcion: '',
    tipoSoporte: '',
    tarifaRetencion: '',
    retencionPracticada: '',
    conceptoRetencion: '',
  };
  const [form, setForm] = useState(EMPTY);
  const v = useValidacion(ESQUEMA, form);
  const { reiniciar } = v;

  useEffect(() => {
    if (!open) return;
    reiniciar();
    if (modo === 'editar' && data) {
      setForm({
        tipo: data.tipo,
        fecha: data.fecha,
        concepto: data.concepto,
        monto: String(data.monto),
        cuentaId: data.cuentaId,
        categoriaId: String(data.categoriaId),
        programaId: data.programaId ?? '',
        terceroNombre: data.terceroNombre ?? '',
        terceroDocumento: data.terceroDocumento ?? '',
        numeroSoporte: data.numeroSoporte ?? '',
        descripcion: data.descripcion ?? '',
        tipoSoporte: data.tipoSoporte ?? '',
        tarifaRetencion: data.tarifaRetencion != null ? String(data.tarifaRetencion) : '',
        retencionPracticada: data.retencionPracticada != null ? String(data.retencionPracticada) : '',
        conceptoRetencion: data.conceptoRetencion ?? '',
      });
    } else if (modo === 'crear' && data) {
      // Pre-llenado desde OCR o duplicado
      setForm({
        ...EMPTY,
        tipo:             data.tipo             ?? tipoPreset ?? 'egreso',
        fecha:            data.fecha            ?? hoy(),
        concepto:         data.concepto         ?? '',
        monto:            data.monto            != null ? String(data.monto) : '',
        cuentaId:         data.cuentaId         ?? cuentaPreset ?? cuentas[0]?.id ?? '',
        categoriaId:      data.categoriaId      ? String(data.categoriaId) : '',
        programaId:       data.programaId       ?? '',
        terceroNombre:    data.terceroNombre    ?? '',
        terceroDocumento: data.terceroDocumento ?? '',
        numeroSoporte:    data.numeroSoporte    ?? '',
        descripcion:      data.descripcion      ?? '',
        tipoSoporte:      data.tipoSoporte      ?? '',
      });
    } else {
      setForm({ ...EMPTY, tipo: tipoPreset ?? 'ingreso', cuentaId: cuentaPreset ?? cuentas[0]?.id ?? '' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setTipo = e => setForm(f => ({ ...f, tipo: e.target.value, categoriaId: '', tarifaRetencion: '', retencionPracticada: '', conceptoRetencion: '' }));

  const handleTarifaChange = e => {
    const tarifa = e.target.value;
    const monto  = parseFloat(form.monto) || 0;
    const ret    = tarifa ? (monto * parseFloat(tarifa) / 100).toFixed(2) : '';
    setForm(f => ({ ...f, tarifaRetencion: tarifa, retencionPracticada: ret }));
  };

  const handleMontoChange = e => {
    const monto  = e.target.value;
    const tarifa = parseFloat(form.tarifaRetencion) || 0;
    const ret    = (tarifa && monto) ? (parseFloat(monto) * tarifa / 100).toFixed(2) : form.retencionPracticada;
    setForm(f => ({ ...f, monto, retencionPracticada: ret }));
  };

  const catsFiltradas = categorias.filter(c => c.tipo === form.tipo);
  const handleSubmit = () => {
    if (!v.validarTodo()) return;
    onGuardar({
      tipo: form.tipo,
      fecha: form.fecha,
      concepto: form.concepto.trim(),
      monto: parseFloat(form.monto),
      cuentaId: form.cuentaId,
      categoriaId: parseInt(form.categoriaId),
      programaId: form.programaId || null,
      terceroNombre: form.terceroNombre || null,
      terceroDocumento: form.terceroDocumento || null,
      numeroSoporte: form.numeroSoporte || null,
      descripcion: form.descripcion || null,
      tipoSoporte: form.tipoSoporte || null,
      tarifaRetencion: form.tarifaRetencion ? parseFloat(form.tarifaRetencion) : null,
      retencionPracticada: form.retencionPracticada ? parseFloat(form.retencionPracticada) : null,
      conceptoRetencion: form.conceptoRetencion || null,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {modo === 'crear'
          ? (form.tipo === 'ingreso' ? 'Registrar Ingreso' : 'Registrar Egreso')
          : 'Editar Movimiento'}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <RadioGroup row value={form.tipo} onChange={setTipo}>
              <FormControlLabel value="ingreso" control={<Radio color="success" />} label="Ingreso" />
              <FormControlLabel value="egreso"  control={<Radio color="error"   />} label="Egreso"  />
            </RadioGroup>
          </Grid>

          {modo === 'editar' && data?.consecutivo && (
            <Grid size={12}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: 'action.hover', borderRadius: 1, px: 1.5, py: 0.5 }}>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Comprobante N°</Typography>
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, fontFamily: 'monospace' }}>
                  {data.consecutivo}-{new Date(data.fecha).getFullYear?.() ?? data.fecha?.slice?.(0,4)}
                </Typography>
              </Box>
            </Grid>
          )}

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Fecha *" type="date" size="small"
              value={form.fecha} onChange={set('fecha')} InputLabelProps={{ shrink: true }}
              {...v.props('fecha')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Monto *" type="number" size="small"
              value={form.monto} onChange={handleMontoChange} {...v.props('monto')}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Concepto *" size="small"
              value={form.concepto} onChange={set('concepto')} {...v.props('concepto')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small" error={!!v.err('cuentaId')}>
              <InputLabel>Cuenta *</InputLabel>
              <Select value={form.cuentaId} label="Cuenta *" onChange={set('cuentaId')}
                onBlur={() => v.tocar('cuentaId')}>
                {cuentas.map(c => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
              </Select>
              {v.err('cuentaId') && <FormHelperText>{v.err('cuentaId')}</FormHelperText>}
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small" error={!!v.err('categoriaId')}>
              <InputLabel>Categoría PUC *</InputLabel>
              <Select value={form.categoriaId} label="Categoría PUC *" onChange={set('categoriaId')}
                onBlur={() => v.tocar('categoriaId')}>
                {catsFiltradas.map(c => (
                  <MenuItem key={c.id} value={String(c.id)}>{c.codigoPuc} — {c.nombre}</MenuItem>
                ))}
              </Select>
              {v.err('categoriaId') && <FormHelperText>{v.err('categoriaId')}</FormHelperText>}
            </FormControl>
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Programa (opcional)</InputLabel>
              <Select value={form.programaId} label="Programa (opcional)" onChange={set('programaId')}>
                <MenuItem value="">Sin programa</MenuItem>
                {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Nombre del tercero" size="small"
              value={form.terceroNombre} onChange={set('terceroNombre')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="NIT / Documento del tercero" size="small"
              value={form.terceroDocumento} onChange={set('terceroDocumento')}
              {...v.props('terceroDocumento')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="N° soporte / factura" size="small"
              value={form.numeroSoporte} onChange={set('numeroSoporte')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de soporte</InputLabel>
              <Select value={form.tipoSoporte} label="Tipo de soporte" onChange={set('tipoSoporte')}>
                <MenuItem value=""><em>Sin especificar</em></MenuItem>
                {TIPOS_SOPORTE.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          {form.tipo === 'egreso' && <>
            <Grid size={12}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Retención en la fuente (RTE)
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Tarifa de retención</InputLabel>
                <Select value={form.tarifaRetencion} label="Tarifa de retención" onChange={handleTarifaChange}>
                  <MenuItem value=""><em>Sin retención</em></MenuItem>
                  {TARIFAS_RETENCION.map(t => (
                    <MenuItem key={t.value} value={String(t.value)}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Valor retenido" size="small" type="number"
                value={form.retencionPracticada}
                onChange={set('retencionPracticada')}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                {...v.props('retencionPracticada', 'Se calcula automáticamente')} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="Concepto de retención" size="small"
                value={form.conceptoRetencion} onChange={set('conceptoRetencion')}
                placeholder="Ej: Honorarios por servicios contables" />
            </Grid>
          </>}

          <Grid size={12}>
            <TextField fullWidth label="Descripción adicional" size="small" multiline rows={2}
              value={form.descripcion} onChange={set('descripcion')} />
          </Grid>
        </Grid>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion={modo === 'crear' ? 'registrar el movimiento' : 'guardar el movimiento'} />
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={guardando}
          color={form.tipo === 'ingreso' ? 'success' : 'error'}>
          {guardando ? 'Guardando…' : (modo === 'crear' ? 'Registrar' : 'Guardar')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

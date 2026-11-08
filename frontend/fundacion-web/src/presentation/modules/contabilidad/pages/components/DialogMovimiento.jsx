import { useState, useEffect, useRef } from 'react';
import {
  Autocomplete, Box, DialogContent, DialogTitle,
  FormControl, FormControlLabel, FormHelperText, Grid, InputLabel,
  MenuItem, Radio, RadioGroup, Select, TextField, Typography,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import { hoy } from './formato';
import { calcularDvNit, r, vacio } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import { useCerrarConCambios, hayCambiosEn } from '@/shared/hooks/useCerrarConCambios';
import { useAutoFocus } from '@/shared/hooks/useAutoFocus';
import { AccionesDialogo, CampoMoneda, ErrorServidor } from '@/shared/components/form/FormControles';
import ResumenErrores from '@/shared/components/ResumenErrores';
import { donantesRepository } from '@/infrastructure/repositories/donantesRepository';
import { useAuth } from '@/application/auth/useAuth';

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
  concepto:    { etiqueta: 'Concepto',      reglas: [r.obligatorio('Compra de útiles escolares'), r.texto({ min: 3, max: 200, ejemplo: 'Compra de útiles escolares' })] },
  cuentaId:    { etiqueta: 'Cuenta',        reglas: [r.seleccion('Caja general o la cuenta bancaria')] },
  categoriaId: { etiqueta: 'Categoría PUC', reglas: [r.seleccion('4120 — Donaciones (ingreso) o 5195 — Diversos (egreso)')] },
  terceroNombre: { etiqueta: 'Nombre del tercero', reglas: [r.texto({ max: 200 })] },
  // numero_soporte es VARCHAR(100) en la BD, pero el servidor acepta máximo 50 (CrearMovimientoDto)
  numeroSoporte: { etiqueta: 'N° soporte / factura', reglas: [r.texto({ max: 50 })] },
  conceptoRetencion: { etiqueta: 'Concepto de retención', reglas: [r.si(esEgreso, r.texto({ max: 100 }))] },
  descripcion:   { etiqueta: 'Descripción adicional', reglas: [r.texto({ max: 1000 })] },
  terceroDocumento: { etiqueta: 'NIT / Documento del tercero', reglas: [
    r.propia(v => {
      if (vacio(v)) return '';
      const s = String(v).trim();
      // Con guion y un dígito es un NIT con DV: se comprueba el dígito (dice cuál debería ser)
      if (/^\d{6,10}-\d$/.test(s)) return r.nit()(s);
      return !r.documento({ alfanumerico: true })(s) ? ''
        : 'Escribe el NIT con guion y dígito de verificación, o el documento sin puntos ni espacios. Ejemplo: 900123456-8 o 1144123456';
    }),
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
  const [inicial, setInicial] = useState(EMPTY);
  const [error, setError] = useState('');
  const [opsTercero, setOpsTercero] = useState([]);
  const busquedaTercero = useRef(null);
  const { puedo } = useAuth();
  const puedeBuscarDonantes = puedo('donantes', 'ver') || puedo('donaciones', 'ver');
  const autoFocus = useAutoFocus();
  const v = useValidacion(ESQUEMA, form);
  const { reiniciar } = v;

  // Fija el formulario y la copia con la que se detectan cambios sin guardar
  const iniciar = datos => { setForm(datos); setInicial(datos); };

  useEffect(() => {
    if (!open) return;
    reiniciar();
    setError('');
    setOpsTercero([]);
    if (modo === 'editar' && data) {
      iniciar({
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
      iniciar({
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
      iniciar({ ...EMPTY, tipo: tipoPreset ?? 'ingreso', cuentaId: cuentaPreset ?? cuentas[0]?.id ?? '' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => clearTimeout(busquedaTercero.current), []);

  const { confirmarCierre } = useCerrarConCambios({
    hayCambios: hayCambiosEn(form, inicial), bloqueado: guardando, onCerrar: onClose,
  });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setTipo = e => setForm(f => ({ ...f, tipo: e.target.value, categoriaId: '', tarifaRetencion: '', retencionPracticada: '', conceptoRetencion: '' }));

  const handleTarifaChange = e => {
    const tarifa = e.target.value;
    const monto  = parseFloat(form.monto) || 0;
    const ret    = tarifa ? (monto * parseFloat(tarifa) / 100).toFixed(2) : '';
    setForm(f => ({ ...f, tarifaRetencion: tarifa, retencionPracticada: ret }));
  };

  // Tercero: sugiere donantes registrados mientras se escribe el nombre (llena nombre y documento)
  const buscarTerceros = texto => {
    clearTimeout(busquedaTercero.current);
    const q = texto.trim();
    if (!puedeBuscarDonantes || q.length < 2) { setOpsTercero([]); return; }
    busquedaTercero.current = setTimeout(async () => {
      try {
        const { data: lista } = await donantesRepository.listar({ buscar: q, soloActivos: true, porPagina: 10 });
        setOpsTercero(lista);
      } catch { setOpsTercero([]); /* opcional: sin sugerencias el tercero se escribe a mano */ }
    }, 300);
  };
  const elegirTercero = op => {
    if (!op) { setForm(f => ({ ...f, terceroNombre: '' })); return; }
    if (typeof op === 'string') { setForm(f => ({ ...f, terceroNombre: op })); return; }
    setForm(f => ({ ...f, terceroNombre: op.nombre, terceroDocumento: op.documento ?? f.terceroDocumento }));
  };
  // Documento solo con dígitos: si es un NIT, se sugiere su dígito de verificación
  const docTercero = form.terceroDocumento.trim();
  const dvTercero = /^\d{6,10}$/.test(docTercero) ? calcularDvNit(docTercero) : null;
  const ayudaTercero = dvTercero !== null
    ? `Si es un NIT, el dígito de verificación es ${dvTercero}: ${docTercero}-${dvTercero}` : undefined;

  const handleMontoChange = monto => {
    const tarifa = parseFloat(form.tarifaRetencion) || 0;
    const ret    = (tarifa && monto) ? (parseFloat(monto) * tarifa / 100).toFixed(2) : form.retencionPracticada;
    setForm(f => ({ ...f, monto, retencionPracticada: ret }));
  };

  const catsFiltradas = categorias.filter(c => c.tipo === form.tipo);
  const handleSubmit = async () => {
    if (guardando || !v.validarTodo()) return;
    setError('');
    const fallo = await onGuardar({
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
    if (fallo) setError(fallo);
  };

  return (
    <Dialog open={open} onClose={confirmarCierre} maxWidth="sm" fullWidth bloqueado={guardando} alEnviar={handleSubmit}>
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
              value={form.fecha} onChange={set('fecha')} slotProps={{ inputLabel: { shrink: true } }}
              {...v.props('fecha')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CampoMoneda label="Monto *" value={form.monto} onChange={handleMontoChange}
              autoFocus={autoFocus} {...v.props('monto')} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Concepto *" size="small"
              value={form.concepto} onChange={set('concepto')} {...v.props('concepto')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small" error={!!v.err('cuentaId')}>
              <InputLabel id="dialog-movimiento-cuenta-label">Cuenta *</InputLabel>
              <Select labelId="dialog-movimiento-cuenta-label" value={form.cuentaId} label="Cuenta *" onChange={set('cuentaId')}
                onBlur={() => v.tocar('cuentaId')}>
                {cuentas.map(c => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
              </Select>
              {v.err('cuentaId') && <FormHelperText>{v.err('cuentaId')}</FormHelperText>}
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small" error={!!v.err('categoriaId')}>
              <InputLabel id="dialog-movimiento-categoria-puc-label">Categoría PUC *</InputLabel>
              <Select labelId="dialog-movimiento-categoria-puc-label" value={form.categoriaId} label="Categoría PUC *" onChange={set('categoriaId')}
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
              <InputLabel id="dialog-movimiento-programa-opcional-label">Programa (opcional)</InputLabel>
              <Select labelId="dialog-movimiento-programa-opcional-label" value={form.programaId} label="Programa (opcional)" onChange={set('programaId')}>
                <MenuItem value="">Sin programa</MenuItem>
                {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete
              freeSolo
              options={opsTercero}
              filterOptions={x => x}
              getOptionLabel={o => (typeof o === 'string' ? o : o.nombre ?? '')}
              renderOption={({ key, ...props }, o) => (
                <Box component="li" key={key} {...props}>
                  {o.nombre}
                  {o.documento && <Box component="span" sx={{ ml: 1, color: 'text.secondary', fontSize: '0.8rem' }}>{o.documento}</Box>}
                </Box>
              )}
              value={form.terceroNombre || null}
              inputValue={form.terceroNombre}
              onChange={(_, op) => elegirTercero(op)}
              onInputChange={(_, texto, reason) => {
                if (reason !== 'input') return;
                setForm(f => ({ ...f, terceroNombre: texto }));
                buscarTerceros(texto);
              }}
              renderInput={p => (
                <TextField {...p} label="Nombre del tercero" size="small"
                  {...v.props('terceroNombre', puedeBuscarDonantes ? 'Escribe para buscar entre los donantes' : undefined)} />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="NIT / Documento del tercero" size="small"
              value={form.terceroDocumento} onChange={set('terceroDocumento')}
              slotProps={{ htmlInput: { inputMode: 'tel', autoComplete: 'off' } }}
              {...v.props('terceroDocumento', ayudaTercero)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="N° soporte / factura" size="small"
              value={form.numeroSoporte} onChange={set('numeroSoporte')}
              {...v.props('numeroSoporte')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="dialog-movimiento-tipo-de-soporte-label">Tipo de soporte</InputLabel>
              <Select labelId="dialog-movimiento-tipo-de-soporte-label" value={form.tipoSoporte} label="Tipo de soporte" onChange={set('tipoSoporte')}>
                <MenuItem value=""><em>Sin especificar</em></MenuItem>
                {TIPOS_SOPORTE.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          {form.tipo === 'egreso' && <>
            <Grid size={12}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Retención en la fuente (RTE)
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="dialog-movimiento-tarifa-de-retencion-label">Tarifa de retención</InputLabel>
                <Select labelId="dialog-movimiento-tarifa-de-retencion-label" value={form.tarifaRetencion} label="Tarifa de retención" onChange={handleTarifaChange}>
                  <MenuItem value=""><em>Sin retención</em></MenuItem>
                  {TARIFAS_RETENCION.map(t => (
                    <MenuItem key={t.value} value={String(t.value)}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CampoMoneda label="Valor retenido" decimales={2}
                value={form.retencionPracticada}
                onChange={ret => setForm(f => ({ ...f, retencionPracticada: ret }))}
                {...v.props('retencionPracticada', 'Se calcula automáticamente')} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="Concepto de retención" size="small"
                value={form.conceptoRetencion} onChange={set('conceptoRetencion')}
                placeholder="Ej: Honorarios por servicios contables"
                {...v.props('conceptoRetencion')} />
            </Grid>
          </>}

          <Grid size={12}>
            <TextField fullWidth label="Descripción adicional" size="small" multiline rows={2}
              value={form.descripcion} onChange={set('descripcion')}
              {...v.props('descripcion')} />
          </Grid>
        </Grid>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion={modo === 'crear' ? 'registrar el movimiento' : 'guardar el movimiento'} />
      <ErrorServidor mensaje={error} onClose={() => setError('')} />
      <AccionesDialogo onCancelar={confirmarCierre} guardando={guardando} enviar
        textoGuardar={modo === 'crear' ? 'Registrar' : 'Guardar'}
        colorGuardar={form.tipo === 'ingreso' ? 'success' : 'error'} />
    </Dialog>
  );
}

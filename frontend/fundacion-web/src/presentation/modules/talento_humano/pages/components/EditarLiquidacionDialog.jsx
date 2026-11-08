import { useEffect, useState } from 'react';
import {
  Box, DialogContent, DialogTitle, Grid, TextField, Typography,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import { nominaRepository } from '@/infrastructure/repositories/nominaRepository';
import { mensajeErrorApi }  from '@/shared/utils/mensajeErrorApi';
import { r }                from '@/shared/utils/validacion';
import { useValidacion }    from '@/shared/hooks/useValidacion';
import ResumenErrores       from '@/shared/components/ResumenErrores';
import { CampoMoneda, AccionesDialogo, ErrorServidor } from '@/shared/components/form/FormControles';
import { useCerrarConCambios, hayCambiosEn } from '@/shared/hooks/useCerrarConCambios';
import { useAutoFocus }     from '@/shared/hooks/useAutoFocus';
import {
  fmtCOP, fmtPorcentaje, calcularLiquidacion as calcular,
  PARAMETROS_NOMINA_DEFECTO, normalizarParametrosNomina,
} from './nominaFormato';

const pesos = ejemplo => r.numero({ min: 0, unidad: 'pesos', ejemplo });

// Las mismas reglas que valida el servidor (NominaService.ValidarLiquidacion)
const ESQUEMA = {
  diasTrabajados:   { etiqueta: 'Días trabajados',       reglas: [r.obligatorio('30'), r.numero({ min: 0, max: 30, entero: true, unidad: 'días', ejemplo: '30' })] },
  salario:          { etiqueta: 'Salario base',          reglas: [r.obligatorio('1423500'), r.monto('1423500')] },
  horasExtras:      { etiqueta: 'Horas extras',          reglas: [pesos('85000')] },
  bonificaciones:   { etiqueta: 'Bonificaciones',        reglas: [pesos('100000')] },
  retencionFuente:  { etiqueta: 'Retención en la fuente', reglas: [pesos('0')] },
  otrasDeducciones: { etiqueta: 'Otras deducciones',     reglas: [pesos('50000')] },
  observacion:      { etiqueta: 'Observación',           reglas: [r.texto({ max: 500 })] },
};

const formDesde = liq => ({
  diasTrabajados:   String(liq?.diasTrabajados ?? 30),
  salario:          String(liq?.salarioBase ?? ''),
  horasExtras:      String(liq?.horasExtras ?? 0),
  bonificaciones:   String(liq?.bonificaciones ?? 0),
  retencionFuente:  String(liq?.retencionFuente ?? 0),
  otrasDeducciones: String(liq?.otrasDeducciones ?? 0),
  observacion:      liq?.observacion ?? '',
});

const n = v => Number(v) || 0;

/** Edita una liquidación de un período en borrador. */
export function EditarLiquidacionDialog({ liquidacion, onClose, onGuardada }) {
  const open = Boolean(liquidacion);
  const [form, setForm] = useState(() => formDesde(liquidacion));
  const [inicial, setInicial] = useState(() => formDesde(liquidacion));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const v = useValidacion(ESQUEMA, form);
  const { reiniciar } = v;
  const autoFocus = useAutoFocus();
  const hayCambios = open && hayCambiosEn(form, inicial);
  const { confirmarCierre } = useCerrarConCambios({ hayCambios, bloqueado: guardando, onCerrar: onClose });

  // Al abrir con otra liquidación se carga su formulario (durante el render, no en un efecto)
  const [cargadaId, setCargadaId] = useState(liquidacion?.id ?? null);
  if ((liquidacion?.id ?? null) !== cargadaId) {
    setCargadaId(liquidacion?.id ?? null);
    if (liquidacion) {
      const datos = formDesde(liquidacion);
      setForm(datos);
      setInicial(datos);
      setError('');
      reiniciar();
    }
  }

  // Parámetros vigentes (SMLMV, auxilio, tasas de Configuración → Nómina) para la vista previa;
  // se leen al abrir: si fallan se usan los valores por defecto (el servidor recalcula al guardar)
  const [parametros, setParametros] = useState(PARAMETROS_NOMINA_DEFECTO);
  const [sinParametros, setSinParametros] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    let vigente = true;
    nominaRepository.parametros()
      .then(({ data }) => { if (vigente) { setParametros(normalizarParametrosNomina(data)); setSinParametros(false); } })
      .catch(() => { if (vigente) setSinParametros(true); });
    return () => { vigente = false; };
  }, [open]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setValor = (k, valor) => setForm(f => ({ ...f, [k]: valor }));
  const t = calcular(form, parametros);

  const guardar = async () => {
    if (guardando || !v.validarTodo()) return;
    setGuardando(true); setError('');
    try {
      const { data } = await nominaRepository.editarLiquidacion(liquidacion.id, {
        diasTrabajados:   n(form.diasTrabajados),
        salarioOverride:  n(form.salario),
        horasExtras:      n(form.horasExtras),
        bonificaciones:   n(form.bonificaciones),
        retencionFuente:  n(form.retencionFuente),
        otrasDeducciones: n(form.otrasDeducciones),
        observacion:      form.observacion.trim() || null,
      });
      onGuardada(data);
    } catch (e) {
      setError(mensajeErrorApi(e, { accion: 'guardar la liquidación' }));
    } finally {
      setGuardando(false);
    }
  };

  const campoPesos = (campo, label, ayuda) => (
    <CampoMoneda label={label} value={form[campo]} onChange={m => setValor(campo, m)}
      {...v.props(campo, ayuda)} />
  );

  return (
    <Dialog open={open} onClose={confirmarCierre} alEnviar={guardar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Editar liquidación
        {liquidacion && (
          <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
            {liquidacion.empleadoNombre}{liquidacion.cargo ? ` · ${liquidacion.cargo}` : ''}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" type="text" label="Días trabajados *" autoFocus={autoFocus}
              value={form.diasTrabajados} onChange={e => setValor('diasTrabajados', e.target.value.replace(/D/g, ''))}
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 2 } }}
              {...v.props('diasTrabajados', 'De 0 a 30')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            {campoPesos('salario', 'Salario base *', 'Salario mensual del empleado')}
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>{campoPesos('horasExtras', 'Horas extras')}</Grid>
          <Grid size={{ xs: 12, sm: 6 }}>{campoPesos('bonificaciones', 'Bonificaciones')}</Grid>
          <Grid size={{ xs: 12, sm: 6 }}>{campoPesos('retencionFuente', 'Retención en la fuente')}</Grid>
          <Grid size={{ xs: 12, sm: 6 }}>{campoPesos('otrasDeducciones', 'Otras deducciones')}</Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" multiline rows={2} label="Observación (opcional)"
              value={form.observacion} onChange={set('observacion')} {...v.props('observacion')} />
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'superficie2', display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 0.5, columnGap: 2, fontSize: '0.82rem' }}>
          <Typography sx={{ fontSize: 'inherit', color: 'text.secondary' }}>Salario del período ({n(form.diasTrabajados)} de 30 días)</Typography>
          <Typography sx={{ fontSize: 'inherit', fontFamily: 'monospace', textAlign: 'right' }}>{fmtCOP(t.salario)}</Typography>
          <Typography sx={{ fontSize: 'inherit', color: 'text.secondary' }}>Auxilio de transporte</Typography>
          <Typography sx={{ fontSize: 'inherit', fontFamily: 'monospace', textAlign: 'right' }}>{fmtCOP(t.aux)}</Typography>
          <Typography sx={{ fontSize: 'inherit', color: 'text.secondary' }}>Salud ({fmtPorcentaje(parametros.tasaSalud)}) + pensión ({fmtPorcentaje(parametros.tasaPension)})</Typography>
          <Typography sx={{ fontSize: 'inherit', fontFamily: 'monospace', textAlign: 'right' }}>{fmtCOP(t.salud + t.pension)}</Typography>
          <Typography sx={{ fontSize: 'inherit', color: 'text.secondary' }}>Total devengado</Typography>
          <Typography sx={{ fontSize: 'inherit', fontFamily: 'monospace', textAlign: 'right' }}>{fmtCOP(t.devengado)}</Typography>
          <Typography sx={{ fontSize: 'inherit', color: 'text.secondary' }}>Total deducciones</Typography>
          <Typography sx={{ fontSize: 'inherit', fontFamily: 'monospace', textAlign: 'right', color: 'error.main' }}>{fmtCOP(t.deduccion)}</Typography>
          <Typography sx={{ fontSize: 'inherit', fontWeight: 700 }}>Neto a pagar (estimado)</Typography>
          <Typography sx={{ fontSize: 'inherit', fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, color: 'success.main' }}>{fmtCOP(t.neto)}</Typography>
        </Box>
        {sinParametros && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
            No se pudieron leer el salario mínimo y las tasas vigentes: la vista previa usa los valores por defecto.
            Al guardar, el sistema recalcula con los valores de Configuración → Nómina.
          </Typography>
        )}
      </DialogContent>
      <ResumenErrores {...v.resumen} accion="guardar la liquidación" />
      <ErrorServidor mensaje={error} onClose={() => setError('')} />
      <AccionesDialogo onCancelar={confirmarCierre} guardando={guardando} enviar />
    </Dialog>
  );
}

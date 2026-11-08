import { useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, DialogActions, DialogContent, DialogTitle,
  Grid, InputAdornment, TextField, Typography,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import { nominaRepository } from '@/infrastructure/repositories/nominaRepository';
import { mensajeErrorApi }  from '@/shared/utils/mensajeErrorApi';
import { r }                from '@/shared/utils/validacion';
import { useValidacion }    from '@/shared/hooks/useValidacion';
import ResumenErrores       from '@/shared/components/ResumenErrores';
import { fmtCOP, calcularLiquidacion as calcular } from './nominaFormato';

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
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const v = useValidacion(ESQUEMA, form);
  const { reiniciar } = v;

  // Al abrir con otra liquidación se carga su formulario (durante el render, no en un efecto)
  const [cargadaId, setCargadaId] = useState(liquidacion?.id ?? null);
  if ((liquidacion?.id ?? null) !== cargadaId) {
    setCargadaId(liquidacion?.id ?? null);
    if (liquidacion) {
      setForm(formDesde(liquidacion));
      setError('');
      reiniciar();
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const t = calcular(form);

  const guardar = async () => {
    if (!v.validarTodo()) return;
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
    <TextField fullWidth size="small" type="number" label={label}
      value={form[campo]} onChange={set(campo)}
      slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
      {...v.props(campo, ayuda)} />
  );

  return (
    <Dialog open={open} onClose={guardando ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Editar liquidación
        {liquidacion && (
          <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
            {liquidacion.empleadoNombre}{liquidacion.cargo ? ` · ${liquidacion.cargo}` : ''}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" type="number" label="Días trabajados *"
              value={form.diasTrabajados} onChange={set('diasTrabajados')}
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
          <Typography sx={{ fontSize: 'inherit', color: 'text.secondary' }}>Salud (4%) + pensión (4%)</Typography>
          <Typography sx={{ fontSize: 'inherit', fontFamily: 'monospace', textAlign: 'right' }}>{fmtCOP(t.salud + t.pension)}</Typography>
          <Typography sx={{ fontSize: 'inherit', color: 'text.secondary' }}>Total devengado</Typography>
          <Typography sx={{ fontSize: 'inherit', fontFamily: 'monospace', textAlign: 'right' }}>{fmtCOP(t.devengado)}</Typography>
          <Typography sx={{ fontSize: 'inherit', color: 'text.secondary' }}>Total deducciones</Typography>
          <Typography sx={{ fontSize: 'inherit', fontFamily: 'monospace', textAlign: 'right', color: 'error.main' }}>{fmtCOP(t.deduccion)}</Typography>
          <Typography sx={{ fontSize: 'inherit', fontWeight: 700 }}>Neto a pagar (estimado)</Typography>
          <Typography sx={{ fontSize: 'inherit', fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, color: 'success.main' }}>{fmtCOP(t.neto)}</Typography>
        </Box>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion="guardar la liquidación" />
      <DialogActions>
        <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}>
          {guardando ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

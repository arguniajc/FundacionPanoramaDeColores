import { useState } from 'react';
import {
  Alert, DialogContent, DialogTitle, Grid, TextField,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import { fmt, hoy } from './formato';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import { useCerrarConCambios, hayCambiosEn } from '@/shared/hooks/useCerrarConCambios';
import { useAutoFocus } from '@/shared/hooks/useAutoFocus';
import { AccionesDialogo, CampoMoneda, ErrorServidor } from '@/shared/components/form/FormControles';
import ResumenErrores from '@/shared/components/ResumenErrores';

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  fecha: { etiqueta: 'Fecha del arqueo', reglas: [
    r.obligatorio('2026-03-15'), r.fecha({ ejemplo: '2026-03-15' }),
    // No futura, comparada con hoy() (el mismo valor que se pone por defecto)
    r.propia(v => (v && v > hoy() ? 'La fecha no puede ser futura. Revisa el día y el año.' : '')),
  ] },
  // Puede ser 0 si la caja está vacía
  saldoFisico: { etiqueta: 'Conteo físico (efectivo)', reglas: [r.obligatorio('185000'), r.numero({ min: 0, unidad: 'pesos', ejemplo: '185000' })] },
  responsable: { etiqueta: 'Responsable del arqueo',   reglas: [r.texto({ min: 3, max: 120, soloLetras: true, ejemplo: 'Ana Gómez' })] },
};

const nuevoArqueo = () => ({ fecha: hoy(), saldoFisico: '', observacion: '', responsable: '' });

export function DialogArqueo({ open, cuenta, guardando, onClose, onGuardar }) {
  const [form, setForm] = useState(nuevoArqueo);
  const [inicial, setInicial] = useState(nuevoArqueo);
  const [error, setError] = useState('');
  const autoFocus = useAutoFocus();
  const v = useValidacion(ESQUEMA, form);
  const { reiniciar } = v;

  // Al abrir se reinicia el formulario. Se ajusta durante el render al detectar el cambio, en vez de en un efecto.
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (open !== abiertoAntes) {
    setAbiertoAntes(open);
    if (open) {
      const datos = nuevoArqueo();
      setForm(datos);
      setInicial(datos);
      setError('');
      reiniciar();
    }
  }

  const { confirmarCierre } = useCerrarConCambios({
    hayCambios: hayCambiosEn(form, inicial), bloqueado: guardando, onCerrar: onClose,
  });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const saldoFisicoNum = Number(form.saldoFisico) || 0;
  const diferencia     = form.saldoFisico !== '' ? saldoFisicoNum - (cuenta?.saldoActual ?? 0) : null;

  const guardar = async () => {
    if (guardando || !v.validarTodo()) return;
    setError('');
    const fallo = await onGuardar({
      cuentaId:    cuenta?.id,
      fecha:       form.fecha,
      saldoFisico: saldoFisicoNum,
      observacion: form.observacion || null,
      responsable: form.responsable || null,
    });
    if (fallo) setError(fallo);
  };

  return (
    <Dialog open={open} onClose={confirmarCierre} maxWidth="sm" fullWidth bloqueado={guardando} alEnviar={guardar}>
      <DialogTitle>Arqueo de Caja — {cuenta?.nombre}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Saldo registrado en sistema: <strong>{fmt(cuenta?.saldoActual)}</strong>
        </Alert>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Fecha del arqueo *" type="date" size="small"
              value={form.fecha} onChange={set('fecha')} slotProps={{ inputLabel: { shrink: true } }}
              {...v.props('fecha')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CampoMoneda label="Conteo físico (efectivo) *" autoFocus={autoFocus}
              value={form.saldoFisico} onChange={s => setForm(f => ({ ...f, saldoFisico: s }))}
              {...v.props('saldoFisico', 'Cuente el efectivo físico en caja')} />
          </Grid>
          {diferencia !== null && (
            <Grid size={12}>
              <Alert severity={diferencia === 0 ? 'success' : diferencia > 0 ? 'warning' : 'error'}>
                <strong>Diferencia: {diferencia > 0 ? '+' : ''}{fmt(diferencia)}</strong>
                {diferencia === 0 && ' — Cuadre exacto ✓'}
                {diferencia > 0 && ' — Sobrante de caja'}
                {diferencia < 0 && ' — Faltante de caja'}
              </Alert>
            </Grid>
          )}
          <Grid size={12}>
            <TextField fullWidth label="Responsable del arqueo" size="small"
              value={form.responsable} onChange={set('responsable')} {...v.props('responsable')} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Observaciones" size="small" multiline rows={2}
              value={form.observacion} onChange={set('observacion')} />
          </Grid>
        </Grid>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion="registrar el arqueo" />
      <ErrorServidor mensaje={error} onClose={() => setError('')} />
      <AccionesDialogo onCancelar={confirmarCierre} guardando={guardando} enviar textoGuardar="Registrar Arqueo" />
    </Dialog>
  );
}

import { useState } from 'react';
import {
  DialogContent, DialogTitle,
  FormControl, Grid, InputLabel, MenuItem, Select, TextField,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import { useCerrarConCambios, hayCambiosEn } from '@/shared/hooks/useCerrarConCambios';
import { useAutoFocus } from '@/shared/hooks/useAutoFocus';
import { AccionesDialogo, CampoMoneda, ErrorServidor } from '@/shared/components/form/FormControles';
import ResumenErrores from '@/shared/components/ResumenErrores';

const esBancaria = form => form.tipo === 'cuenta_bancaria';

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  nombre:       { etiqueta: 'Nombre',           reglas: [r.obligatorio('Bancolombia ahorros'), r.texto({ min: 3, max: 100, ejemplo: 'Bancolombia ahorros' })] },
  banco:        { etiqueta: 'Banco',            reglas: [r.si(esBancaria, r.texto({ min: 3, max: 100, ejemplo: 'Bancolombia' }))] },
  numeroCuenta: { etiqueta: 'Número de cuenta', reglas: [r.si(esBancaria, r.propia(v => (
    !v || /^\d[\d-]{3,19}$/.test(String(v).trim()) ? ''
      : 'Escribe solo números (puede llevar guiones), de 4 a 20 caracteres. Ejemplo: 123-456789-01')))] },
  saldoInicial: { etiqueta: 'Saldo inicial',    reglas: [r.si(form => form.crear, r.numero({ min: 0, unidad: 'pesos', ejemplo: '500000' }))] },
};

const VACIO = { nombre: '', tipo: 'caja', banco: '', numeroCuenta: '', saldoInicial: '0' };

export function DialogCuenta({ open, modo, data, guardando, onClose, onGuardar }) {
  const [form, setForm] = useState(VACIO);
  const [inicial, setInicial] = useState(VACIO);
  const [error, setError] = useState('');
  const autoFocus = useAutoFocus();
  const v = useValidacion(ESQUEMA, { ...form, crear: modo === 'crear' });
  const { reiniciar } = v;

  // Al abrir (o cambiar el registro) se reinicia el formulario. Se ajusta durante el render
  // al detectar el cambio, en vez de en un efecto.
  const [previo, setPrevio] = useState(null);
  if (!previo || previo.open !== open || previo.modo !== modo || previo.data !== data) {
    setPrevio({ open, modo, data });
    if (open) reiniciarFormulario();
  }

  function reiniciarFormulario() {
    reiniciar();
    setError('');
    const datos = modo === 'editar' && data
      ? {
        nombre: data.nombre,
        tipo: data.tipo,
        banco: data.banco ?? '',
        numeroCuenta: data.numeroCuenta ?? '',
        saldoInicial: String(data.saldoInicial ?? 0),
      }
      : VACIO;
    setForm(datos);
    setInicial(datos);
  }

  const { confirmarCierre } = useCerrarConCambios({
    hayCambios: hayCambiosEn(form, inicial), bloqueado: guardando, onCerrar: onClose,
  });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const guardar = async () => {
    if (guardando || !v.validarTodo()) return;
    setError('');
    const fallo = await onGuardar({
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      banco:        esBancaria(form) ? form.banco || null : null,
      numeroCuenta: esBancaria(form) ? form.numeroCuenta || null : null,
      saldoInicial: Number(form.saldoInicial) || 0,
    });
    if (fallo) setError(fallo);
  };

  return (
    <Dialog open={open} onClose={confirmarCierre} maxWidth="xs" fullWidth bloqueado={guardando} alEnviar={guardar}>
      <DialogTitle>{modo === 'crear' ? 'Nueva Cuenta' : 'Editar Cuenta'}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField fullWidth label="Nombre *" size="small" value={form.nombre} onChange={set('nombre')}
              autoFocus={autoFocus} {...v.props('nombre')} />
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth size="small">
              <InputLabel id="dialog-cuenta-tipo-label">Tipo *</InputLabel>
              <Select labelId="dialog-cuenta-tipo-label" value={form.tipo} label="Tipo *" onChange={set('tipo')}>
                <MenuItem value="caja_menor">Caja Menor</MenuItem>
                <MenuItem value="caja">Caja efectivo (general)</MenuItem>
                <MenuItem value="cuenta_bancaria">Cuenta bancaria</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {form.tipo === 'cuenta_bancaria' && (
            <>
              <Grid size={12}>
                <TextField fullWidth label="Banco" size="small" value={form.banco} onChange={set('banco')}
                  {...v.props('banco')} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Número de cuenta" size="small"
                  slotProps={{ htmlInput: { inputMode: 'tel', autoComplete: 'off' } }}
                  value={form.numeroCuenta} onChange={set('numeroCuenta')} {...v.props('numeroCuenta')} />
              </Grid>
            </>
          )}
          {modo === 'crear' && (
            <Grid size={12}>
              <CampoMoneda label="Saldo inicial" value={form.saldoInicial}
                onChange={s => setForm(f => ({ ...f, saldoInicial: s }))} {...v.props('saldoInicial')} />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion={modo === 'crear' ? 'crear la cuenta' : 'guardar la cuenta'} />
      <ErrorServidor mensaje={error} onClose={() => setError('')} />
      <AccionesDialogo onCancelar={confirmarCierre} guardando={guardando} enviar
        textoGuardar={modo === 'crear' ? 'Crear' : 'Guardar'} />
    </Dialog>
  );
}

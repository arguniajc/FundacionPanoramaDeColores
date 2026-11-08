import { useState } from 'react';
import {
  DialogContent, DialogTitle,
  FormControl, FormHelperText, Grid, InputLabel, MenuItem, Select,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import { useCerrarConCambios, hayCambiosEn } from '@/shared/hooks/useCerrarConCambios';
import { useAutoFocus } from '@/shared/hooks/useAutoFocus';
import { AccionesDialogo, CampoMoneda, ErrorServidor } from '@/shared/components/form/FormControles';
import ResumenErrores from '@/shared/components/ResumenErrores';

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  categoriaId:        { etiqueta: 'Categoría PUC',        reglas: [r.seleccion('5105 — Gastos de personal')] },
  montoPresupuestado: { etiqueta: 'Monto presupuestado', reglas: [r.obligatorio('12000000'), r.monto('12000000')] },
};

export function DialogPresupuesto({ open, modo, data, categorias, programas, presAnio, guardando, onClose, onGuardar }) {
  const [form, setForm] = useState({ anio: presAnio, categoriaId: '', programaId: '', montoPresupuestado: '' });
  const [inicial, setInicial] = useState(form);
  const [error, setError] = useState('');
  const autoFocus = useAutoFocus();
  const v = useValidacion(ESQUEMA, form);
  const { reiniciar } = v;

  // Al abrir (o cambiar el registro o el año) se reinicia el formulario. Se ajusta durante
  // el render al detectar el cambio, en vez de en un efecto.
  const [previo, setPrevio] = useState(null);
  if (!previo || previo.open !== open || previo.modo !== modo || previo.data !== data || previo.presAnio !== presAnio) {
    setPrevio({ open, modo, data, presAnio });
    if (open) reiniciarFormulario();
  }

  function reiniciarFormulario() {
    reiniciar();
    setError('');
    const datos = modo === 'editar' && data
      ? {
        anio: data.anio,
        categoriaId: String(data.categoriaId),
        programaId: data.programaId ?? '',
        montoPresupuestado: String(data.montoPresupuestado),
      }
      : { anio: presAnio, categoriaId: '', programaId: '', montoPresupuestado: '' };
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
      anio: parseInt(form.anio),
      categoriaId: parseInt(form.categoriaId),
      programaId: form.programaId || null,
      montoPresupuestado: Number(form.montoPresupuestado),
    });
    if (fallo) setError(fallo);
  };

  return (
    <Dialog open={open} onClose={confirmarCierre} maxWidth="xs" fullWidth bloqueado={guardando} alEnviar={guardar}>
      <DialogTitle>{modo === 'crear' ? 'Agregar línea presupuestal' : 'Editar presupuesto'}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <FormControl fullWidth size="small" error={!!v.err('categoriaId')}>
              <InputLabel id="dialog-presupuesto-categoria-puc-label">Categoría PUC *</InputLabel>
              <Select labelId="dialog-presupuesto-categoria-puc-label" value={form.categoriaId} label="Categoría PUC *" onChange={set('categoriaId')}
                autoFocus={autoFocus}
                onBlur={() => v.tocar('categoriaId')}>
                {categorias.map(c => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.codigoPuc} — {c.nombre} ({c.tipo})
                  </MenuItem>
                ))}
              </Select>
              {v.err('categoriaId') && <FormHelperText>{v.err('categoriaId')}</FormHelperText>}
            </FormControl>
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth size="small">
              <InputLabel id="dialog-presupuesto-programa-opcional-label">Programa (opcional)</InputLabel>
              <Select labelId="dialog-presupuesto-programa-opcional-label" value={form.programaId} label="Programa (opcional)" onChange={set('programaId')}>
                <MenuItem value="">General (sin programa)</MenuItem>
                {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={12}>
            <CampoMoneda label="Monto presupuestado *"
              value={form.montoPresupuestado} onChange={m => setForm(f => ({ ...f, montoPresupuestado: m }))}
              {...v.props('montoPresupuestado')} />
          </Grid>
        </Grid>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion={modo === 'crear' ? 'agregar la línea presupuestal' : 'guardar el presupuesto'} />
      <ErrorServidor mensaje={error} onClose={() => setError('')} />
      <AccionesDialogo onCancelar={confirmarCierre} guardando={guardando} enviar
        textoGuardar={modo === 'crear' ? 'Agregar' : 'Guardar'} />
    </Dialog>
  );
}

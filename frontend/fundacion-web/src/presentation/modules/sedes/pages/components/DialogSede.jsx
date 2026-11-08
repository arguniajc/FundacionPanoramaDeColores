import { useState, useEffect } from 'react';
import { DialogContent, DialogTitle, Grid, TextField } from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import apiClient from '@/infrastructure/http/apiClient';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import {
  AccionesDialogo, CampoTelefono, ErrorServidor, SelectorUbicacion,
} from '@/shared/components/form/FormControles';
import { useCerrarConCambios, hayCambiosEn } from '@/shared/hooks/useCerrarConCambios';
import { useAutoFocus } from '@/shared/hooks/useAutoFocus';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  nombre:    { etiqueta: 'Nombre',    reglas: [r.obligatorio('Sede Siloé'), r.texto({ min: 3, max: 150 })] },
  direccion: { etiqueta: 'Dirección', reglas: [r.texto({ min: 5, max: 300, ejemplo: 'Calle 5 # 40-20' })] },
  telefono:  { etiqueta: 'Teléfono',  reglas: [r.telefono()] },
};

const VACIO = { nombre: '', direccion: '', ciudad: '', telefono: '' };

export function DialogSede({ abierto, onCerrar, onGuardado, inicial }) {
  const [form,        setForm]        = useState(VACIO);
  const [formInicial, setFormInicial] = useState(VACIO);
  const [guardando,   setGuardando]   = useState(false);
  const [error,       setError]       = useState('');
  const v = useValidacion(ESQUEMA, form);
  const { reiniciar } = v;

  useEffect(() => {
    if (abierto) {
      const datos = {
        nombre:    inicial?.nombre    ?? '',
        direccion: inicial?.direccion ?? '',
        ciudad:    inicial?.ciudad    ?? '',
        telefono:  inicial?.telefono  ?? '',
      };
      setForm(datos);
      setFormInicial(datos);
    }
    setError('');
    reiniciar();
  }, [abierto, inicial, reiniciar]);

  const hayCambios = abierto && hayCambiosEn(form, formInicial);
  const { confirmarCierre } = useCerrarConCambios({ hayCambios, bloqueado: guardando, onCerrar });
  const autoFocus = useAutoFocus();

  const set = campo => e => setForm(p => ({ ...p, [campo]: e.target.value }));

  const handleGuardar = async () => {
    if (!v.validarTodo()) return;
    setGuardando(true); setError('');
    try {
      const resp = inicial?.id
        ? await apiClient.put(`/api/sedes/${inicial.id}`, form)
        : await apiClient.post('/api/sedes', form);
      onGuardado(resp.data);
    } catch (err) {
      setError(mensajeErrorApi(err, { accion: 'guardar la sede', conflicto: 'Ya existe una sede con ese nombre.' }));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog slotProps={{ paper: { sx: { borderRadius: { xs: 0, sm: 2 } } } }} open={abierto}
      onClose={confirmarCierre} alEnviar={handleGuardar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'var(--color-primario)', color: 'white', fontWeight: 700 }}>
        {inicial?.id ? 'Editar sede' : 'Nueva sede'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid sx={{ mt: 0 }} container spacing={2.5}>
          <Grid size={12}>
            <TextField fullWidth label="Nombre *" size="small" value={form.nombre} onChange={set('nombre')}
              autoFocus={autoFocus} {...v.props('nombre')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth label="Dirección" size="small" value={form.direccion} onChange={set('direccion')}
              {...v.props('direccion')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            {/* La sede solo guarda la ciudad: municipio de la lista DANE (un valor viejo se sigue viendo) */}
            <SelectorUbicacion ciudad={form.ciudad} mostrarPais={false} mostrarDepartamento={false}
              onChange={(campo, valor) => { if (campo === 'ciudad') setForm(p => ({ ...p, ciudad: valor })); }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CampoTelefono value={form.telefono} autoComplete="off"
              onChange={t => setForm(p => ({ ...p, telefono: t }))} {...v.props('telefono')} />
          </Grid>
        </Grid>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion={inicial?.id ? 'guardar' : 'crear la sede'} />
      <ErrorServidor mensaje={error} onClose={() => setError('')} />
      <AccionesDialogo onCancelar={confirmarCierre} guardando={guardando} enviar
        textoGuardar={inicial?.id ? 'Guardar' : 'Crear sede'} sxGuardar={{ bgcolor: 'var(--color-primario)' }} />
    </Dialog>
  );
}

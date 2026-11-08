import { useState, useEffect } from 'react';
import { DialogContent, DialogTitle, Grid, TextField } from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import apiClient from '@/infrastructure/http/apiClient';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { AccionesDialogo, ErrorServidor } from '@/shared/components/form/FormControles';
import { useCerrarConCambios, hayCambiosEn } from '@/shared/hooks/useCerrarConCambios';
import { useAutoFocus } from '@/shared/hooks/useAutoFocus';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  nombre:      { etiqueta: 'Nombre',      reglas: [r.obligatorio('Escuela de fútbol'), r.texto({ min: 3, max: 150 })] },
  descripcion: { etiqueta: 'Descripción', reglas: [r.texto({ max: 500 })] },
  cupoMaximo:  { etiqueta: 'Cupo máximo', reglas: [r.numero({ min: 1, max: 100000, entero: true, unidad: 'cupos', ejemplo: '30' })] },
};

const VACIO = { nombre: '', descripcion: '', cupoMaximo: '' };

export function DialogPrograma({ abierto, onCerrar, onGuardado, sedeId, inicial }) {
  const [form,        setForm]        = useState(VACIO);
  const [formInicial, setFormInicial] = useState(VACIO);
  const [guardando,   setGuardando]   = useState(false);
  const [error,       setError]       = useState('');
  const v = useValidacion(ESQUEMA, form);
  const { reiniciar } = v;

  useEffect(() => {
    if (abierto) {
      const datos = {
        nombre:      inicial?.nombre      ?? '',
        descripcion: inicial?.descripcion ?? '',
        // como texto: el campo es de texto con teclado numérico y así se compara bien con lo escrito
        cupoMaximo:  inicial?.cupoMaximo != null ? String(inicial.cupoMaximo) : '',
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
      const payload = {
        sedeId,
        nombre:      form.nombre,
        descripcion: form.descripcion || null,
        cupoMaximo:  form.cupoMaximo ? parseInt(form.cupoMaximo) : null,
      };
      const resp = inicial?.id
        ? await apiClient.put(`/api/sedes/programas/${inicial.id}`, payload)
        : await apiClient.post('/api/sedes/programas', payload);
      onGuardado(resp.data);
    } catch (err) {
      setError(mensajeErrorApi(err, { accion: 'guardar el programa', conflicto: 'Ya existe un programa con ese nombre en la sede.' }));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog slotProps={{ paper: { sx: { borderRadius: { xs: 0, sm: 2 } } } }} open={abierto}
      onClose={confirmarCierre} alEnviar={handleGuardar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'var(--color-secundario)', color: 'white', fontWeight: 700 }}>
        {inicial?.id ? 'Editar programa' : 'Nuevo programa'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid sx={{ mt: 0 }} container spacing={2.5}>
          <Grid size={12}>
            <TextField fullWidth label="Nombre *" size="small" value={form.nombre} onChange={set('nombre')}
              autoFocus={autoFocus} {...v.props('nombre')} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Descripción" size="small" multiline rows={2}
              value={form.descripcion} onChange={set('descripcion')} {...v.props('descripcion')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Cupo máximo" size="small" type="text"
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              value={form.cupoMaximo} onChange={set('cupoMaximo')} {...v.props('cupoMaximo', 'Ejemplo: 30')} />
          </Grid>
        </Grid>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion={inicial?.id ? 'guardar' : 'crear el programa'} />
      <ErrorServidor mensaje={error} onClose={() => setError('')} />
      <AccionesDialogo onCancelar={confirmarCierre} guardando={guardando} enviar
        textoGuardar={inicial?.id ? 'Guardar' : 'Crear programa'} sxGuardar={{ bgcolor: 'var(--color-secundario)' }} />
    </Dialog>
  );
}

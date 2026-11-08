import { useState, useEffect, useRef } from 'react';
import {
  Alert, Button, DialogContent, DialogTitle, Grid, TextField,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import { voluntariosRepository } from '@/infrastructure/repositories/voluntariosRepository';
import {
  CampoFecha, CampoDocumento, CampoTelefono, SelectorUbicacion, AccionesDialogo, ErrorServidor,
} from '@/shared/components/form/FormControles';
import { COLOR, VACIO_VOL, toInputDate } from './helpers';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import { useCerrarConCambios, hayCambiosEn } from '@/shared/hooks/useCerrarConCambios';
import { useAutoFocus } from '@/shared/hooks/useAutoFocus';
import ResumenErrores from '@/shared/components/ResumenErrores';

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  nombre:          { etiqueta: 'Nombre completo',     reglas: [r.obligatorio('Laura Martínez'), r.nombreCompleto('Laura Martínez'), r.texto({ max: 150 })] },
  documento:       { etiqueta: 'Número documento',    reglas: [r.documentoSegunTipo('tipoDocumento')] },
  email:           { etiqueta: 'Email',               reglas: [r.correo('laura.martinez@correo.com')] },
  telefono:        { etiqueta: 'Teléfono',            reglas: [r.telefono()] },
  fechaNacimiento: { etiqueta: 'Fecha nacimiento',    reglas: [r.fecha({ noFutura: true, ejemplo: '1995-04-12' })] },
  fechaInicio:     { etiqueta: 'Inicio voluntariado', reglas: [r.fecha({ ejemplo: '2025-03-01' })] },
};

const desdeVoluntario = vol => (vol ? {
  nombre:          vol.nombre ?? '',
  tipoDocumento:   vol.tipoDocumento ?? '',
  documento:       vol.documento ?? '',
  email:           vol.email ?? '',
  telefono:        vol.telefono ?? '',
  pais:            vol.pais ?? 'Colombia',
  departamento:    vol.departamento ?? '',
  ciudad:          vol.ciudad ?? '',
  fechaNacimiento: toInputDate(vol.fechaNacimiento),
  fechaInicio:     toInputDate(vol.fechaInicio),
  profesion:       vol.profesion ?? '',
  notas:           vol.notas ?? '',
} : VACIO_VOL);

/**
 * Crear / editar voluntario. `onVerExistente({ id, nombre })` se llama si el usuario quiere
 * abrir el voluntario que ya tiene el documento escrito (el diálogo ya se cerró).
 */
export function VoluntarioDialog({ open, voluntario, onClose, onGuardado, onVerExistente }) {
  const editando = !!voluntario;
  const [form,      setForm]      = useState(VACIO_VOL);
  const [inicial,   setInicial]   = useState(VACIO_VOL);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');
  const [repetido,  setRepetido]  = useState(null);   // { numero, id, nombre }
  const consulta = useRef(0);
  const v = useValidacion(ESQUEMA, form);
  const { reiniciar } = v;
  const autoFocus = useAutoFocus();

  const hayCambios = open && hayCambiosEn(form, inicial);
  const { confirmarCierre } = useCerrarConCambios({ hayCambios, bloqueado: guardando, onCerrar: onClose });

  useEffect(() => {
    if (!open) return;
    const datos = desdeVoluntario(voluntario);
    setError('');
    setRepetido(null);
    reiniciar();
    setForm(datos);
    setInicial(datos);
  }, [open, voluntario, reiniciar]);

  const set = (k, valor) => setForm(p => ({ ...p, [k]: valor }));

  // Al salir del número: ¿otro voluntario ya tiene ese documento?
  const verificarDocumento = async () => {
    v.tocar('documento');
    const numero = form.documento.trim();
    if (!numero || v.errores.documento) { setRepetido(null); return; }
    const n = ++consulta.current;
    try {
      const { data } = await voluntariosRepository.verificarDocumento({ numero, excluirId: voluntario?.id ?? null });
      if (n !== consulta.current) return;
      setRepetido(data?.existe ? { numero, id: data.id, nombre: data.nombre } : null);
    } catch { /* opcional: si no se puede verificar, se guarda igual */ }
  };
  const avisoRepetido = repetido && repetido.numero === form.documento.trim() ? repetido : null;

  const verExistente = async () => {
    const existente = avisoRepetido;
    if (await confirmarCierre()) onVerExistente?.(existente);
  };

  const guardar = async () => {
    if (guardando || !v.validarTodo()) return;
    setGuardando(true); setError('');
    try {
      const payload = {
        nombre:          form.nombre.trim(),
        tipoDocumento:   form.tipoDocumento || null,
        documento:       form.documento.trim() || null,
        email:           form.email.trim() || null,
        telefono:        form.telefono.trim() || null,
        pais:            form.pais.trim() || null,
        departamento:    form.departamento.trim() || null,
        ciudad:          form.ciudad.trim() || null,
        fechaNacimiento: form.fechaNacimiento || null,
        fechaInicio:     form.fechaInicio || null,
        profesion:       form.profesion.trim() || null,
        notas:           form.notas.trim() || null,
      };
      const { data } = editando
        ? await voluntariosRepository.editar(voluntario.id, payload)
        : await voluntariosRepository.crear(payload);
      onGuardado(data, editando);
    } catch (e) {
      setError(mensajeErrorApi(e, { accion: 'guardar el voluntario' }));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={confirmarCierre} alEnviar={guardar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>
        {editando ? 'Editar voluntario' : 'Nuevo voluntario'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Nombre completo *" value={form.nombre} autoFocus={autoFocus}
              onChange={e => set('nombre', e.target.value)} {...v.props('nombre')}
              slotProps={{ htmlInput: { autoComplete: 'name' } }} />
          </Grid>
          <Grid size={12}>
            <CampoDocumento
              tipoDocumento={form.tipoDocumento} documento={form.documento}
              onChangeTipo={t => set('tipoDocumento', t)}
              onChangeNumero={n => set('documento', n)}
              validacionNumero={{ ...v.props('documento'), onBlur: verificarDocumento }} />
          </Grid>
          {avisoRepetido && (
            <Grid size={12}>
              <Alert severity="warning"
                action={onVerExistente && (
                  <Button color="inherit" size="small" onClick={verExistente} sx={{ fontWeight: 700 }}>Abrir</Button>
                )}>
                Ya hay un voluntario con el documento {avisoRepetido.numero}: <strong>{avisoRepetido.nombre}</strong>.
                Revisa que no lo estés registrando dos veces.
              </Alert>
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Email" type="email" value={form.email}
              onChange={e => set('email', e.target.value)} {...v.props('email')}
              slotProps={{ htmlInput: { autoComplete: 'email', inputMode: 'email' } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CampoTelefono value={form.telefono}
              onChange={t => set('telefono', t)} {...v.props('telefono')} />
          </Grid>
          <Grid size={12}>
            <SelectorUbicacion
              pais={form.pais} departamento={form.departamento} ciudad={form.ciudad}
              onChange={set}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Profesión / Oficio" value={form.profesion}
              onChange={e => set('profesion', e.target.value)}
              slotProps={{ htmlInput: { autoComplete: 'organization-title' } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CampoFecha label="Fecha nacimiento" value={form.fechaNacimiento}
              onChange={f => set('fechaNacimiento', f)} {...v.props('fechaNacimiento')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CampoFecha label="Inicio voluntariado" value={form.fechaInicio}
              onChange={f => set('fechaInicio', f)} {...v.props('fechaInicio')} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Notas" multiline rows={2} value={form.notas}
              onChange={e => set('notas', e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      <ResumenErrores {...v.resumen} accion={editando ? 'guardar el voluntario' : 'crear el voluntario'} />
      <ErrorServidor mensaje={error} onClose={() => setError('')} />
      <AccionesDialogo onCancelar={confirmarCierre} guardando={guardando} enviar
        textoGuardar={editando ? 'Guardar' : 'Crear voluntario'}
        sxGuardar={{ bgcolor: COLOR, '&:hover': { bgcolor: 'primary.dark' } }} />
    </Dialog>
  );
}

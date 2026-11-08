import { useState, useEffect } from 'react';
import {
  Alert, Button, CircularProgress, DialogActions,
  DialogContent, DialogTitle, Grid, TextField,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import { voluntariosRepository } from '@/infrastructure/repositories/voluntariosRepository';
import { CampoFecha, CampoDocumento, SelectorUbicacion } from '@/shared/components/form/FormControles';
import { COLOR, VACIO_VOL, toInputDate } from './helpers';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
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

export function VoluntarioDialog({ open, voluntario, onClose, onGuardado }) {
  const editando = !!voluntario;
  const [form,     setForm]     = useState(VACIO_VOL);
  const [guardando, setGuardando] = useState(false);
  const [error,    setError]    = useState('');
  const v = useValidacion(ESQUEMA, form);
  const { reiniciar } = v;

  useEffect(() => {
    if (!open) return;
    setError('');
    reiniciar();
    setForm(voluntario ? {
      nombre:          voluntario.nombre,
      tipoDocumento:   voluntario.tipoDocumento ?? '',
      documento:       voluntario.documento ?? '',
      email:           voluntario.email ?? '',
      telefono:        voluntario.telefono ?? '',
      pais:            voluntario.pais ?? 'Colombia',
      departamento:    voluntario.departamento ?? '',
      ciudad:          voluntario.ciudad ?? '',
      fechaNacimiento: toInputDate(voluntario.fechaNacimiento),
      fechaInicio:     toInputDate(voluntario.fechaInicio),
      profesion:       voluntario.profesion ?? '',
      notas:           voluntario.notas ?? '',
    } : VACIO_VOL);
  }, [open, voluntario, reiniciar]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!v.validarTodo()) return;
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>
        {editando ? 'Editar voluntario' : 'Nuevo voluntario'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Nombre completo *" value={form.nombre}
              onChange={e => set('nombre', e.target.value)} {...v.props('nombre')} />
          </Grid>
          <Grid size={12}>
            <CampoDocumento
              tipoDocumento={form.tipoDocumento} documento={form.documento}
              onChangeTipo={t => set('tipoDocumento', t)}
              onChangeNumero={n => set('documento', n)}
              validacionNumero={v.props('documento')} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth size="small" label="Email" type="email" value={form.email}
              onChange={e => set('email', e.target.value)} {...v.props('email')} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth size="small" label="Teléfono" value={form.telefono}
              onChange={e => set('telefono', e.target.value)} {...v.props('telefono')} />
          </Grid>
          <Grid size={12}>
            <SelectorUbicacion
              pais={form.pais} departamento={form.departamento} ciudad={form.ciudad}
              onChange={set}
            />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth size="small" label="Profesión / Oficio" value={form.profesion}
              onChange={e => set('profesion', e.target.value)} />
          </Grid>
          <Grid size={6}>
            <CampoFecha label="Fecha nacimiento" value={form.fechaNacimiento}
              onChange={f => set('fechaNacimiento', f)} {...v.props('fechaNacimiento')} />
          </Grid>
          <Grid size={6}>
            <CampoFecha label="Inicio voluntariado" value={form.fechaInicio}
              onChange={f => set('fechaInicio', f)} {...v.props('fechaInicio')} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Notas" multiline rows={2} value={form.notas}
              onChange={e => set('notas', e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mx: 3, mt: 1.5, mb: 0 }}>
          {error}
        </Alert>
      )}
      <ResumenErrores {...v.resumen} accion={editando ? 'guardar el voluntario' : 'crear el voluntario'} />
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}
          sx={{ bgcolor: COLOR, fontWeight: 700, '&:hover': { bgcolor: 'primary.dark' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : editando ? 'Guardar' : 'Crear voluntario'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

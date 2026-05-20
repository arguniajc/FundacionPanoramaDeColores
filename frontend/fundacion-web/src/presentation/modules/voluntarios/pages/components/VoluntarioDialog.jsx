import { useState, useEffect } from 'react';
import {
  Alert, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Grid, TextField,
} from '@mui/material';
import { voluntariosRepository } from '../../../../../infrastructure/repositories/voluntariosRepository';
import { CampoFecha, CampoDocumento, SelectorUbicacion } from '../../../../../shared/components/form/FormControles';
import { COLOR, VACIO_VOL, toInputDate } from './helpers';

export function VoluntarioDialog({ open, voluntario, onClose, onGuardado }) {
  const editando = !!voluntario;
  const [form,     setForm]     = useState(VACIO_VOL);
  const [guardando, setGuardando] = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
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
  }, [open, voluntario]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
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
      setError(e?.response?.data?.mensaje || 'Error al guardar.');
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
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Nombre completo *" value={form.nombre}
              onChange={e => set('nombre', e.target.value)} />
          </Grid>
          <Grid size={12}>
            <CampoDocumento
              tipoDocumento={form.tipoDocumento} documento={form.documento}
              onChangeTipo={v => set('tipoDocumento', v)}
              onChangeNumero={v => set('documento', v)} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth size="small" label="Email" type="email" value={form.email}
              onChange={e => set('email', e.target.value)} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth size="small" label="Teléfono" value={form.telefono}
              onChange={e => set('telefono', e.target.value)} />
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
              onChange={v => set('fechaNacimiento', v)} />
          </Grid>
          <Grid size={6}>
            <CampoFecha label="Inicio voluntariado" value={form.fechaInicio}
              onChange={v => set('fechaInicio', v)} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Notas" multiline rows={2} value={form.notas}
              onChange={e => set('notas', e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}
          sx={{ bgcolor: COLOR, fontWeight: 700, '&:hover': { bgcolor: '#5b21b6' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : editando ? 'Guardar' : 'Crear voluntario'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

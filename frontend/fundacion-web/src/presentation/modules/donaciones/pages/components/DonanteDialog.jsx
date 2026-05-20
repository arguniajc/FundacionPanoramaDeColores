import { useState, useEffect } from 'react';
import {
  Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, TextField,
} from '@mui/material';
import { donantesRepository } from '../../../../../infrastructure/repositories/donantesRepository';
import { CampoDocumento, CampoCiudad } from '../../../../../shared/components/form/FormControles';
import { COLOR_DONANTES } from './helpers';

const VACIO = { nombre: '', tipo: 'persona', tipoDocumento: '', documento: '', email: '', telefono: '', ciudad: '', notas: '' };

export function DonanteDialog({ open, donante, onClose, onGuardado }) {
  const editando = !!donante;
  const [form,      setForm]      = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (open) {
      setForm(donante
        ? { nombre: donante.nombre, tipo: donante.tipo,
            tipoDocumento: donante.tipoDocumento ?? '', documento: donante.documento ?? '',
            email: donante.email ?? '', telefono: donante.telefono ?? '',
            ciudad: donante.ciudad ?? '', notas: donante.notas ?? '' }
        : VACIO);
      setError('');
    }
  }, [open, donante]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setGuardando(true); setError('');
    try {
      const { data } = editando
        ? await donantesRepository.editar(donante.id, { ...form, nombre: form.nombre.trim() })
        : await donantesRepository.crear({ ...form, nombre: form.nombre.trim() });
      onGuardado(data, editando);
    } catch {
      setError('Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR_DONANTES }}>
        {editando ? 'Editar donante' : 'Nuevo donante'}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={8}>
            <TextField fullWidth size="small" label="Nombre *" value={form.nombre}
              onChange={e => set('nombre', e.target.value)} />
          </Grid>
          <Grid size={4}>
            <TextField select fullWidth size="small" label="Tipo"
              value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              <MenuItem value="persona">Persona</MenuItem>
              <MenuItem value="empresa">Empresa</MenuItem>
            </TextField>
          </Grid>
          <Grid size={12}>
            <CampoDocumento
              tipoDocumento={form.tipoDocumento}
              documento={form.documento}
              onChangeTipo={v => set('tipoDocumento', v)}
              onChangeNumero={v => set('documento', v)}
              labelNumero="Documento / NIT"
            />
          </Grid>
          <Grid size={6}>
            <CampoCiudad value={form.ciudad} onChange={v => set('ciudad', v)} />
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
            <TextField fullWidth size="small" label="Notas" multiline rows={2} value={form.notas}
              onChange={e => set('notas', e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}
          sx={{ bgcolor: COLOR_DONANTES, fontWeight: 700, '&:hover': { bgcolor: '#1e7a38' } }}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : editando ? 'Guardar' : 'Crear donante'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

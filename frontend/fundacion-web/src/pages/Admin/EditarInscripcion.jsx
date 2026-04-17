import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField, MenuItem, FormControl,
  InputLabel, Select, Typography, Divider, Alert,
} from '@mui/material';
import api from '../../services/api';

const TIPOS_DOC = ['TI', 'RC', 'NUIP', 'PPT', 'Pasaporte', 'RAMV', 'Sin documento'];
const PARENTESCOS = ['Madre', 'Padre', 'Abuelo/a', 'Tío/a', 'Hermano/a', 'Acudiente legal', 'Otro'];
const TALLAS_CAMISA = ['4', '6', '8', '10', '12', '14', 'XS', 'S', 'M', 'L', 'XL'];

export default function EditarInscripcion({ inscripcion, onCerrar, onGuardado }) {
  const [form, setForm] = useState({
    nombreMenor:        inscripcion.nombreMenor || '',
    fechaNacimiento:    inscripcion.fechaNacimiento || '',
    tipoDocumento:      inscripcion.tipoDocumento || '',
    numeroDocumento:    inscripcion.numeroDocumento || '',
    eps:                inscripcion.eps || '',
    tallaCamisa:        inscripcion.tallaCamisa || '',
    tallaPantalon:      inscripcion.tallaPantalon || '',
    tallaZapatos:       inscripcion.tallaZapatos || '',
    tieneAlergia:       inscripcion.tieneAlergia || 'no',
    descripcionAlergia: inscripcion.descripcionAlergia || '',
    observacionesSalud: inscripcion.observacionesSalud || '',
    nombreAcudiente:    inscripcion.nombreAcudiente || '',
    parentesco:         inscripcion.parentesco || '',
    whatsapp:           inscripcion.whatsapp || '',
    direccion:          inscripcion.direccion || '',
    fotoMenorUrl:       inscripcion.fotoMenorUrl || '',
    fotoDocumentoUrl:   inscripcion.fotoDocumentoUrl || '',
  });

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const set = (campo) => (e) =>
    setForm(prev => ({ ...prev, [campo]: e.target.value }));

  const handleGuardar = async () => {
    setGuardando(true);
    setError('');
    try {
      await api.put(`/api/beneficiarios/${inscripcion.id}`, {
        nombreMenor:        form.nombreMenor,
        fechaNacimiento:    form.fechaNacimiento,
        tipoDocumento:      form.tipoDocumento,
        numeroDocumento:    form.numeroDocumento || null,
        eps:                form.eps || null,
        tallaCamisa:        form.tallaCamisa || null,
        tallaPantalon:      form.tallaPantalon || null,
        tallaZapatos:       form.tallaZapatos || null,
        tieneAlergia:       form.tieneAlergia,
        descripcionAlergia: form.tieneAlergia === 'si' ? form.descripcionAlergia : null,
        observacionesSalud: form.observacionesSalud || null,
        nombreAcudiente:    form.nombreAcudiente,
        parentesco:         form.parentesco || null,
        whatsapp:           form.whatsapp || null,
        direccion:          form.direccion || null,
        fotoMenorUrl:       form.fotoMenorUrl || null,
        fotoDocumentoUrl:   form.fotoDocumentoUrl || null,
      });
      onGuardado();
    } catch (err) {
      const msg = err.response?.status === 409
        ? 'Ese número de documento ya está registrado.'
        : 'Error al guardar. Intenta de nuevo.';
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open onClose={onCerrar} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: '#4E1B95', color: 'white', fontWeight: 700 }}>
        Editar inscripción
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2} mt={0}>
          {/* Datos del menor */}
          <Grid size={12}>
            <Typography variant="subtitle2" color="#4E1B95" fontWeight={700}>Datos del menor</Typography>
            <Divider sx={{ mb: 1.5, mt: 0.5 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth label="Nombre completo" size="small" value={form.nombreMenor} onChange={set('nombreMenor')} required />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Fecha de nacimiento" size="small" type="date" value={form.fechaNacimiento} onChange={set('fechaNacimiento')} InputLabelProps={{ shrink: true }} required />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de documento</InputLabel>
              <Select label="Tipo de documento" value={form.tipoDocumento} onChange={set('tipoDocumento')}>
                {TIPOS_DOC.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Número de documento" size="small" value={form.numeroDocumento} onChange={set('numeroDocumento')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="EPS" size="small" value={form.eps} onChange={set('eps')} />
          </Grid>

          {/* Tallas */}
          <Grid size={12}>
            <Typography variant="subtitle2" color="#4E1B95" fontWeight={700} mt={1}>Tallas</Typography>
            <Divider sx={{ mb: 1.5, mt: 0.5 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Talla camisa</InputLabel>
              <Select label="Talla camisa" value={form.tallaCamisa} onChange={set('tallaCamisa')}>
                {TALLAS_CAMISA.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Talla pantalón" size="small" value={form.tallaPantalon} onChange={set('tallaPantalon')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Talla zapatos" size="small" value={form.tallaZapatos} onChange={set('tallaZapatos')} />
          </Grid>

          {/* Salud */}
          <Grid size={12}>
            <Typography variant="subtitle2" color="#4E1B95" fontWeight={700} mt={1}>Salud</Typography>
            <Divider sx={{ mb: 1.5, mt: 0.5 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>¿Tiene alergia?</InputLabel>
              <Select label="¿Tiene alergia?" value={form.tieneAlergia} onChange={set('tieneAlergia')}>
                <MenuItem value="no">No</MenuItem>
                <MenuItem value="si">Sí</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {form.tieneAlergia === 'si' && (
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField fullWidth label="Descripción de la alergia" size="small" value={form.descripcionAlergia} onChange={set('descripcionAlergia')} required />
            </Grid>
          )}
          <Grid size={12}>
            <TextField fullWidth label="Observaciones de salud" size="small" multiline rows={2} value={form.observacionesSalud} onChange={set('observacionesSalud')} />
          </Grid>

          {/* Acudiente */}
          <Grid size={12}>
            <Typography variant="subtitle2" color="#4E1B95" fontWeight={700} mt={1}>Acudiente</Typography>
            <Divider sx={{ mb: 1.5, mt: 0.5 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Nombre del acudiente" size="small" value={form.nombreAcudiente} onChange={set('nombreAcudiente')} required />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Parentesco</InputLabel>
              <Select label="Parentesco" value={form.parentesco} onChange={set('parentesco')}>
                {PARENTESCOS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="WhatsApp" size="small" value={form.whatsapp} onChange={set('whatsapp')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Dirección" size="small" value={form.direccion} onChange={set('direccion')} />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleGuardar}
          disabled={guardando || !form.nombreMenor || !form.nombreAcudiente}
          sx={{ bgcolor: '#4E1B95' }}
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

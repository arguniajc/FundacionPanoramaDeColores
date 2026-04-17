import { useState } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField, MenuItem, FormControl,
  InputLabel, Select, Typography, Divider, Alert, CircularProgress,
  InputAdornment, IconButton,
} from '@mui/material';
import PersonAddIcon  from '@mui/icons-material/PersonAdd';
import CloseIcon      from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from '../../services/api';
import UploadFoto from '../../components/UploadFoto';

const TIPOS_DOC   = ['RC', 'TI', 'CC', 'CE', 'PA', 'NUIP'];
const PARENTESCOS = ['Madre', 'Padre', 'Abuelo', 'Abuela', 'Tío', 'Tía', 'Hermano', 'Hermana', 'Tutor legal', 'Otro'];
const TALLAS_CAMISA = ['4', '6', '8', '10', '12', '14', 'XS', 'S', 'M', 'L', 'XL'];

const FORM_VACIO = {
  nombreMenor: '', fechaNacimiento: '', tipoDocumento: 'RC', numeroDocumento: '',
  eps: '', tallaCamisa: '', tallaPantalon: '', tallaZapatos: '',
  tieneAlergia: 'no', descripcionAlergia: '', observacionesSalud: '',
  nombreAcudiente: '', parentesco: 'Madre', whatsapp: '', direccion: '',
  fotoMenorUrl: null, fotoDocumentoUrl: null, fotoDocumentoReversoUrl: null,
};

export default function NuevoBeneficiario({ onCerrar, onCreado }) {
  const [form,            setForm]            = useState(FORM_VACIO);
  const [guardando,       setGuardando]       = useState(false);
  const [error,           setError]           = useState('');
  const [docExiste,       setDocExiste]       = useState(false);
  const [verificandoDoc,  setVerificandoDoc]  = useState(false);

  const set = campo => e => setForm(prev => ({ ...prev, [campo]: e.target.value }));

  const verificarDocumento = async () => {
    const num = form.numeroDocumento.trim();
    if (!num) { setDocExiste(false); return; }
    setVerificandoDoc(true);
    try {
      const { data } = await api.get(`/api/beneficiarios/verificar-documento/${num}`);
      setDocExiste(data.existe);
    } catch { /* ignorar */ }
    finally { setVerificandoDoc(false); }
  };

  const handleGuardar = async () => {
    if (docExiste) { setError('Ese número de documento ya está registrado.'); return; }
    setGuardando(true); setError('');
    try {
      await api.post('/api/beneficiarios', {
        nombreMenor:        form.nombreMenor.trim(),
        fechaNacimiento:    form.fechaNacimiento,
        tipoDocumento:      form.tipoDocumento,
        numeroDocumento:    form.numeroDocumento.trim() || null,
        eps:                form.eps.trim()             || null,
        tallaCamisa:        form.tallaCamisa            || null,
        tallaPantalon:      form.tallaPantalon.trim()   || null,
        tallaZapatos:       form.tallaZapatos.trim()    || null,
        tieneAlergia:       form.tieneAlergia,
        descripcionAlergia: form.tieneAlergia === 'si' ? (form.descripcionAlergia.trim() || null) : null,
        observacionesSalud: form.observacionesSalud.trim() || null,
        nombreAcudiente:    form.nombreAcudiente.trim(),
        parentesco:         form.parentesco             || null,
        whatsapp:           form.whatsapp.trim()        || null,
        direccion:          form.direccion.trim()       || null,
        fotoMenorUrl:            form.fotoMenorUrl            || null,
        fotoDocumentoUrl:        form.fotoDocumentoUrl        || null,
        fotoDocumentoReversoUrl: form.fotoDocumentoReversoUrl || null,
      });
      onCreado();
    } catch (err) {
      const msg = err.response?.status === 409
        ? 'Ese número de documento ya está inscrito.'
        : 'Error al guardar. Intenta de nuevo.';
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  const puedeGuardar =
    form.nombreMenor.trim() &&
    form.fechaNacimiento &&
    form.nombreAcudiente.trim() &&
    !docExiste &&
    !guardando;

  return (
    <Dialog open onClose={onCerrar} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{
        background: 'linear-gradient(135deg, #4E1B95 0%, #2D984F 100%)',
        color: '#fff', fontWeight: 700, py: 2, px: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddIcon />
          Inscribir nuevo beneficiario
        </Box>
        <IconButton onClick={onCerrar} size="small" sx={{ color: 'rgba(255,255,255,0.8)' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2}>
          {/* ── Datos del menor ─────────────────────────────────────────────── */}
          <Grid size={12}>
            <Typography variant="subtitle2" color="#4E1B95" fontWeight={700}>
              Datos del menor
            </Typography>
            <Divider sx={{ mb: 1.5, mt: 0.5 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth label="Nombre completo *" size="small"
              value={form.nombreMenor} onChange={set('nombreMenor')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Fecha de nacimiento *" size="small" type="date"
              value={form.fechaNacimiento} onChange={set('fechaNacimiento')}
              InputLabelProps={{ shrink: true }} />
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
            <TextField
              fullWidth label="Número de documento" size="small"
              value={form.numeroDocumento}
              onChange={e => { set('numeroDocumento')(e); setDocExiste(false); }}
              onBlur={verificarDocumento}
              error={docExiste}
              helperText={docExiste ? 'Este documento ya está registrado' : ''}
              slotProps={{
                input: {
                  endAdornment: verificandoDoc ? (
                    <InputAdornment position="end">
                      <CircularProgress size={14} />
                    </InputAdornment>
                  ) : docExiste === false && form.numeroDocumento ? (
                    <InputAdornment position="end">
                      <CheckCircleIcon sx={{ fontSize: 16, color: '#2e7d32' }} />
                    </InputAdornment>
                  ) : null,
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="EPS" size="small" value={form.eps} onChange={set('eps')} />
          </Grid>

          {/* ── Tallas ──────────────────────────────────────────────────────── */}
          <Grid size={12}>
            <Typography variant="subtitle2" color="#4E1B95" fontWeight={700} mt={0.5}>
              Tallas
            </Typography>
            <Divider sx={{ mb: 1.5, mt: 0.5 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Talla camisa</InputLabel>
              <Select label="Talla camisa" value={form.tallaCamisa} onChange={set('tallaCamisa')}>
                <MenuItem value=""><em>Sin talla</em></MenuItem>
                {TALLAS_CAMISA.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Talla pantalón" size="small"
              value={form.tallaPantalon} onChange={set('tallaPantalon')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Talla zapatos" size="small"
              value={form.tallaZapatos} onChange={set('tallaZapatos')} />
          </Grid>

          {/* ── Salud ───────────────────────────────────────────────────────── */}
          <Grid size={12}>
            <Typography variant="subtitle2" color="#4E1B95" fontWeight={700} mt={0.5}>
              Salud
            </Typography>
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
              <TextField fullWidth label="Descripción de la alergia *" size="small"
                value={form.descripcionAlergia} onChange={set('descripcionAlergia')} />
            </Grid>
          )}
          <Grid size={12}>
            <TextField fullWidth label="Observaciones de salud" size="small" multiline rows={2}
              value={form.observacionesSalud} onChange={set('observacionesSalud')} />
          </Grid>

          {/* ── Acudiente ───────────────────────────────────────────────────── */}
          <Grid size={12}>
            <Typography variant="subtitle2" color="#4E1B95" fontWeight={700} mt={0.5}>
              Acudiente
            </Typography>
            <Divider sx={{ mb: 1.5, mt: 0.5 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Nombre del acudiente *" size="small"
              value={form.nombreAcudiente} onChange={set('nombreAcudiente')} />
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
            <TextField fullWidth label="WhatsApp" size="small"
              value={form.whatsapp} onChange={set('whatsapp')}
              placeholder="Ej: 3001234567" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Dirección" size="small"
              value={form.direccion} onChange={set('direccion')} />
          </Grid>

          {/* ── Fotos ───────────────────────────────────────────────────────── */}
          <Grid size={12}>
            <Typography variant="subtitle2" color="#4E1B95" fontWeight={700} mt={0.5}>
              Fotos
            </Typography>
            <Divider sx={{ mb: 1.5, mt: 0.5 }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <UploadFoto
              label="Foto del menor"
              carpeta="fotos"
              value={form.fotoMenorUrl}
              onChange={url => setForm(prev => ({ ...prev, fotoMenorUrl: url }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <UploadFoto
              label="Documento (frente)"
              carpeta="documentos"
              value={form.fotoDocumentoUrl}
              onChange={url => setForm(prev => ({ ...prev, fotoDocumentoUrl: url }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <UploadFoto
              label="Documento (reverso)"
              carpeta="documentos"
              value={form.fotoDocumentoReversoUrl}
              onChange={url => setForm(prev => ({ ...prev, fotoDocumentoReversoUrl: url }))}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onCerrar} disabled={guardando} variant="outlined">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleGuardar}
          disabled={!puedeGuardar}
          startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
          sx={{ bgcolor: '#4E1B95', '&:hover': { bgcolor: '#3a1470' }, fontWeight: 700, minWidth: 160 }}
        >
          {guardando ? 'Registrando…' : 'Inscribir beneficiario'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Configuración global de la fundación y representante legal.
import { useState, useEffect } from 'react';
import {
  Alert, Box, Button, CircularProgress, Divider, FormControl,
  Grid, InputLabel, MenuItem, Select, Snackbar, TextField, Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import FirmaPad from '../../../../shared/components/FirmaPad';
import { configuracionRepository } from '../../../../infrastructure/repositories/configuracionRepository';

const COLOR = '#4E1B95';
const TIPOS_DOC = ['CC', 'CE', 'PP', 'NIT', 'Otro'];

const VACIO = {
  nombreFundacion: '',
  nit:             '',
  direccion:       '',
  telefono:        '',
  nombreRepLegal:  '',
  tipoDocRep:      'CC',
  documentoRep:    '',
  cargoRep:        '',
  firmaRep:        '',
};

export default function ConfiguracionPage() {
  const [form,      setForm]      = useState(VACIO);
  const [cargando,  setCargando]  = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');
  const [toast,     setToast]     = useState('');

  useEffect(() => {
    configuracionRepository.obtener()
      .then(({ data }) => {
        setForm({
          nombreFundacion: data.nombreFundacion ?? '',
          nit:             data.nit             ?? '',
          direccion:       data.direccion        ?? '',
          telefono:        data.telefono         ?? '',
          nombreRepLegal:  data.nombreRepLegal   ?? '',
          tipoDocRep:      data.tipoDocRep       ?? 'CC',
          documentoRep:    data.documentoRep     ?? '',
          cargoRep:        data.cargoRep         ?? '',
          firmaRep:        data.firmaRep         ?? '',
        });
      })
      .catch(() => setError('No se pudo cargar la configuración.'))
      .finally(() => setCargando(false));
  }, []);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleGuardar = async () => {
    setGuardando(true);
    setError('');
    try {
      await configuracionRepository.guardar({
        nombreFundacion: form.nombreFundacion || null,
        nit:             form.nit             || null,
        direccion:       form.direccion        || null,
        telefono:        form.telefono         || null,
        nombreRepLegal:  form.nombreRepLegal   || null,
        tipoDocRep:      form.tipoDocRep       || null,
        documentoRep:    form.documentoRep     || null,
        cargoRep:        form.cargoRep         || null,
        firmaRep:        form.firmaRep         || null,
      });
      setToast('Configuración guardada correctamente');
    } catch {
      setError('No se pudo guardar la configuración.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 720, mx: 'auto' }}>

      <Box sx={{ mb: 4 }}>
        <Typography sx={{
          fontSize: '0.68rem', color: 'text.secondary',
          textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.5,
        }}>
          Módulo
        </Typography>
        <Typography variant="h5" fontWeight={800} color={COLOR}>Configuración</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Datos de la fundación y firma de la representante legal para los PDF de inscripción.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {cargando ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress sx={{ color: COLOR }} />
        </Box>
      ) : (
        <Box>
          {/* ── Datos de la fundación ──────────────────────────────── */}
          <Box sx={{ mb: 1 }}>
            <Box sx={{
              bgcolor: COLOR, borderRadius: '8px 8px 0 0', px: 2, py: 1,
            }}>
              <Typography variant="caption" fontWeight={800} color="white"
                sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Datos de la Fundación
              </Typography>
            </Box>
            <Box sx={{ border: '1px solid #e2d9f3', borderTop: 'none',
                       borderRadius: '0 0 8px 8px', p: 3 }}>
              <Grid container spacing={2.5}>
                <Grid size={12}>
                  <TextField fullWidth size="small" label="Nombre de la fundación"
                    value={form.nombreFundacion} onChange={set('nombreFundacion')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small" label="NIT"
                    value={form.nit} onChange={set('nit')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small" label="Teléfono"
                    value={form.telefono} onChange={set('telefono')} />
                </Grid>
                <Grid size={12}>
                  <TextField fullWidth size="small" label="Dirección"
                    value={form.direccion} onChange={set('direccion')} />
                </Grid>
              </Grid>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* ── Representante legal ────────────────────────────────── */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{
              bgcolor: COLOR, borderRadius: '8px 8px 0 0', px: 2, py: 1,
            }}>
              <Typography variant="caption" fontWeight={800} color="white"
                sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Representante Legal
              </Typography>
            </Box>
            <Box sx={{ border: '1px solid #e2d9f3', borderTop: 'none',
                       borderRadius: '0 0 8px 8px', p: 3 }}>
              <Alert severity="info" sx={{ mb: 2.5 }} icon={false}>
                Al <strong>autorizar un proyecto</strong> desde el módulo Proyectos, se toma una
                copia (snapshot) de estos datos en ese momento. Actualizar aquí no cambia
                proyectos ya autorizados — debes revocar y volver a autorizar si quieres actualizar.
              </Alert>

              <Grid container spacing={2.5}>
                <Grid size={12}>
                  <TextField fullWidth size="small" label="Nombre completo del representante legal"
                    value={form.nombreRepLegal} onChange={set('nombreRepLegal')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo de documento</InputLabel>
                    <Select label="Tipo de documento"
                      value={form.tipoDocRep}
                      onChange={set('tipoDocRep')}>
                      {TIPOS_DOC.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 7 }}>
                  <TextField fullWidth size="small" label="Número de documento"
                    value={form.documentoRep} onChange={set('documentoRep')} />
                </Grid>
                <Grid size={12}>
                  <TextField fullWidth size="small" label="Cargo"
                    placeholder="Ej: Directora Ejecutiva, Representante Legal…"
                    value={form.cargoRep} onChange={set('cargoRep')} />
                </Grid>
                <Grid size={12}>
                  <FirmaPad
                    label="Firma del representante legal"
                    value={form.firmaRep}
                    onChange={(v) => setForm(p => ({ ...p, firmaRep: v }))}
                  />
                </Grid>
              </Grid>
            </Box>
          </Box>

          <Box display="flex" justifyContent="flex-end">
            <Button variant="contained" startIcon={<SaveIcon />}
              onClick={handleGuardar} disabled={guardando}
              sx={{ bgcolor: COLOR, px: 3 }}>
              {guardando ? 'Guardando…' : 'Guardar configuración'}
            </Button>
          </Box>
        </Box>
      )}

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}

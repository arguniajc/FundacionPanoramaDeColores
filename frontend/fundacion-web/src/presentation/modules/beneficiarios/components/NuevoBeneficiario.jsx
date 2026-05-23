// Formulario de inscripción de un nuevo beneficiario.
import { useState } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField, MenuItem, FormControl,
  InputLabel, Select, Typography, Alert, CircularProgress,
  InputAdornment, IconButton, Autocomplete, Checkbox, FormControlLabel,
} from '@mui/material';
import PersonAddIcon   from '@mui/icons-material/PersonAdd';
import CloseIcon       from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import apiClient       from '../../../../infrastructure/http/apiClient';
import { TIPOS_DOC, PARENTESCOS, TALLAS_CAMISA, TALLAS_PANTALON, TALLAS_ZAPATOS, EPS_LIST, PAISES } from '../../../../shared/constants/beneficiarios';
import UploadFoto      from '../../../../shared/components/UploadFoto';
import UploadDocumento from '../../../../shared/components/UploadDocumento';
import { useGeografia } from '../../../../shared/hooks/useGeografia';

const GRADOS = ['Prejardín','Jardín','Transición','1°','2°','3°','4°','5°','6°','7°','8°','9°','10°','11°'];

const GENEROS = ['Masculino', 'Femenino', 'No binario', 'Prefiero no decir'];

const FORM_VACIO = {
  // Datos del menor
  primerNombre: '', segundoNombre: '', primerApellido: '', segundoApellido: '',
  fechaNacimiento: '', tipoDocumento: 'RC', numeroDocumento: '',
  genero: '',
  paisNacimiento: 'Colombia', departamentoNacimiento: '', ciudadNacimiento: '',
  barrio: '', direccion: '', numPersonasVive: '', numHermanos: '',
  // Tallas
  tallaCamisa: '', tallaPantalon: '', tallaZapatos: '', pesoKg: '', tallaCm: '',
  // Salud
  eps: '', tieneAlergia: 'no', descripcionAlergia: '', observacionesSalud: '',
  tieneDiscapacidad: false, descripcionDiscapacidad: '',
  // Educación
  nombreColegio: '', gradoEscolar: '',
  // Acudiente
  nombreAcudiente: '', parentesco: 'Madre', whatsapp: '', viveConNino: '',
  // Autorización
  autorizacion: false,
  // Fotos
  fotoMenorUrl: null, fotoDocumentoUrl: null, fotoDocumentoReversoUrl: null,
};

function SeccionTitulo({ children }) {
  return (
    <Grid size={12}>
      <Box sx={{
        bgcolor: 'secondary.main',
        borderRadius: 1.5,
        px: 2, py: 1,
        mt: 1,
        display: 'flex', alignItems: 'center',
        borderLeft: '5px solid rgba(0,0,0,0.15)',
      }}>
        <Typography fontWeight={800} color="white"
          sx={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          {children}
        </Typography>
      </Box>
    </Grid>
  );
}

export default function NuevoBeneficiario({ onCerrar, onCreado }) {
  const [form,           setForm]           = useState(FORM_VACIO);
  const [guardando,      setGuardando]      = useState(false);
  const [error,          setError]          = useState('');
  const [docExiste,      setDocExiste]      = useState(false);
  const [verificandoDoc, setVerificandoDoc] = useState(false);

  const { esColombia, departamentos, ciudades, deptoHabilitado, ciudadHabilitada } =
    useGeografia(form.paisNacimiento, form.departamentoNacimiento);

  const set  = campo => e => setForm(prev => ({ ...prev, [campo]: e.target.value }));
  const setV = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));
  const capitalizar = campo => e => {
    const v = e.target.value.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    setForm(prev => ({ ...prev, [campo]: v }));
  };
  const soloDigitos = campo => e =>
    setForm(prev => ({ ...prev, [campo]: e.target.value.replace(/\D/g, '') }));
  const nr = campo => !form[campo] ? (
    <Box component="span"
      onMouseDown={e => { e.preventDefault(); setV(campo, 'No registra'); }}
      sx={{ cursor: 'pointer', color: 'text.disabled', fontSize: '0.68rem', userSelect: 'none', '&:hover': { color: 'primary.main' } }}>
      → No registra
    </Box>
  ) : form[campo] === 'No registra' ? (
    <Box component="span"
      onMouseDown={e => { e.preventDefault(); setV(campo, ''); }}
      sx={{ cursor: 'pointer', color: 'warning.dark', fontSize: '0.68rem', userSelect: 'none', '&:hover': { color: 'error.main' } }}>
      ✕ &quot;No registra&quot; — clic para limpiar
    </Box>
  ) : null;

  const verificarDocumento = async () => {
    const num = form.numeroDocumento.trim();
    if (!num) { setDocExiste(false); return; }
    setVerificandoDoc(true);
    try {
      const { data } = await apiClient.get(`/api/beneficiarios/verificar-documento/${num}`);
      setDocExiste(data.existe);
    } catch { /* ignorar */ }
    finally { setVerificandoDoc(false); }
  };

  const handleGuardar = async () => {
    if (docExiste) { setError('Ese número de documento ya está registrado.'); return; }
    if (!form.autorizacion) { setError('Debe aceptar la autorización para inscribir al beneficiario.'); return; }
    setGuardando(true); setError('');
    try {
      await apiClient.post('/api/beneficiarios', {
        primerNombre:            form.primerNombre.trim(),
        segundoNombre:           form.segundoNombre.trim()   || null,
        primerApellido:          form.primerApellido.trim(),
        segundoApellido:         form.segundoApellido.trim() || null,
        fechaNacimiento:         form.fechaNacimiento,
        tipoDocumento:           form.tipoDocumento,
        numeroDocumento:         form.numeroDocumento.trim() || null,
        genero:                  form.genero                 || null,
        paisNacimiento:          form.paisNacimiento.trim()  || null,
        departamentoNacimiento:  form.departamentoNacimiento || null,
        ciudadNacimiento:        form.ciudadNacimiento       || null,
        barrio:                  form.barrio.trim()          || null,
        direccion:               form.direccion.trim()       || null,
        numPersonasVive:         form.numPersonasVive ? parseInt(form.numPersonasVive) : null,
        numHermanos:             form.numHermanos    ? parseInt(form.numHermanos)    : null,
        eps:                     form.eps.trim()             || null,
        tallaCamisa:             form.tallaCamisa             || null,
        tallaPantalon:           form.tallaPantalon.trim()    || null,
        tallaZapatos:            form.tallaZapatos.trim()     || null,
        pesoKg:                  form.pesoKg    ? parseFloat(form.pesoKg)    : null,
        tallaCm:                 form.tallaCm   ? parseInt(form.tallaCm)     : null,
        tieneAlergia:            form.tieneAlergia,
        descripcionAlergia:      form.tieneAlergia === 'si' ? (form.descripcionAlergia.trim() || null) : null,
        observacionesSalud:      form.observacionesSalud.trim() || null,
        tieneDiscapacidad:       form.tieneDiscapacidad,
        descripcionDiscapacidad: form.tieneDiscapacidad ? (form.descripcionDiscapacidad.trim() || null) : null,
        nombreColegio:           form.nombreColegio.trim() || null,
        gradoEscolar:            form.gradoEscolar         || null,
        nombreAcudiente:         form.nombreAcudiente.trim(),
        parentesco:              form.parentesco            || null,
        whatsapp:                form.whatsapp.trim()       || null,
        viveConNino:             form.viveConNino === 'si' ? true : form.viveConNino === 'no' ? false : null,
        autorizacion:            form.autorizacion,
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
    form.primerNombre.trim() &&
    form.primerApellido.trim() &&
    form.fechaNacimiento &&
    form.nombreAcudiente.trim() &&
    form.autorizacion &&
    !docExiste &&
    !guardando;

  return (
    <Dialog open onClose={onCerrar} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{
        background: 'linear-gradient(135deg, var(--color-primario) 0%, #2D984F 100%)',
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

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

        <Grid container spacing={2.5}>

          {/* ── Datos del menor ── */}
          <SeccionTitulo>Datos del menor</SeccionTitulo>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Primer nombre *" size="small" required
              value={form.primerNombre} onChange={capitalizar('primerNombre')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Segundo nombre" size="small"
              value={form.segundoNombre} onChange={capitalizar('segundoNombre')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Primer apellido *" size="small" required
              value={form.primerApellido} onChange={capitalizar('primerApellido')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Segundo apellido" size="small"
              value={form.segundoApellido} onChange={capitalizar('segundoApellido')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Fecha de nacimiento *" size="small" type="date"
              value={form.fechaNacimiento} onChange={set('fechaNacimiento')}
              slotProps={{ inputLabel: { shrink: true } }} />
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
              onChange={e => { soloDigitos('numeroDocumento')(e); setDocExiste(false); }}
              onBlur={verificarDocumento}
              error={docExiste}
              helperText={docExiste ? 'Este documento ya está registrado' : ''}
              slotProps={{
                input: {
                  endAdornment: verificandoDoc ? (
                    <InputAdornment position="end"><CircularProgress size={14} /></InputAdornment>
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
            <FormControl fullWidth size="small">
              <InputLabel>Género</InputLabel>
              <Select label="Género" value={form.genero} onChange={set('genero')}>
                <MenuItem value=""><em>No especificado</em></MenuItem>
                {GENEROS.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Autocomplete
              options={PAISES}
              value={form.paisNacimiento}
              onChange={(_, v) => setForm(p => ({ ...p, paisNacimiento: v || '', departamentoNacimiento: '', ciudadNacimiento: '' }))}
              disableClearable
              renderInput={params => <TextField {...params} label="País de nacimiento" size="small" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            {esColombia ? (
              <Autocomplete
                options={departamentos}
                value={form.departamentoNacimiento || null}
                disabled={!deptoHabilitado}
                onChange={(_, v) => setForm(p => ({ ...p, departamentoNacimiento: v || '', ciudadNacimiento: '' }))}
                renderInput={params => <TextField {...params} label="Departamento" size="small" />}
              />
            ) : (
              <TextField fullWidth label="Departamento / Estado" size="small"
                value={form.departamentoNacimiento}
                disabled={!deptoHabilitado}
                onChange={capitalizar('departamentoNacimiento')} />
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            {esColombia ? (
              <Autocomplete
                options={ciudades}
                value={form.ciudadNacimiento || null}
                disabled={!ciudadHabilitada}
                onChange={(_, v) => setV('ciudadNacimiento', v || '')}
                renderInput={params => <TextField {...params} label="Ciudad / Municipio" size="small" />}
              />
            ) : (
              <TextField fullWidth label="Ciudad" size="small"
                value={form.ciudadNacimiento}
                disabled={!ciudadHabilitada}
                onChange={capitalizar('ciudadNacimiento')} />
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Barrio" size="small"
              value={form.barrio} onChange={capitalizar('barrio')}
              slotProps={{ htmlInput: form.barrio === 'No registra' ? { readOnly: true } : undefined }}
              helperText={nr('barrio')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth label="Dirección" size="small"
              value={form.direccion} onChange={capitalizar('direccion')}
              slotProps={{ htmlInput: form.direccion === 'No registra' ? { readOnly: true } : undefined }}
              helperText={nr('direccion')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="N.º personas con quienes vive" size="small" type="number"
              value={form.numPersonasVive} onChange={set('numPersonasVive')}
              slotProps={{ htmlInput: { min: 1, max: 20 } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="N.º de hermanos" size="small" type="number"
              value={form.numHermanos} onChange={set('numHermanos')}
              slotProps={{ htmlInput: { min: 0, max: 20 } }} />
          </Grid>

          {/* ── Tallas ── */}
          <SeccionTitulo>Tallas</SeccionTitulo>

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
            <Autocomplete freeSolo options={TALLAS_PANTALON}
              value={form.tallaPantalon}
              onChange={(_, v) => setV('tallaPantalon', v ?? '')}
              onInputChange={(_, v) => setV('tallaPantalon', v)}
              renderInput={params => (
                <TextField {...params} fullWidth label="Talla pantalón" size="small" />
              )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Autocomplete freeSolo options={TALLAS_ZAPATOS}
              value={form.tallaZapatos}
              onChange={(_, v) => setV('tallaZapatos', v ?? '')}
              onInputChange={(_, v) => setV('tallaZapatos', v)}
              renderInput={params => (
                <TextField {...params} fullWidth label="Talla zapatos" size="small" />
              )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Peso" size="small" type="number"
              value={form.pesoKg} onChange={set('pesoKg')}
              slotProps={{ htmlInput: { min: 1, max: 200, step: 0.1 },
                input: { endAdornment: <InputAdornment position="end">kg</InputAdornment> } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Talla (altura)" size="small" type="number"
              value={form.tallaCm} onChange={set('tallaCm')}
              slotProps={{ htmlInput: { min: 30, max: 250 },
                input: { endAdornment: <InputAdornment position="end">cm</InputAdornment> } }} />
          </Grid>

          {/* ── Salud ── */}
          <SeccionTitulo>Salud</SeccionTitulo>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete freeSolo options={EPS_LIST}
              value={form.eps}
              onChange={(_, v) => setV('eps', v ?? '')}
              onInputChange={(_, v, reason) => {
                if (form.eps === 'No registra') return;
                if (reason === 'input') {
                  const cap = (v || '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                  setV('eps', cap);
                }
              }}
              renderInput={params => (
                <TextField {...params} fullWidth label="EPS" size="small"
                  helperText={nr('eps')}
                  inputProps={{ ...params.inputProps, ...(form.eps === 'No registra' ? { readOnly: true } : {}) }} />
              )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>¿Tiene alergia?</InputLabel>
              <Select label="¿Tiene alergia?" value={form.tieneAlergia} onChange={set('tieneAlergia')}>
                <MenuItem value="no">No</MenuItem>
                <MenuItem value="si">Sí</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {form.tieneAlergia === 'si' && (
            <Grid size={12}>
              <TextField fullWidth label="Descripción de la alergia *" size="small"
                value={form.descripcionAlergia} onChange={capitalizar('descripcionAlergia')} />
            </Grid>
          )}
          <Grid size={12}>
            <TextField fullWidth label="Observaciones de salud" size="small" multiline rows={2}
              value={form.observacionesSalud} onChange={capitalizar('observacionesSalud')} />
          </Grid>
          <Grid size={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.tieneDiscapacidad}
                  onChange={e => setForm(p => ({ ...p, tieneDiscapacidad: e.target.checked, descripcionDiscapacidad: '' }))}
                  color="secondary"
                />
              }
              label="Tiene discapacidad o condición de salud especial"
            />
          </Grid>
          {form.tieneDiscapacidad && (
            <Grid size={12}>
              <TextField fullWidth label="Descripción de la discapacidad / condición *" size="small"
                value={form.descripcionDiscapacidad} onChange={capitalizar('descripcionDiscapacidad')} />
            </Grid>
          )}

          {/* ── Educación ── */}
          <SeccionTitulo>Educación</SeccionTitulo>

          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth label="Nombre del colegio" size="small"
              value={form.nombreColegio} onChange={capitalizar('nombreColegio')}
              slotProps={{ htmlInput: form.nombreColegio === 'No registra' ? { readOnly: true } : undefined }}
              helperText={nr('nombreColegio')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Autocomplete
              freeSolo
              options={GRADOS}
              value={form.gradoEscolar}
              onInputChange={(_, v) => setV('gradoEscolar', v)}
              renderInput={params => <TextField {...params} label="Grado escolar" size="small" />}
            />
          </Grid>

          {/* ── Acudiente ── */}
          <SeccionTitulo>Acudiente</SeccionTitulo>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Nombre del acudiente *" size="small"
              value={form.nombreAcudiente} onChange={capitalizar('nombreAcudiente')} />
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
              value={form.whatsapp} onChange={soloDigitos('whatsapp')}
              placeholder="Ej: 3001234567"
              slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>¿Vive con el niño?</InputLabel>
              <Select label="¿Vive con el niño?" value={form.viveConNino} onChange={set('viveConNino')}>
                <MenuItem value=""><em>No especificado</em></MenuItem>
                <MenuItem value="si">Sí</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* ── Autorización ── */}
          <SeccionTitulo>Autorización</SeccionTitulo>

          <Grid size={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.autorizacion}
                  onChange={e => setForm(p => ({ ...p, autorizacion: e.target.checked }))}
                  color="primary"
                />
              }
              label="Autorizo la inscripción del menor a los programas de la Fundación Panorama de Colores y el uso de sus datos con fines institucionales."
            />
          </Grid>

          {/* ── Fotos ── */}
          <SeccionTitulo>Fotos</SeccionTitulo>

          <Grid size={{ xs: 12, sm: 4 }}>
            <UploadFoto
              label="Foto del menor"
              carpeta="fotos"
              value={form.fotoMenorUrl}
              onChange={url => setForm(prev => ({ ...prev, fotoMenorUrl: url }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <UploadDocumento
              value={form.fotoDocumentoUrl}
              onChange={url => setForm(prev => ({ ...prev, fotoDocumentoUrl: url, fotoDocumentoReversoUrl: null }))}
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
          sx={{ bgcolor: 'var(--color-primario)', '&:hover': { bgcolor: '#3a1470' }, fontWeight: 700, minWidth: 160 }}
        >
          {guardando ? 'Registrando…' : 'Inscribir beneficiario'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

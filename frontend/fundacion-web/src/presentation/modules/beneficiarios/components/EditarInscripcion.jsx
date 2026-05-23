import { useState } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField, MenuItem, FormControl,
  InputLabel, Select, Typography, Divider, Alert, CircularProgress,
  InputAdornment, Autocomplete, Checkbox, FormControlLabel,
} from '@mui/material';
import apiClient       from '../../../../infrastructure/http/apiClient';
import { TIPOS_DOC, PARENTESCOS, TALLAS_CAMISA } from '../../../../shared/constants/beneficiarios';

const GENEROS = ['Masculino', 'Femenino', 'No binario', 'Prefiero no decir'];
import UploadFoto      from '../../../../shared/components/UploadFoto';
import UploadDocumento from '../../../../shared/components/UploadDocumento';
import { useGeografiaColombia } from '../../../../shared/hooks/useGeografiaColombia';

const GRADOS = ['Prejardín','Jardín','Transición','1°','2°','3°','4°','5°','6°','7°','8°','9°','10°','11°'];

function SeccionTitulo({ children }) {
  return (
    <>
      <Grid size={12}>
        <Typography variant="subtitle2" color="var(--color-primario)" fontWeight={700} mt={1.5}>
          {children}
        </Typography>
        <Divider sx={{ mb: 1, mt: 0.75 }} />
      </Grid>
    </>
  );
}

export default function EditarInscripcion({ inscripcion, onCerrar, onGuardado }) {
  const boolToStr = v => v === true ? 'si' : v === false ? 'no' : '';

  const capitalizar = campo => e =>
    setForm(prev => ({ ...prev, [campo]: e.target.value.replace(/(^|\s)\S/g, l => l.toUpperCase()) }));

  const [form, setForm] = useState({
    primerNombre:            inscripcion.primerNombre            || '',
    segundoNombre:           inscripcion.segundoNombre           || '',
    primerApellido:          inscripcion.primerApellido          || '',
    segundoApellido:         inscripcion.segundoApellido         || '',
    fechaNacimiento:         inscripcion.fechaNacimiento         || '',
    tipoDocumento:           inscripcion.tipoDocumento           || '',
    numeroDocumento:         inscripcion.numeroDocumento         || '',
    genero:                  inscripcion.genero                  || '',
    paisNacimiento:          inscripcion.paisNacimiento          || 'Colombia',
    departamentoNacimiento:  inscripcion.departamentoNacimiento  || '',
    ciudadNacimiento:        inscripcion.ciudadNacimiento        || '',
    barrio:                  inscripcion.barrio                  || '',
    direccion:               inscripcion.direccion               || '',
    numPersonasVive:         inscripcion.numPersonasVive != null ? String(inscripcion.numPersonasVive) : '',
    numHermanos:             inscripcion.numHermanos     != null ? String(inscripcion.numHermanos)     : '',
    eps:                     inscripcion.eps                     || '',
    tallaCamisa:             inscripcion.tallaCamisa             || '',
    tallaPantalon:           inscripcion.tallaPantalon           || '',
    tallaZapatos:            inscripcion.tallaZapatos            || '',
    pesoKg:                  inscripcion.pesoKg   != null ? String(inscripcion.pesoKg)   : '',
    tallaCm:                 inscripcion.tallaCm  != null ? String(inscripcion.tallaCm)  : '',
    tieneAlergia:            inscripcion.tieneAlergia            || 'no',
    descripcionAlergia:      inscripcion.descripcionAlergia      || '',
    observacionesSalud:      inscripcion.observacionesSalud      || '',
    tieneDiscapacidad:       inscripcion.tieneDiscapacidad       || false,
    descripcionDiscapacidad: inscripcion.descripcionDiscapacidad || '',
    nombreColegio:           inscripcion.nombreColegio           || '',
    gradoEscolar:            inscripcion.gradoEscolar            || '',
    nombreAcudiente:         inscripcion.nombreAcudiente         || '',
    parentesco:              inscripcion.parentesco              || '',
    whatsapp:                inscripcion.whatsapp                || '',
    viveConNino:             boolToStr(inscripcion.viveConNino),
    autorizacion:            inscripcion.autorizacion            || false,
    fotoMenorUrl:            inscripcion.fotoMenorUrl            || null,
    fotoDocumentoUrl:        inscripcion.fotoDocumentoUrl        || null,
    fotoDocumentoReversoUrl: inscripcion.fotoDocumentoReversoUrl || null,
  });

  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');

  const { departamentos, ciudades, cargandoCiudades } = useGeografiaColombia(
    form.paisNacimiento?.toLowerCase() === 'colombia' ? form.departamentoNacimiento : ''
  );

  const set  = campo => e => setForm(prev => ({ ...prev, [campo]: e.target.value }));
  const setV = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  const handleGuardar = async () => {
    setGuardando(true); setError('');
    try {
      await apiClient.put(`/api/beneficiarios/${inscripcion.id}`, {
        primerNombre:            form.primerNombre.trim(),
        segundoNombre:           form.segundoNombre.trim()   || null,
        primerApellido:          form.primerApellido.trim(),
        segundoApellido:         form.segundoApellido.trim() || null,
        fechaNacimiento:         form.fechaNacimiento,
        tipoDocumento:           form.tipoDocumento,
        numeroDocumento:         form.numeroDocumento         || null,
        genero:                  form.genero                  || null,
        paisNacimiento:          form.paisNacimiento          || null,
        departamentoNacimiento:  form.departamentoNacimiento  || null,
        ciudadNacimiento:        form.ciudadNacimiento        || null,
        barrio:                  form.barrio                  || null,
        direccion:               form.direccion               || null,
        numPersonasVive:         form.numPersonasVive ? parseInt(form.numPersonasVive) : null,
        numHermanos:             form.numHermanos    ? parseInt(form.numHermanos)    : null,
        eps:                     form.eps                     || null,
        tallaCamisa:             form.tallaCamisa             || null,
        tallaPantalon:           form.tallaPantalon           || null,
        tallaZapatos:            form.tallaZapatos            || null,
        pesoKg:                  form.pesoKg  ? parseFloat(form.pesoKg)  : null,
        tallaCm:                 form.tallaCm ? parseInt(form.tallaCm)   : null,
        tieneAlergia:            form.tieneAlergia,
        descripcionAlergia:      form.tieneAlergia === 'si' ? form.descripcionAlergia : null,
        observacionesSalud:      form.observacionesSalud      || null,
        tieneDiscapacidad:       form.tieneDiscapacidad,
        descripcionDiscapacidad: form.tieneDiscapacidad ? (form.descripcionDiscapacidad || null) : null,
        nombreColegio:           form.nombreColegio           || null,
        gradoEscolar:            form.gradoEscolar            || null,
        nombreAcudiente:         form.nombreAcudiente,
        parentesco:              form.parentesco              || null,
        whatsapp:                form.whatsapp               || null,
        viveConNino:             form.viveConNino === 'si' ? true : form.viveConNino === 'no' ? false : null,
        autorizacion:            form.autorizacion,
        fotoMenorUrl:            form.fotoMenorUrl            || null,
        fotoDocumentoUrl:        form.fotoDocumentoUrl        || null,
        fotoDocumentoReversoUrl: form.fotoDocumentoReversoUrl || null,
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
      <DialogTitle sx={{ bgcolor: 'var(--color-primario)', color: 'white', fontWeight: 700 }}>
        Editar inscripción
      </DialogTitle>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

        <Grid container spacing={2.5} mt={0}>

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
            <TextField fullWidth label="Fecha de nacimiento" size="small" type="date"
              value={form.fechaNacimiento} onChange={set('fechaNacimiento')}
              slotProps={{ inputLabel: { shrink: true } }} required />
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
            <TextField fullWidth label="Número de documento" size="small"
              value={form.numeroDocumento} onChange={set('numeroDocumento')} />
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
              freeSolo
              options={['Colombia']}
              value={form.paisNacimiento}
              onInputChange={(_, v) => setForm(p => ({ ...p, paisNacimiento: v, departamentoNacimiento: '', ciudadNacimiento: '' }))}
              renderInput={params => <TextField {...params} label="País de nacimiento" size="small" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Autocomplete
              options={departamentos}
              value={form.departamentoNacimiento || null}
              onChange={(_, v) => setForm(p => ({ ...p, departamentoNacimiento: v || '', ciudadNacimiento: '' }))}
              disabled={form.paisNacimiento?.toLowerCase() !== 'colombia'}
              renderInput={params => <TextField {...params} label="Departamento" size="small" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Autocomplete
              options={ciudades}
              value={form.ciudadNacimiento || null}
              onChange={(_, v) => setV('ciudadNacimiento', v || '')}
              disabled={!form.departamentoNacimiento}
              loading={cargandoCiudades}
              renderInput={params => (
                <TextField {...params} label="Ciudad" size="small" />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Barrio" size="small"
              value={form.barrio} onChange={set('barrio')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth label="Dirección" size="small"
              value={form.direccion} onChange={set('direccion')} />
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
            <TextField fullWidth label="Talla pantalón" size="small"
              value={form.tallaPantalon} onChange={set('tallaPantalon')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Talla zapatos" size="small"
              value={form.tallaZapatos} onChange={set('tallaZapatos')} />
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
            <TextField fullWidth label="EPS" size="small" value={form.eps} onChange={set('eps')} />
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
              <TextField fullWidth label="Descripción de la alergia" size="small"
                value={form.descripcionAlergia} onChange={set('descripcionAlergia')} required />
            </Grid>
          )}
          <Grid size={12}>
            <TextField fullWidth label="Observaciones de salud" size="small" multiline rows={2}
              value={form.observacionesSalud} onChange={set('observacionesSalud')} />
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
              <TextField fullWidth label="Descripción de la discapacidad / condición" size="small"
                value={form.descripcionDiscapacidad} onChange={set('descripcionDiscapacidad')} />
            </Grid>
          )}

          {/* ── Educación ── */}
          <SeccionTitulo>Educación</SeccionTitulo>

          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth label="Nombre del colegio" size="small"
              value={form.nombreColegio} onChange={set('nombreColegio')} />
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
            <TextField fullWidth label="Nombre del acudiente" size="small"
              value={form.nombreAcudiente} onChange={set('nombreAcudiente')} required />
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
              value={form.whatsapp} onChange={set('whatsapp')} />
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
              beneficiarioId={inscripcion.id}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleGuardar}
          disabled={guardando || !form.primerNombre || !form.primerApellido || !form.nombreAcudiente}
          sx={{ bgcolor: 'var(--color-primario)' }}
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

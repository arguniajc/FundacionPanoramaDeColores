import { useState } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField, MenuItem, FormControl,
  InputLabel, Select, Typography, Alert, CircularProgress,
  InputAdornment, Autocomplete, Checkbox, FormControlLabel, Chip,
} from '@mui/material';
import apiClient       from '../../../../infrastructure/http/apiClient';
import { TIPOS_DOC, PARENTESCOS, TALLAS_CAMISA, TALLAS_PANTALON, TALLAS_ZAPATOS, EPS_LIST, PAISES } from '../../../../shared/constants/beneficiarios';

const GENEROS = ['Masculino', 'Femenino', 'No binario', 'Prefiero no decir'];
import UploadFoto      from '../../../../shared/components/UploadFoto';
import UploadDocumento from '../../../../shared/components/UploadDocumento';
import { useGeografia } from '../../../../shared/hooks/useGeografia';

const GRADOS = ['Prejardín','Jardín','Transición','1°','2°','3°','4°','5°','6°','7°','8°','9°','10°','11°'];

const NIVELES_EDUCATIVOS = [
  'Sin estudios formales', 'Primaria incompleta', 'Primaria completa',
  'Bachillerato incompleto', 'Bachillerato completo',
  'Técnico/a', 'Tecnólogo/a', 'Profesional', 'Especialización', 'Maestría', 'Doctorado',
];

function calcularCategoria(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  const fn  = new Date(fecha + 'T00:00:00');
  let edad  = hoy.getFullYear() - fn.getFullYear();
  const m   = hoy.getMonth() - fn.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fn.getDate())) edad--;
  if (edad < 0 || edad > 120) return null;
  if (edad <=  5) return { label: 'Primera infancia', color: '#e3f2fd', tc: '#0d47a1', rango: '0 a 5 años'   };
  if (edad <= 11) return { label: 'Infancia',          color: '#e8f5e9', tc: '#1b5e20', rango: '6 a 11 años'  };
  if (edad <= 17) return { label: 'Adolescencia',      color: '#fff8e1', tc: '#e65100', rango: '12 a 17 años' };
  if (edad <= 28) return { label: 'Joven',             color: '#fce4ec', tc: '#880e4f', rango: '18 a 28 años' };
  if (edad <= 59) return { label: 'Adulto',            color: '#f3e5f5', tc: '#4a148c', rango: '29 a 59 años' };
  return           { label: 'Adulto mayor',            color: '#efebe9', tc: '#3e2723', rango: '60+ años'     };
}

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

const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

function splitearNombre(ins) {
  if (ins.primerNombre) {
    return {
      primerNombre:    cap(ins.primerNombre),
      segundoNombre:   ins.segundoNombre   ? cap(ins.segundoNombre)   : '',
      primerApellido:  cap(ins.primerApellido),
      segundoApellido: ins.segundoApellido ? cap(ins.segundoApellido) : '',
    };
  }
  const parts = (ins.nombreMenor || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { primerNombre: '', segundoNombre: '', primerApellido: '', segundoApellido: '' };
  if (parts.length === 1) return { primerNombre: cap(parts[0]), segundoNombre: '', primerApellido: '', segundoApellido: '' };
  if (parts.length === 2) return { primerNombre: cap(parts[0]), segundoNombre: '', primerApellido: cap(parts[1]), segundoApellido: '' };
  if (parts.length === 3) return { primerNombre: cap(parts[0]), segundoNombre: '', primerApellido: cap(parts[1]), segundoApellido: cap(parts[2]) };
  return { primerNombre: cap(parts[0]), segundoNombre: cap(parts[1]), primerApellido: cap(parts[2]), segundoApellido: parts.slice(3).map(cap).join(' ') };
}

export default function EditarInscripcion({ inscripcion, onCerrar, onGuardado }) {
  const boolToStr = v => v === true ? 'si' : v === false ? 'no' : '';

  const capitalizar = campo => e => {
    const v = e.target.value.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    setForm(prev => ({ ...prev, [campo]: v }));
  };

  const nombres = splitearNombre(inscripcion);

  const [form, setForm] = useState({
    tipo:                    inscripcion.tipo || 'niño',
    primerNombre:            nombres.primerNombre,
    segundoNombre:           nombres.segundoNombre,
    primerApellido:          nombres.primerApellido,
    segundoApellido:         nombres.segundoApellido,
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

  const esNino    = form.tipo === 'niño';
  const categoria = calcularCategoria(form.fechaNacimiento);

  const handleFechaNacimiento = (e) => {
    const fecha = e.target.value;
    setForm(prev => {
      const cat      = calcularCategoria(fecha);
      const esAdulto = cat && (cat.label === 'Joven' || cat.label === 'Adulto' || cat.label === 'Adulto mayor');
      const nuevoTipo = esAdulto ? 'adulto' : 'niño';
      const cambiaTipo = nuevoTipo !== prev.tipo;
      return {
        ...prev,
        fechaNacimiento: fecha,
        tipo:            nuevoTipo,
        tipoDocumento:   cambiaTipo ? (esAdulto ? 'CC' : 'RC') : prev.tipoDocumento,
      };
    });
  };

  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');

  const { esColombia, departamentos, ciudades, deptoHabilitado, ciudadHabilitada } =
    useGeografia(form.paisNacimiento, form.departamentoNacimiento);

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


  const set  = campo => e => setForm(prev => ({ ...prev, [campo]: e.target.value }));
  const setV = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  const handleGuardar = async () => {
    setGuardando(true); setError('');
    try {
      await apiClient.put(`/api/beneficiarios/${inscripcion.id}`, {
        tipo:                    form.tipo,
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
        nombreAcudiente:         esNino ? form.nombreAcudiente : null,
        parentesco:              esNino ? (form.parentesco || null)  : null,
        whatsapp:                esNino ? (form.whatsapp   || null)  : null,
        viveConNino:             esNino ? (form.viveConNino === 'si' ? true : form.viveConNino === 'no' ? false : null) : null,
        autorizacion:            form.autorizacion,
        fotoMenorUrl:            form.fotoMenorUrl            || null,
        fotoDocumentoUrl:        form.fotoDocumentoUrl        || null,
        fotoDocumentoReversoUrl: form.fotoDocumentoReversoUrl || null,
      });
      onGuardado();
    } catch (err) {
      let msg = 'Error al guardar. Intenta de nuevo.';
      if (err.response?.status === 409) {
        msg = 'Ese número de documento ya está registrado.';
      } else if (err.response?.status === 400 && err.response.data?.errors) {
        const detalles = Object.entries(err.response.data.errors)
          .map(([campo, msgs]) => `${campo}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join(' | ');
        msg = `Error de validación — ${detalles}`;
      }
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

          {/* ── Tipo de beneficiario ── */}
          <Grid size={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>Tipo:</Typography>
              {[
                { value: 'niño',   label: '👦 Niño / Adolescente  (menor de 18)' },
                { value: 'adulto', label: '🧑 Adulto  (18 años en adelante)' },
              ].map(op => (
                <Box key={op.value} component="button" type="button"
                  onClick={() => setForm(p => ({
                    ...p,
                    tipo:          op.value,
                    tipoDocumento: op.value === 'adulto' ? 'CC' : 'RC',
                    gradoEscolar:  '',
                    ...(op.value === 'adulto' ? { nombreColegio: '' } : {}),
                  }))}
                  sx={{
                    px: 2, py: 0.75, borderRadius: 5, border: '2px solid',
                    borderColor: form.tipo === op.value ? 'primary.main' : '#ccc',
                    bgcolor: form.tipo === op.value ? 'primary.main' : 'transparent',
                    color: form.tipo === op.value ? '#fff' : 'text.secondary',
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                    transition: 'all 0.15s',
                  }}>
                  {op.label}
                </Box>
              ))}
            </Box>
          </Grid>

          {/* ── Datos del beneficiario ── */}
          <SeccionTitulo>{esNino ? 'Datos del menor' : 'Datos del beneficiario'}</SeccionTitulo>

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
              value={form.fechaNacimiento} onChange={handleFechaNacimiento}
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
          {categoria && (
            <Grid size={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`${categoria.label} · ${categoria.rango}`}
                  size="small"
                  sx={{
                    bgcolor: categoria.color, color: categoria.tc,
                    fontWeight: 700, fontSize: '0.78rem',
                    border: '1px solid', borderColor: `${categoria.tc}55`,
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Categoría detectada automáticamente
                </Typography>
              </Box>
            </Grid>
          )}
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
            <TextField fullWidth label={esNino ? 'N.º de hermanos' : 'N.º de hijos'} size="small" type="number"
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
              slotProps={{ popper: { placement: 'bottom-start', modifiers: [{ name: 'flip', enabled: false }] } }}
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
              <TextField fullWidth label="Descripción de la alergia" size="small"
                value={form.descripcionAlergia} onChange={capitalizar('descripcionAlergia')} required />
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
              <TextField fullWidth label="Descripción de la discapacidad / condición" size="small"
                value={form.descripcionDiscapacidad} onChange={capitalizar('descripcionDiscapacidad')} />
            </Grid>
          )}

          {/* ── Educación ── */}
          <SeccionTitulo>Educación</SeccionTitulo>

          {esNino ? (
            <>
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
            </>
          ) : (
            <Grid size={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Nivel educativo alcanzado</InputLabel>
                <Select
                  label="Nivel educativo alcanzado"
                  value={form.gradoEscolar}
                  onChange={set('gradoEscolar')}>
                  <MenuItem value=""><em>No especificado</em></MenuItem>
                  {NIVELES_EDUCATIVOS.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* ── Acudiente (solo niños) ── */}
          {esNino && (<>
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
          </>)}

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
              label={esNino
                ? "Autorizo la inscripción del menor a los programas de la Fundación Panorama de Colores y el uso de sus datos con fines institucionales."
                : "Autorizo mi inscripción a los programas de la Fundación Panorama de Colores y el uso de mis datos con fines institucionales."}
            />
          </Grid>

          {/* ── Fotos ── */}
          <SeccionTitulo>Fotos</SeccionTitulo>

          <Grid size={{ xs: 12, sm: 4 }}>
            <UploadFoto
              label={esNino ? 'Foto del menor' : 'Foto del beneficiario'}
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
          disabled={guardando || !form.primerNombre || !form.primerApellido || (esNino && !form.nombreAcudiente)}
          sx={{ bgcolor: 'var(--color-primario)' }}
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

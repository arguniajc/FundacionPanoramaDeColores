// Formulario wizard: stepper 5 pasos, borrador localStorage, validación en tiempo real, confirmación al cerrar.
import { useState, useEffect } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField, MenuItem, FormControl,
  InputLabel, Select, Typography, Alert, CircularProgress,
  InputAdornment, IconButton, Autocomplete, Checkbox, FormControlLabel, Chip,
  Stepper, Step, StepLabel,
} from '@mui/material';
import PersonAddIcon      from '@mui/icons-material/PersonAdd';
import CloseIcon          from '@mui/icons-material/Close';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import NavigateNextIcon   from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import apiClient          from '@/infrastructure/http/apiClient';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import {
  CAMPOS_POR_PASO, DOCS_NUMERICOS, validarPaso, primerPasoConErrores, describirError,
} from '@/domain/beneficiarios/validacionBeneficiario';
import { TIPOS_DOC, PARENTESCOS, TALLAS_CAMISA, TALLAS_PANTALON, TALLAS_ZAPATOS, EPS_LIST, PAISES } from '@/shared/constants/beneficiarios';
import UploadFoto      from '@/shared/components/UploadFoto';
import UploadDocumento from '@/shared/components/UploadDocumento';
import { useGeografia } from '@/shared/hooks/useGeografia';

const DRAFT_KEY = 'nuevo_beneficiario_draft';
const GRADOS = ['Prejardín','Jardín','Transición','1°','2°','3°','4°','5°','6°','7°','8°','9°','10°','11°'];
const NIVELES_EDUCATIVOS = [
  'Sin estudios formales', 'Primaria incompleta', 'Primaria completa',
  'Bachillerato incompleto', 'Bachillerato completo',
  'Técnico/a', 'Tecnólogo/a', 'Profesional', 'Especialización', 'Maestría', 'Doctorado',
];
const GENEROS = ['Masculino', 'Femenino', 'No binario', 'Prefiero no decir'];
const PASOS   = ['Datos personales', 'Tallas', 'Salud', 'Acudiente', 'Autorización'];

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

const FORM_VACIO = {
  tipo: 'niño',
  primerNombre: '', segundoNombre: '', primerApellido: '', segundoApellido: '',
  fechaNacimiento: '', tipoDocumento: 'RC', numeroDocumento: '',
  genero: '',
  paisNacimiento: 'Colombia', departamentoNacimiento: '', ciudadNacimiento: '',
  barrio: '', direccion: '', numPersonasVive: '', numHermanos: '',
  tallaCamisa: '', tallaPantalon: '', tallaZapatos: '', pesoKg: '', tallaCm: '',
  eps: '', tieneAlergia: 'no', descripcionAlergia: '', observacionesSalud: '',
  tieneDiscapacidad: false, descripcionDiscapacidad: '',
  nombreColegio: '', gradoEscolar: '',
  nombreAcudiente: '', parentesco: 'Madre', whatsapp: '', viveConNino: '',
  autorizacion: false,
  fotoMenorUrl: null, fotoDocumentoUrl: null, fotoDocumentoReversoUrl: null,
};

function SeccionTitulo({ children }) {
  return (
    <Grid size={12}>
      <Box sx={{
        bgcolor: 'secondary.main', borderRadius: 1.5, px: 2, py: 1, mt: 1,
        display: 'flex', alignItems: 'center', borderLeft: '5px solid rgba(0,0,0,0.15)',
      }}>
        <Typography fontWeight={800} color="white"
          sx={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          {children}
        </Typography>
      </Box>
    </Grid>
  );
}

function ErrMsg({ msg }) {
  if (!msg) return null;
  return <Typography sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.3, ml: 1.5 }}>{msg}</Typography>;
}

export default function NuevoBeneficiario({ onCerrar, onCreado, tipoDefault = 'niño' }) {
  const [paso,          setPaso]          = useState(0);
  const [form,          setForm]          = useState(() => {
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      if (d) return JSON.parse(d);
      return tipoDefault === 'adulto'
        ? { ...FORM_VACIO, tipo: 'adulto', tipoDocumento: 'CC' }
        : FORM_VACIO;
    } catch { return FORM_VACIO; }
  });
  const [hasDraft,      setHasDraft]      = useState(() => !!localStorage.getItem(DRAFT_KEY));
  const [touched,       setTouched]       = useState({});
  const [guardando,     setGuardando]     = useState(false);
  const [error,         setError]         = useState('');
  const [docExiste,     setDocExiste]     = useState(false);
  const [verificandoDoc,setVerificandoDoc]= useState(false);
  const [confirmCerrar, setConfirmCerrar] = useState(false);
  const [resumenPaso,   setResumenPaso]   = useState(false);

  const { esColombia, departamentos, ciudades, deptoHabilitado, ciudadHabilitada } =
    useGeografia(form.paisNacimiento, form.departamentoNacimiento);

  useEffect(() => { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); }, [form]);

  const esNino    = form.tipo === 'niño';
  const categoria = calcularCategoria(form.fechaNacimiento);

  const set  = campo => e => setForm(prev => ({ ...prev, [campo]: e.target.value }));
  const setV = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));
  const capitalizar = campo => e => {
    const v = e.target.value.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    setForm(prev => ({ ...prev, [campo]: v }));
  };
  const soloDigitos = campo => e =>
    setForm(prev => ({ ...prev, [campo]: e.target.value.replace(/\D/g, '') }));
  const touch = campo => () => setTouched(prev => ({ ...prev, [campo]: true }));

  const handleFechaNacimiento = e => {
    const fecha = e.target.value;
    touch('fechaNacimiento')();
    setForm(prev => {
      const cat      = calcularCategoria(fecha);
      const esAdulto = cat && (cat.label === 'Joven' || cat.label === 'Adulto' || cat.label === 'Adulto mayor');
      const nuevoTipo = esAdulto ? 'adulto' : 'niño';
      return {
        ...prev, fechaNacimiento: fecha, tipo: nuevoTipo,
        tipoDocumento: nuevoTipo !== prev.tipo ? (esAdulto ? 'CC' : 'RC') : prev.tipoDocumento,
      };
    });
  };

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
    touch('numeroDocumento')();
    const num = form.numeroDocumento.trim();
    if (!num) { setDocExiste(false); return; }
    setVerificandoDoc(true);
    try {
      const { data } = await apiClient.get(`/api/beneficiarios/verificar-documento/${num}`);
      setDocExiste(data.existe);
    } catch { /* ignorar */ }
    finally { setVerificandoDoc(false); }
  };

  const limpiarDraft = () => { localStorage.removeItem(DRAFT_KEY); setHasDraft(false); };
  const descartarDraft = () => { setForm(FORM_VACIO); limpiarDraft(); };

  const isDirty = JSON.stringify(form) !== JSON.stringify(FORM_VACIO);
  const handleCerrar = () => { if (isDirty) setConfirmCerrar(true); else { limpiarDraft(); onCerrar(); } };

  // ── Validación por paso (reglas centralizadas en validacionBeneficiario) ───────
  const erroresDelPaso = p => {
    const e = validarPaso(p, form);
    if (p === 0 && docExiste) e.numeroDocumento = 'Este documento ya está registrado. Búscalo en la lista en vez de inscribirlo de nuevo.';
    return e;
  };
  const errsPaso = erroresDelPaso(paso);
  const t = touched; // alias corto
  // El mensaje del campo aparece cuando el usuario ya pasó por él o intentó avanzar
  const err = campo => (t[campo] ? (errsPaso[campo] ?? '') : '');

  const marcarPaso = p => setTouched(prev => ({
    ...prev, ...Object.fromEntries(CAMPOS_POR_PASO[p].map(c => [c, true])),
  }));

  // No deja pasar al siguiente paso hasta que los datos estén bien
  const intentarAvanzar = () => {
    if (Object.keys(errsPaso).length > 0) { marcarPaso(paso); setResumenPaso(true); return; }
    setResumenPaso(false);
    setPaso(p => p + 1);
  };

  // ── Renders por paso ───────────────────────────────────────────────────────────
  const renderPaso0 = () => (
    <Grid container spacing={2.5}>
      <Grid size={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>Tipo:</Typography>
          {[
            { value: 'niño',   label: '👦 Niño / Adolescente  (menor de 18)' },
            { value: 'adulto', label: '🧑 Adulto  (18 años en adelante)' },
          ].map(op => (
            <Box key={op.value} component="button" type="button"
              onClick={() => setForm(p => ({
                ...p, tipo: op.value, tipoDocumento: op.value === 'adulto' ? 'CC' : 'RC',
                gradoEscolar: '', ...(op.value === 'adulto' ? { nombreColegio: '' } : {}),
              }))}
              sx={{
                px: 2, py: 0.75, borderRadius: 5, border: '2px solid',
                borderColor: form.tipo === op.value ? 'primary.main' : '#ccc',
                bgcolor: form.tipo === op.value ? 'primary.main' : 'transparent',
                color: form.tipo === op.value ? '#fff' : 'text.secondary',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s',
              }}>
              {op.label}
            </Box>
          ))}
        </Box>
      </Grid>

      <SeccionTitulo>{esNino ? 'Datos del menor' : 'Datos del beneficiario'}</SeccionTitulo>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Primer nombre *" size="small" required
          value={form.primerNombre} onChange={capitalizar('primerNombre')} onBlur={touch('primerNombre')}
          error={!!err('primerNombre')}
          helperText={err('primerNombre')} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Segundo nombre" size="small"
          value={form.segundoNombre} onChange={capitalizar('segundoNombre')} onBlur={touch('segundoNombre')}
          error={!!err('segundoNombre')}
          helperText={err('segundoNombre')} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Primer apellido *" size="small" required
          value={form.primerApellido} onChange={capitalizar('primerApellido')} onBlur={touch('primerApellido')}
          error={!!err('primerApellido')}
          helperText={err('primerApellido')} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Segundo apellido" size="small"
          value={form.segundoApellido} onChange={capitalizar('segundoApellido')} onBlur={touch('segundoApellido')}
          error={!!err('segundoApellido')}
          helperText={err('segundoApellido')} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label="Fecha de nacimiento *" size="small" type="date" required
          value={form.fechaNacimiento} onChange={handleFechaNacimiento}
          error={!!err('fechaNacimiento')}
          helperText={err('fechaNacimiento')}
          slotProps={{ inputLabel: { shrink: true } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <FormControl fullWidth size="small" error={!!err('tipoDocumento')}>
          <InputLabel>Tipo de documento</InputLabel>
          <Select label="Tipo de documento" value={form.tipoDocumento}
            onChange={e => { setForm(p => ({ ...p, tipoDocumento: e.target.value })); touch('tipoDocumento')(); }}>
            {TIPOS_DOC.map(tp => <MenuItem key={tp} value={tp}>{tp}</MenuItem>)}
          </Select>
          <ErrMsg msg={err('tipoDocumento')} />
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label="Número de documento *" size="small" required
          value={form.numeroDocumento}
          onChange={e => {
            // RC/TI/CC/NUIP solo números; pasaporte, CE, PPT y RAMV admiten letras
            const v = DOCS_NUMERICOS.includes(form.tipoDocumento)
              ? e.target.value.replace(/\D/g, '')
              : e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            setV('numeroDocumento', v); setDocExiste(false);
          }}
          onBlur={verificarDocumento}
          error={!!err('numeroDocumento')}
          helperText={err('numeroDocumento')}
          slotProps={{
            input: {
              endAdornment: verificandoDoc
                ? <InputAdornment position="end"><CircularProgress size={14} /></InputAdornment>
                : (docExiste === false && form.numeroDocumento
                  ? <InputAdornment position="end"><CheckCircleIcon sx={{ fontSize: 16, color: '#2e7d32' }} /></InputAdornment>
                  : null),
            },
          }}
        />
      </Grid>
      {categoria && (
        <Grid size={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label={`${categoria.label} · ${categoria.rango}`} size="small"
              sx={{ bgcolor: categoria.color, color: categoria.tc, fontWeight: 700, fontSize: '0.78rem', border: '1px solid', borderColor: `${categoria.tc}55` }} />
            <Typography variant="caption" color="text.secondary">Categoría detectada automáticamente</Typography>
          </Box>
        </Grid>
      )}
      <Grid size={{ xs: 12, sm: 4 }}>
        <FormControl fullWidth size="small" required error={!!err('genero')}>
          <InputLabel>Género *</InputLabel>
          <Select label="Género *" value={form.genero} onChange={set('genero')} onBlur={touch('genero')}>
            <MenuItem value=""><em>Selecciona</em></MenuItem>
            {GENEROS.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
          </Select>
          <ErrMsg msg={err('genero')} />
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Autocomplete
          options={PAISES} value={form.paisNacimiento} disableClearable
          onChange={(_, v) => setForm(p => ({ ...p, paisNacimiento: v || '', departamentoNacimiento: '', ciudadNacimiento: '' }))}
          renderInput={params => <TextField {...params} label="País de nacimiento" size="small" />}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        {esColombia ? (
          <Autocomplete options={departamentos} value={form.departamentoNacimiento || null} disabled={!deptoHabilitado}
            onChange={(_, v) => { setForm(p => ({ ...p, departamentoNacimiento: v || '', ciudadNacimiento: '' })); setTouched(p => ({ ...p, departamentoNacimiento: true })); }}
            renderInput={params => (
              <TextField {...params} label="Departamento *" size="small"
                error={!!err('departamentoNacimiento')}
                helperText={err('departamentoNacimiento')} />
            )}
          />
        ) : (
          <TextField fullWidth label="Departamento / Estado *" size="small"
            value={form.departamentoNacimiento} disabled={!deptoHabilitado}
            onChange={capitalizar('departamentoNacimiento')} onBlur={touch('departamentoNacimiento')}
            error={!!err('departamentoNacimiento')}
            helperText={err('departamentoNacimiento')} />
        )}
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        {esColombia ? (
          <Autocomplete options={ciudades} value={form.ciudadNacimiento || null} disabled={!ciudadHabilitada}
            onChange={(_, v) => { setV('ciudadNacimiento', v || ''); setTouched(p => ({ ...p, ciudadNacimiento: true })); }}
            renderInput={params => (
              <TextField {...params} label="Ciudad / Municipio *" size="small"
                error={!!err('ciudadNacimiento')}
                helperText={err('ciudadNacimiento')} />
            )}
          />
        ) : (
          <TextField fullWidth label="Ciudad *" size="small"
            value={form.ciudadNacimiento} disabled={!ciudadHabilitada}
            onChange={capitalizar('ciudadNacimiento')} onBlur={touch('ciudadNacimiento')}
            error={!!err('ciudadNacimiento')}
            helperText={err('ciudadNacimiento')} />
        )}
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label="Barrio *" size="small" required
          value={form.barrio} onChange={capitalizar('barrio')} onBlur={touch('barrio')}
          error={!!err('barrio')}
          helperText={err('barrio') || nr('barrio')}
          slotProps={{ htmlInput: form.barrio === 'No registra' ? { readOnly: true } : undefined }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="N.º personas con quienes vive *" size="small" type="number" required
          value={form.numPersonasVive} onChange={set('numPersonasVive')} onBlur={touch('numPersonasVive')}
          error={!!err('numPersonasVive')}
          helperText={err('numPersonasVive')}
          slotProps={{ htmlInput: { min: 1, max: 20 } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label={esNino ? 'N.º de hermanos *' : 'N.º de hijos *'} size="small" type="number" required
          value={form.numHermanos} onChange={set('numHermanos')} onBlur={touch('numHermanos')}
          error={!!err('numHermanos')}
          helperText={err('numHermanos')}
          slotProps={{ htmlInput: { min: 0, max: 20 } }} />
      </Grid>
    </Grid>
  );

  const renderPaso1 = () => (
    <Grid container spacing={2.5}>
      <SeccionTitulo>Tallas</SeccionTitulo>
      <Grid size={{ xs: 12, sm: 4 }}>
        <FormControl fullWidth size="small" required error={!!err('tallaCamisa')}>
          <InputLabel>Talla camisa *</InputLabel>
          <Select label="Talla camisa *" value={form.tallaCamisa} onChange={set('tallaCamisa')} onBlur={touch('tallaCamisa')}>
            <MenuItem value=""><em>Selecciona</em></MenuItem>
            {TALLAS_CAMISA.map(tp => <MenuItem key={tp} value={tp}>{tp}</MenuItem>)}
          </Select>
          <ErrMsg msg={err('tallaCamisa')} />
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Autocomplete freeSolo options={TALLAS_PANTALON}
          value={form.tallaPantalon}
          onChange={(_, v) => setV('tallaPantalon', v ?? '')}
          onInputChange={(_, v) => setV('tallaPantalon', v)}
          renderInput={params => (
            <TextField {...params} fullWidth label="Talla pantalón *" size="small" required
              onBlur={touch('tallaPantalon')}
              error={!!err('tallaPantalon')}
              helperText={err('tallaPantalon')} />
          )} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Autocomplete freeSolo options={TALLAS_ZAPATOS}
          value={form.tallaZapatos}
          onChange={(_, v) => setV('tallaZapatos', v ?? '')}
          onInputChange={(_, v) => setV('tallaZapatos', v)}
          renderInput={params => (
            <TextField {...params} fullWidth label="Talla zapatos *" size="small" required
              onBlur={touch('tallaZapatos')}
              error={!!err('tallaZapatos')}
              helperText={err('tallaZapatos')} />
          )} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Peso *" size="small" type="number" required
          value={form.pesoKg} onChange={set('pesoKg')} onBlur={touch('pesoKg')}
          error={!!err('pesoKg')}
          helperText={err('pesoKg')}
          slotProps={{ htmlInput: { min: 1, max: 200, step: 0.1 },
            input: { endAdornment: <InputAdornment position="end">kg</InputAdornment> } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Talla (altura) *" size="small" type="number" required
          value={form.tallaCm} onChange={set('tallaCm')} onBlur={touch('tallaCm')}
          error={!!err('tallaCm')}
          helperText={err('tallaCm')}
          slotProps={{ htmlInput: { min: 30, max: 250 },
            input: { endAdornment: <InputAdornment position="end">cm</InputAdornment> } }} />
      </Grid>
    </Grid>
  );

  const renderPaso2 = () => (
    <Grid container spacing={2.5}>
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
            <TextField {...params} fullWidth label="EPS *" size="small" required
              onBlur={touch('eps')}
              error={!!err('eps')}
              helperText={err('eps') || nr('eps')}
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
            value={form.descripcionAlergia} onChange={capitalizar('descripcionAlergia')} onBlur={touch('descripcionAlergia')}
            error={!!err('descripcionAlergia')} helperText={err('descripcionAlergia')} />
        </Grid>
      )}
      <Grid size={12}>
        <TextField fullWidth label="Observaciones de salud" size="small" multiline rows={2}
          value={form.observacionesSalud} onChange={capitalizar('observacionesSalud')} />
      </Grid>
      <Grid size={12}>
        <FormControlLabel
          control={
            <Checkbox checked={form.tieneDiscapacidad}
              onChange={e => setForm(p => ({ ...p, tieneDiscapacidad: e.target.checked, descripcionDiscapacidad: '' }))}
              color="secondary" />
          }
          label="Tiene discapacidad o condición de salud especial"
        />
      </Grid>
      {form.tieneDiscapacidad && (
        <Grid size={12}>
          <TextField fullWidth label="Descripción de la discapacidad / condición *" size="small"
            value={form.descripcionDiscapacidad} onChange={capitalizar('descripcionDiscapacidad')} onBlur={touch('descripcionDiscapacidad')}
            error={!!err('descripcionDiscapacidad')} helperText={err('descripcionDiscapacidad')} />
        </Grid>
      )}
    </Grid>
  );

  const renderPaso3 = () => (
    <Grid container spacing={2.5}>
      {esNino && (<>
        <SeccionTitulo>Acudiente</SeccionTitulo>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth label="Nombre del acudiente *" size="small" required
            value={form.nombreAcudiente} onChange={capitalizar('nombreAcudiente')} onBlur={touch('nombreAcudiente')}
            error={!!err('nombreAcudiente')}
            helperText={err('nombreAcudiente')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small" required error={!!err('parentesco')}>
            <InputLabel>Parentesco *</InputLabel>
            <Select label="Parentesco *" value={form.parentesco} onChange={set('parentesco')} onBlur={touch('parentesco')}>
              <MenuItem value=""><em>Selecciona</em></MenuItem>
              {PARENTESCOS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
            <ErrMsg msg={err('parentesco')} />
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth label="WhatsApp *" size="small" required
            value={form.whatsapp} onChange={soloDigitos('whatsapp')} onBlur={touch('whatsapp')}
            error={!!err('whatsapp')}
            helperText={err('whatsapp')}
            placeholder="Ej: 3001234567"
            slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small" required error={!!err('viveConNino')}>
            <InputLabel>¿Vive con el niño? *</InputLabel>
            <Select label="¿Vive con el niño? *" value={form.viveConNino} onChange={set('viveConNino')} onBlur={touch('viveConNino')}>
              <MenuItem value=""><em>Selecciona</em></MenuItem>
              <MenuItem value="si">Sí</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </Select>
            <ErrMsg msg={err('viveConNino')} />
          </FormControl>
        </Grid>
        <Grid size={12}>
          <TextField fullWidth label="Dirección *" size="small" required
            value={form.direccion} onChange={capitalizar('direccion')} onBlur={touch('direccion')}
            error={!!err('direccion')}
            helperText={err('direccion') || nr('direccion')}
            slotProps={{ htmlInput: form.direccion === 'No registra' ? { readOnly: true } : undefined }} />
        </Grid>
      </>)}

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
            <Autocomplete freeSolo options={GRADOS} value={form.gradoEscolar}
              onInputChange={(_, v) => setV('gradoEscolar', v)}
              renderInput={params => <TextField {...params} label="Grado escolar" size="small" />}
            />
          </Grid>
        </>
      ) : (
        <>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth label="Dirección" size="small"
              value={form.direccion} onChange={capitalizar('direccion')}
              slotProps={{ htmlInput: form.direccion === 'No registra' ? { readOnly: true } : undefined }}
              helperText={nr('direccion')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Nivel educativo alcanzado</InputLabel>
              <Select label="Nivel educativo alcanzado" value={form.gradoEscolar} onChange={set('gradoEscolar')}>
                <MenuItem value=""><em>No especificado</em></MenuItem>
                {NIVELES_EDUCATIVOS.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </>
      )}
    </Grid>
  );

  const renderPaso4 = () => (
    <Grid container spacing={2.5}>
      <SeccionTitulo>Autorización</SeccionTitulo>
      <Grid size={12}>
        <FormControlLabel
          control={
            <Checkbox checked={form.autorizacion}
              onChange={e => { setForm(p => ({ ...p, autorizacion: e.target.checked })); touch('autorizacion')(); }}
              color="primary" />
          }
          label={esNino
            ? 'Autorizo la inscripción del menor a los programas de la Fundación Panorama de Colores y el uso de sus datos con fines institucionales.'
            : 'Autorizo mi inscripción a los programas de la Fundación Panorama de Colores y el uso de mis datos con fines institucionales.'}
        />
        {err('autorizacion') && (
          <Typography sx={{ color: 'error.main', fontSize: '0.75rem', ml: 1.5 }}>{err('autorizacion')}</Typography>
        )}
      </Grid>

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
        />
      </Grid>
    </Grid>
  );

  const pasoRenders = [renderPaso0, renderPaso1, renderPaso2, renderPaso3, renderPaso4];

  const handleGuardar = async () => {
    const pasoConError = primerPasoConErrores(form);
    if (pasoConError !== -1 || docExiste) {
      const destino = pasoConError === -1 ? 0 : pasoConError;
      marcarPaso(destino); setPaso(destino); setResumenPaso(true);
      return;
    }
    setGuardando(true); setError('');
    try {
      await apiClient.post('/api/beneficiarios', {
        tipo:                    form.tipo,
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
        nombreAcudiente:         esNino ? form.nombreAcudiente.trim() : null,
        parentesco:              esNino ? (form.parentesco || null)   : null,
        whatsapp:                esNino ? (form.whatsapp.trim() || null) : null,
        viveConNino:             esNino ? (form.viveConNino === 'si' ? true : form.viveConNino === 'no' ? false : null) : null,
        autorizacion:            form.autorizacion,
        fotoMenorUrl:            form.fotoMenorUrl            || null,
        fotoDocumentoUrl:        form.fotoDocumentoUrl        || null,
        fotoDocumentoReversoUrl: form.fotoDocumentoReversoUrl || null,
      });
      limpiarDraft();
      onCreado();
    } catch (err) {
      setError(mensajeErrorApi(err, { conflicto: 'Ese número de documento ya está inscrito.', accion: 'inscribir el beneficiario' }));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Dialog open onClose={handleCerrar} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, var(--color-primario) 0%, var(--color-secundario) 100%)',
          color: '#fff', fontWeight: 700, py: 2, px: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAddIcon />
            Inscribir nuevo beneficiario
          </Box>
          <IconButton onClick={handleCerrar} size="small" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
          {hasDraft && (
            <Alert severity="info" sx={{ mb: 2 }}
              action={<Button size="small" color="inherit" onClick={descartarDraft}>Descartar borrador</Button>}>
              Se restauró un borrador guardado anteriormente.
            </Alert>
          )}

          <Stepper activeStep={paso} alternativeLabel sx={{ mb: 3 }}>
            {PASOS.map((label, i) => (
              <Step key={label} completed={i < paso}>
                <StepLabel sx={{
                  '& .MuiStepLabel-label': { fontSize: '0.73rem' },
                  '& .MuiStepIcon-root.Mui-active':    { color: 'var(--color-primario)' },
                  '& .MuiStepIcon-root.Mui-completed': { color: 'var(--color-secundario)' },
                }}>
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {pasoRenders[paso]()}
        </DialogContent>

        {resumenPaso && Object.keys(errsPaso).length > 0 && (
          <Alert severity="warning" onClose={() => setResumenPaso(false)} sx={{ mx: 3, mt: 1.5, mb: 0 }}>
            <Typography fontWeight={700} fontSize="0.85rem" mb={0.5}>
              Corrige estos datos para continuar:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: '0.8rem' }}>
              {Object.entries(errsPaso).map(([campo, msg]) => (
                <li key={campo}>{describirError(campo, msg)}</li>
              ))}
            </Box>
          </Alert>
        )}
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mx: 3, mt: 1.5, mb: 0 }}>
            {error}
          </Alert>
        )}
        <DialogActions sx={{ px: 3, py: 2, gap: 1, justifyContent: 'space-between' }}>
          <Button onClick={() => { setResumenPaso(false); setPaso(p => p - 1); }} disabled={paso === 0}
            startIcon={<NavigateBeforeIcon />} variant="outlined">
            Anterior
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleCerrar} disabled={guardando} variant="outlined" color="inherit">
              Cancelar
            </Button>
            {paso < PASOS.length - 1 ? (
              <Button variant="contained" onClick={intentarAvanzar} disabled={verificandoDoc}
                endIcon={<NavigateNextIcon />}
                sx={{ bgcolor: 'var(--color-primario)', fontWeight: 700 }}>
                Siguiente
              </Button>
            ) : (
              <Button variant="contained" onClick={handleGuardar}
                disabled={guardando}
                startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
                sx={{ bgcolor: 'var(--color-primario)', '&:hover': { bgcolor: 'var(--color-gradiente)' }, fontWeight: 700, minWidth: 160 }}>
                {guardando ? 'Registrando…' : 'Inscribir beneficiario'}
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmCerrar} onClose={() => setConfirmCerrar(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>¿Salir sin guardar?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Los datos ingresados se mantendrán como borrador y se restaurarán la próxima vez que abras el formulario.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmCerrar(false)} variant="outlined">Seguir editando</Button>
          <Button onClick={() => { setConfirmCerrar(false); onCerrar(); }} variant="contained" color="error">
            Salir sin guardar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

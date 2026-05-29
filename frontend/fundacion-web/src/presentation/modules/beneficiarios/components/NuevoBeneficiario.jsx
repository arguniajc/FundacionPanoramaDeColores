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

  // ── Validación por paso ────────────────────────────────────────────────────────
  const erroresPor = [
    () => {
      const e = [];
      if (!form.primerNombre.trim())    e.push('primerNombre');
      if (!form.primerApellido.trim())  e.push('primerApellido');
      if (!form.fechaNacimiento)        e.push('fechaNacimiento');
      if (docExiste)                    e.push('numeroDocumento');
      if (!form.genero)                 e.push('genero');
      if (!form.departamentoNacimiento) e.push('departamentoNacimiento');
      if (!form.ciudadNacimiento)       e.push('ciudadNacimiento');
      if (!form.barrio.trim())         e.push('barrio');
      if (form.numPersonasVive === '')  e.push('numPersonasVive');
      if (form.numHermanos === '')      e.push('numHermanos');
      return e;
    },
    () => {
      const e = [];
      if (!form.tallaCamisa)            e.push('tallaCamisa');
      if (!form.tallaPantalon.trim())   e.push('tallaPantalon');
      if (!form.tallaZapatos.trim())    e.push('tallaZapatos');
      if (form.pesoKg === '')          e.push('pesoKg');
      if (form.tallaCm === '')         e.push('tallaCm');
      return e;
    },
    () => (!form.eps.trim() ? ['eps'] : []),
    () => {
      if (!esNino) return [];
      const e = [];
      if (!form.nombreAcudiente.trim()) e.push('nombreAcudiente');
      if (!form.parentesco)             e.push('parentesco');
      if (!form.whatsapp.trim())        e.push('whatsapp');
      if (form.viveConNino === '')      e.push('viveConNino');
      if (!form.direccion.trim())       e.push('direccion');
      return e;
    },
    () => (!form.autorizacion ? ['autorizacion'] : []),
  ];

  const errsPaso       = erroresPor[paso]();
  const puedeAvanzar   = errsPaso.length === 0 && !verificandoDoc;
  const t = touched; // alias corto
  const err = (campo, cond) => t[campo] && cond ? 'Campo obligatorio' : '';

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
          error={!!err('primerNombre', !form.primerNombre.trim())}
          helperText={err('primerNombre', !form.primerNombre.trim())} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Segundo nombre" size="small"
          value={form.segundoNombre} onChange={capitalizar('segundoNombre')} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Primer apellido *" size="small" required
          value={form.primerApellido} onChange={capitalizar('primerApellido')} onBlur={touch('primerApellido')}
          error={!!err('primerApellido', !form.primerApellido.trim())}
          helperText={err('primerApellido', !form.primerApellido.trim())} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Segundo apellido" size="small"
          value={form.segundoApellido} onChange={capitalizar('segundoApellido')} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label="Fecha de nacimiento *" size="small" type="date" required
          value={form.fechaNacimiento} onChange={handleFechaNacimiento}
          error={!!(t.fechaNacimiento && !form.fechaNacimiento)}
          helperText={t.fechaNacimiento && !form.fechaNacimiento ? 'Campo obligatorio' : ''}
          slotProps={{ inputLabel: { shrink: true } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Tipo de documento</InputLabel>
          <Select label="Tipo de documento" value={form.tipoDocumento} onChange={set('tipoDocumento')}>
            {TIPOS_DOC.map(tp => <MenuItem key={tp} value={tp}>{tp}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label="Número de documento *" size="small" required
          value={form.numeroDocumento}
          onChange={e => { soloDigitos('numeroDocumento')(e); setDocExiste(false); }}
          onBlur={verificarDocumento}
          error={docExiste || !!(t.numeroDocumento && !form.numeroDocumento.trim())}
          helperText={docExiste ? 'Este documento ya está registrado' : err('numeroDocumento', !form.numeroDocumento.trim())}
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
        <FormControl fullWidth size="small" required error={!!(t.genero && !form.genero)}>
          <InputLabel>Género *</InputLabel>
          <Select label="Género *" value={form.genero} onChange={set('genero')} onBlur={touch('genero')}>
            <MenuItem value=""><em>Selecciona</em></MenuItem>
            {GENEROS.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
          </Select>
          <ErrMsg msg={err('genero', !form.genero)} />
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
                error={!!(t.departamentoNacimiento && !form.departamentoNacimiento)}
                helperText={err('departamentoNacimiento', !form.departamentoNacimiento)} />
            )}
          />
        ) : (
          <TextField fullWidth label="Departamento / Estado *" size="small"
            value={form.departamentoNacimiento} disabled={!deptoHabilitado}
            onChange={capitalizar('departamentoNacimiento')} onBlur={touch('departamentoNacimiento')}
            error={!!(t.departamentoNacimiento && !form.departamentoNacimiento)}
            helperText={err('departamentoNacimiento', !form.departamentoNacimiento)} />
        )}
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        {esColombia ? (
          <Autocomplete options={ciudades} value={form.ciudadNacimiento || null} disabled={!ciudadHabilitada}
            onChange={(_, v) => { setV('ciudadNacimiento', v || ''); setTouched(p => ({ ...p, ciudadNacimiento: true })); }}
            renderInput={params => (
              <TextField {...params} label="Ciudad / Municipio *" size="small"
                error={!!(t.ciudadNacimiento && !form.ciudadNacimiento)}
                helperText={err('ciudadNacimiento', !form.ciudadNacimiento)} />
            )}
          />
        ) : (
          <TextField fullWidth label="Ciudad *" size="small"
            value={form.ciudadNacimiento} disabled={!ciudadHabilitada}
            onChange={capitalizar('ciudadNacimiento')} onBlur={touch('ciudadNacimiento')}
            error={!!(t.ciudadNacimiento && !form.ciudadNacimiento)}
            helperText={err('ciudadNacimiento', !form.ciudadNacimiento)} />
        )}
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label="Barrio *" size="small" required
          value={form.barrio} onChange={capitalizar('barrio')} onBlur={touch('barrio')}
          error={!!(t.barrio && !form.barrio.trim())}
          helperText={t.barrio && !form.barrio.trim() ? 'Campo obligatorio' : nr('barrio')}
          slotProps={{ htmlInput: form.barrio === 'No registra' ? { readOnly: true } : undefined }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="N.º personas con quienes vive *" size="small" type="number" required
          value={form.numPersonasVive} onChange={set('numPersonasVive')} onBlur={touch('numPersonasVive')}
          error={!!(t.numPersonasVive && form.numPersonasVive === '')}
          helperText={err('numPersonasVive', form.numPersonasVive === '')}
          slotProps={{ htmlInput: { min: 1, max: 20 } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label={esNino ? 'N.º de hermanos *' : 'N.º de hijos *'} size="small" type="number" required
          value={form.numHermanos} onChange={set('numHermanos')} onBlur={touch('numHermanos')}
          error={!!(t.numHermanos && form.numHermanos === '')}
          helperText={err('numHermanos', form.numHermanos === '')}
          slotProps={{ htmlInput: { min: 0, max: 20 } }} />
      </Grid>
    </Grid>
  );

  const renderPaso1 = () => (
    <Grid container spacing={2.5}>
      <SeccionTitulo>Tallas</SeccionTitulo>
      <Grid size={{ xs: 12, sm: 4 }}>
        <FormControl fullWidth size="small" required error={!!(t.tallaCamisa && !form.tallaCamisa)}>
          <InputLabel>Talla camisa *</InputLabel>
          <Select label="Talla camisa *" value={form.tallaCamisa} onChange={set('tallaCamisa')} onBlur={touch('tallaCamisa')}>
            <MenuItem value=""><em>Selecciona</em></MenuItem>
            {TALLAS_CAMISA.map(tp => <MenuItem key={tp} value={tp}>{tp}</MenuItem>)}
          </Select>
          <ErrMsg msg={err('tallaCamisa', !form.tallaCamisa)} />
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
              error={!!(t.tallaPantalon && !form.tallaPantalon.trim())}
              helperText={err('tallaPantalon', !form.tallaPantalon.trim())} />
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
              error={!!(t.tallaZapatos && !form.tallaZapatos.trim())}
              helperText={err('tallaZapatos', !form.tallaZapatos.trim())} />
          )} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Peso *" size="small" type="number" required
          value={form.pesoKg} onChange={set('pesoKg')} onBlur={touch('pesoKg')}
          error={!!(t.pesoKg && form.pesoKg === '')}
          helperText={err('pesoKg', form.pesoKg === '')}
          slotProps={{ htmlInput: { min: 1, max: 200, step: 0.1 },
            input: { endAdornment: <InputAdornment position="end">kg</InputAdornment> } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Talla (altura) *" size="small" type="number" required
          value={form.tallaCm} onChange={set('tallaCm')} onBlur={touch('tallaCm')}
          error={!!(t.tallaCm && form.tallaCm === '')}
          helperText={err('tallaCm', form.tallaCm === '')}
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
              error={!!(t.eps && !form.eps.trim())}
              helperText={t.eps && !form.eps.trim() ? 'Campo obligatorio' : nr('eps')}
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
            value={form.descripcionDiscapacidad} onChange={capitalizar('descripcionDiscapacidad')} />
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
            error={!!(t.nombreAcudiente && !form.nombreAcudiente.trim())}
            helperText={err('nombreAcudiente', !form.nombreAcudiente.trim())} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small" required error={!!(t.parentesco && !form.parentesco)}>
            <InputLabel>Parentesco *</InputLabel>
            <Select label="Parentesco *" value={form.parentesco} onChange={set('parentesco')} onBlur={touch('parentesco')}>
              <MenuItem value=""><em>Selecciona</em></MenuItem>
              {PARENTESCOS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
            <ErrMsg msg={err('parentesco', !form.parentesco)} />
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth label="WhatsApp *" size="small" required
            value={form.whatsapp} onChange={soloDigitos('whatsapp')} onBlur={touch('whatsapp')}
            error={!!(t.whatsapp && !form.whatsapp.trim())}
            helperText={err('whatsapp', !form.whatsapp.trim())}
            placeholder="Ej: 3001234567"
            slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small" required error={!!(t.viveConNino && form.viveConNino === '')}>
            <InputLabel>¿Vive con el niño? *</InputLabel>
            <Select label="¿Vive con el niño? *" value={form.viveConNino} onChange={set('viveConNino')} onBlur={touch('viveConNino')}>
              <MenuItem value=""><em>Selecciona</em></MenuItem>
              <MenuItem value="si">Sí</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </Select>
            <ErrMsg msg={err('viveConNino', form.viveConNino === '')} />
          </FormControl>
        </Grid>
        <Grid size={12}>
          <TextField fullWidth label="Dirección *" size="small" required
            value={form.direccion} onChange={capitalizar('direccion')} onBlur={touch('direccion')}
            error={!!(t.direccion && !form.direccion.trim())}
            helperText={t.direccion && !form.direccion.trim() ? 'Campo obligatorio' : nr('direccion')}
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
        {t.autorizacion && !form.autorizacion && (
          <Typography sx={{ color: 'error.main', fontSize: '0.75rem', ml: 1.5 }}>Debe aceptar la autorización</Typography>
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
      const msg = err.response?.status === 409
        ? 'Ese número de documento ya está inscrito.'
        : 'Error al guardar. Intenta de nuevo.';
      setError(msg);
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
          {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

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

        <DialogActions sx={{ px: 3, py: 2, gap: 1, justifyContent: 'space-between' }}>
          <Button onClick={() => setPaso(p => p - 1)} disabled={paso === 0}
            startIcon={<NavigateBeforeIcon />} variant="outlined">
            Anterior
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleCerrar} disabled={guardando} variant="outlined" color="inherit">
              Cancelar
            </Button>
            {paso < PASOS.length - 1 ? (
              <Button variant="contained" onClick={() => setPaso(p => p + 1)} disabled={!puedeAvanzar}
                endIcon={<NavigateNextIcon />}
                sx={{ bgcolor: 'var(--color-primario)', fontWeight: 700 }}>
                Siguiente
              </Button>
            ) : (
              <Button variant="contained" onClick={handleGuardar}
                disabled={!form.autorizacion || guardando}
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

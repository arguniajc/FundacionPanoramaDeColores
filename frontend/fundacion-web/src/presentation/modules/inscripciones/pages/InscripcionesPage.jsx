// Gestión de inscripciones: listado con filtros, alta por stepper y edición/PDF del formulario dinámico.
import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Autocomplete, Avatar, Box, Button, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, Grid, IconButton, InputAdornment, InputLabel,
  MenuItem, Select, Snackbar, Step, StepLabel, Stepper, Switch,
  TextField, Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import AddIcon        from '@mui/icons-material/Add';
import CheckIcon      from '@mui/icons-material/Check';
import DeleteIcon     from '@mui/icons-material/Delete';
import EditIcon       from '@mui/icons-material/Edit';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { beneficiariosRepository }  from '../../../../infrastructure/repositories/beneficiariosRepository';
import { generarPdfInscripcion }    from '../../../../shared/utils/generarPdfInscripcion';
import { sedesRepository }          from '../../../../infrastructure/repositories/sedesRepository';
import { inscripcionesRepository }  from '../../../../infrastructure/repositories/inscripcionesRepository';
import { useInscripciones }         from '../../../../application/inscripciones/useInscripciones';
import { archivosRepository }       from '../../../../infrastructure/repositories/archivosRepository';
import {
  PAISES, DEPARTAMENTOS_COLOMBIA, CIUDADES_COLOMBIA,
  TIPOS_DOCUMENTO, GENEROS, TIPOS_SANGRE, ESTRATOS, NIVELES_EDUCATIVOS,
  TALLAS_ROPA, TALLAS_ZAPATOS, VALORACIONES,
} from '../../../../shared/utils/geodata';
import FirmaPad from '../../../../shared/components/FirmaPad';

const COLOR = '#4E1B95';

// Retorna la edad en años completos calculada a partir de una fecha de nacimiento ISO
function calcEdad(fechaNac) {
  if (!fechaNac) return null;
  const nac = new Date(fechaNac + 'T00:00:00');
  const hoy = new Date();
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
  return e;
}

// Formatea una fecha ISO en texto largo con locale español (ej. "08 de mayo de 2025")
function fmtFechaCorta(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

// Agrupa todos los campos de una misma sección juntos, independientemente del orden en el array
function agruparPorSeccion(campos) {
  const orden = [];
  const mapa  = new Map();
  for (const c of campos) {
    const sec = c.seccion?.trim() || '';
    if (!mapa.has(sec)) { mapa.set(sec, []); orden.push(sec); }
    mapa.get(sec).push(c);
  }
  return orden.map(sec => ({ seccion: sec, campos: mapa.get(sec) }));
}

function SeccionHeader({ titulo }) {
  if (!titulo) return null;
  return (
    <Grid size={12}>
      <Box sx={{
        borderLeft: `5px solid ${COLOR}`,
        bgcolor: 'rgba(78,27,149,0.07)',
        borderRadius: '0 8px 8px 0',
        px: 1.5, py: 0.9, mt: 1,
      }}>
        <Typography fontWeight={800} color={COLOR}
          sx={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {titulo}
        </Typography>
      </Box>
    </Grid>
  );
}

const ESTADOS = [
  { value: 'activa',     label: 'Activa',     color: 'success' },
  { value: 'suspendida', label: 'Suspendida', color: 'warning' },
  { value: 'completada', label: 'Completada', color: 'info'    },
  { value: 'baja',       label: 'Baja',       color: 'error'   },
];

function chipEstado(estado) {
  const e = ESTADOS.find(x => x.value === estado) ?? { label: estado, color: 'default' };
  return <Chip label={e.label} size="small" color={e.color} />;
}

// ── Campo dinámico del formulario ─────────────────────────────────────────────

function CampoInput({ campo, value, onChange }) {
  const [subiendo, setSubiendo] = useState(false);

  if (campo.tipo === 'boolean') {
    return (
      <FormControlLabel
        control={<Switch checked={value === 'true' || value === true}
          onChange={e => onChange(e.target.checked ? 'true' : 'false')} />}
        label={campo.etiqueta + (campo.obligatorio ? ' *' : '')}
      />
    );
  }

  if (campo.tipo === 'select') {
    return (
      <FormControl fullWidth size="small" required={campo.obligatorio}>
        <InputLabel>{campo.etiqueta}</InputLabel>
        <Select label={campo.etiqueta} value={value ?? ''} onChange={e => onChange(e.target.value)}>
          {(campo.opciones ?? []).map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </Select>
      </FormControl>
    );
  }

  if (campo.tipo === 'document') {
    // Sube el PDF seleccionado a S3 y guarda la URL retornada como valor del campo
    const handleFile = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setSubiendo(true);
      try {
        const { data } = await archivosRepository.subir(file, 'inscripciones');
        onChange(data.url);
      } catch {
        onChange('');
      } finally {
        setSubiendo(false);
      }
    };
    return (
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
          {campo.etiqueta}{campo.obligatorio ? ' *' : ''}
        </Typography>
        {value ? (
          <Box display="flex" alignItems="center" gap={1}>
            <Chip label="✓ Entregado" color="success" size="small" />
            <Button size="small" onClick={() => window.open(value, '_blank', 'noopener,noreferrer')}>Ver PDF</Button>
            <Button size="small" color="error" onClick={() => onChange('')}>Quitar</Button>
          </Box>
        ) : (
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Chip label="Pendiente" color="warning" size="small" variant="outlined" />
            <Button variant="outlined" component="label" size="small" disabled={subiendo}
              sx={{ color: COLOR, borderColor: COLOR }}>
              {subiendo ? 'Subiendo...' : 'Seleccionar PDF'}
              <input type="file" hidden accept="application/pdf" onChange={handleFile} />
            </Button>
          </Box>
        )}
      </Box>
    );
  }

  if (campo.tipo === 'daterange') {
    let rng = { desde: '', hasta: '' };
    try { if (value) rng = JSON.parse(value); } catch {}
    const setRng = (k, v) => onChange(JSON.stringify({ ...rng, [k]: v }));
    return (
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
          {campo.etiqueta}{campo.obligatorio ? ' *' : ''}
        </Typography>
        <Box display="flex" gap={1} alignItems="center">
          <TextField size="small" label="Desde" type="date" value={rng.desde ?? ''}
            onChange={e => setRng('desde', e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
          <Typography variant="body2" color="text.secondary" flexShrink={0}>—</Typography>
          <TextField size="small" label="Hasta" type="date" value={rng.hasta ?? ''}
            onChange={e => setRng('hasta', e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
        </Box>
      </Box>
    );
  }

  if (campo.tipo === 'talla' || campo.tipo === 'altura') {
    return (
      <TextField fullWidth size="small"
        label={campo.etiqueta}
        type="number"
        required={campo.obligatorio}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        slotProps={{ input: { inputProps: { min: 0, step: 1 }, endAdornment: <InputAdornment position="end">cm</InputAdornment> } }}
      />
    );
  }

  if (campo.tipo === 'edad') {
    return (
      <TextField fullWidth size="small"
        label={campo.etiqueta}
        type="number"
        required={campo.obligatorio}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        helperText="Auto-calculada del beneficiario"
        slotProps={{ input: { endAdornment: <InputAdornment position="end">años</InputAdornment> } }}
      />
    );
  }

  if (campo.tipo === 'fecha_nac') {
    return (
      <TextField fullWidth size="small"
        label={campo.etiqueta}
        type="date"
        required={campo.obligatorio}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        helperText="Auto-completada del beneficiario"
        slotProps={{ inputLabel: { shrink: true } }}
      />
    );
  }

  if (campo.tipo === 'firma') {
    return (
      <FirmaPad
        label={campo.etiqueta}
        value={value ?? ''}
        onChange={onChange}
        obligatorio={campo.obligatorio}
      />
    );
  }

  if (campo.tipo === 'documento_id') {
    let doc = { tipo: '', numero: '' };
    try { if (value) doc = JSON.parse(value); } catch {}
    const setDoc = (k, v) => onChange(JSON.stringify({ ...doc, [k]: v }));
    return (
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
          {campo.etiqueta}{campo.obligatorio ? ' *' : ''}
        </Typography>
        <Box display="flex" gap={1}>
          <FormControl size="small" sx={{ width: 140, flexShrink: 0 }}>
            <InputLabel>Tipo</InputLabel>
            <Select label="Tipo" value={doc.tipo} onChange={e => setDoc('tipo', e.target.value)}>
              {TIPOS_DOCUMENTO.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="Número" sx={{ flex: 1 }}
            value={doc.numero} onChange={e => setDoc('numero', e.target.value)}
            required={campo.obligatorio} />
        </Box>
      </Box>
    );
  }

  if (campo.tipo === 'telefono') return (
    <TextField fullWidth size="small"
      label={campo.etiqueta} type="tel"
      required={campo.obligatorio}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
    />
  );

  if (campo.tipo === 'email') return (
    <TextField fullWidth size="small"
      label={campo.etiqueta} type="email"
      required={campo.obligatorio}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
    />
  );

  if (campo.tipo === 'peso') return (
    <TextField fullWidth size="small"
      label={campo.etiqueta} type="number"
      required={campo.obligatorio}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      slotProps={{ input: { inputProps: { min: 0, step: 0.1 }, endAdornment: <InputAdornment position="end">kg</InputAdornment> } }}
    />
  );

  if (campo.tipo === 'tipo_documento' || campo.tipo === 'genero'  ||
      campo.tipo === 'tipo_sangre'    || campo.tipo === 'estrato' ||
      campo.tipo === 'nivel_educativo'|| campo.tipo === 'talla_ropa' ||
      campo.tipo === 'talla_zapatos'  || campo.tipo === 'valoracion') {
    const listas = {
      tipo_documento: TIPOS_DOCUMENTO, genero: GENEROS,
      tipo_sangre: TIPOS_SANGRE, estrato: ESTRATOS, nivel_educativo: NIVELES_EDUCATIVOS,
      talla_ropa: TALLAS_ROPA, talla_zapatos: TALLAS_ZAPATOS, valoracion: VALORACIONES,
    };
    return (
      <FormControl fullWidth size="small" required={campo.obligatorio}>
        <InputLabel>{campo.etiqueta + (campo.obligatorio ? ' *' : '')}</InputLabel>
        <Select
          label={campo.etiqueta + (campo.obligatorio ? ' *' : '')}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}>
          {listas[campo.tipo].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </Select>
      </FormControl>
    );
  }

  if (campo.tipo === 'pais' || campo.tipo === 'departamento' || campo.tipo === 'ciudad') {
    const opciones = campo.tipo === 'pais' ? PAISES
      : campo.tipo === 'departamento' ? DEPARTAMENTOS_COLOMBIA
      : CIUDADES_COLOMBIA;
    return (
      <Autocomplete
        freeSolo
        options={opciones}
        value={value ?? ''}
        onChange={(_, v) => onChange(v ?? '')}
        onInputChange={(_, v) => onChange(v)}
        renderInput={(params) => (
          <TextField {...params} fullWidth size="small"
            label={campo.etiqueta + (campo.obligatorio ? ' *' : '')}
            required={campo.obligatorio} />
        )}
      />
    );
  }

  return (
    <TextField fullWidth size="small"
      label={campo.etiqueta}
      type={campo.tipo === 'number' ? 'number' : campo.tipo === 'date' ? 'date' : 'text'}
      required={campo.obligatorio}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      slotProps={campo.tipo === 'date' ? { inputLabel: { shrink: true } } : undefined}
    />
  );
}

// ── Ver / Editar formulario ───────────────────────────────────────────────────

function VerFormularioDialog({ inscripcion, onCerrar, onActualizada }) {
  const [campos,        setCampos]        = useState([]);
  const [cargando,      setCargando]      = useState(true);
  const [editando,      setEditando]      = useState(false);
  const [datos,         setDatos]         = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [guardando,     setGuardando]     = useState(false);
  const [generandoPdf,  setGenerandoPdf]  = useState(false);
  const [error,         setError]         = useState('');
  const [beneficiario,  setBeneficiario]  = useState(null);
  const theme   = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Carga campos del programa y datos personales del beneficiario cada vez que cambia la inscripción
  useEffect(() => {
    setCargando(true);
    setEditando(false);
    setError('');
    setBeneficiario(null);
    try { setDatos(JSON.parse(inscripcion.datos || '{}')); } catch { setDatos({}); }
    setObservaciones(inscripcion.observaciones ?? '');
    Promise.all([
      sedesRepository.listarCampos(inscripcion.programaId),
      beneficiariosRepository.obtener(inscripcion.beneficiarioId),
    ])
      .then(([camposRes, benefRes]) => {
        setCampos(camposRes.data);
        setBeneficiario(benefRes.data);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [inscripcion.id]);

  // Guarda los datos del formulario editado en el backend y vuelve al modo vista
  const handleGuardar = async () => {
    setGuardando(true);
    setError('');
    try {
      const result = await inscripcionesRepository.actualizar(inscripcion.id, {
        datos: JSON.stringify(datos),
        observaciones: observaciones.trim() || null,
      });
      onActualizada(result.data);
      setEditando(false);
    } catch {
      setError('No se pudo guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  };

  // Genera un PDF del formulario de inscripción y lo abre en una nueva pestaña para imprimir
  const handleImprimir = async () => {
    setGenerandoPdf(true);
    try {
      const [{ data: benef }, { data: programa }] = await Promise.all([
        beneficiariosRepository.obtener(inscripcion.beneficiarioId),
        sedesRepository.obtenerPrograma(inscripcion.programaId),
      ]);
      const doc = await generarPdfInscripcion({
        inscripcion,
        beneficiario: benef,
        campos,
        datos,
        observaciones,
        conTercero:    programa.tieneTercero ?? false,
        nombreTercero: programa.nombreTercero ?? '',
      });
      // Abrir en nueva pestaña para imprimir desde el visor PDF
      const blob   = doc.output('blob');
      const url    = URL.createObjectURL(blob);
      const nombre = `inscripcion_${(inscripcion.nombreBeneficiario ?? 'beneficiario').replace(/\s+/g, '_')}.pdf`;
      // Intento 1: abrir en nueva pestaña (el usuario puede imprimir desde ahí)
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        // Si el navegador bloqueó la pestaña, descargar directamente
        const a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      setError('No se pudo generar el PDF.');
    } finally {
      setGenerandoPdf(false);
    }
  };

  // Formatea el valor crudo de un campo para visualización legible en modo vista (booleanos, rangos de fecha, unidades)
  const valorVista = (campo) => {
    const v = datos[campo.id];

    if (campo.tipo === 'firma') {
      if (v) return (
        <Box component="img" src={v} alt="Firma"
          sx={{ display: 'block', height: 56, maxWidth: 240, objectFit: 'contain',
                border: '1px solid #e0d9f3', borderRadius: 1, bgcolor: 'white' }} />
      );
      return <Chip label="Sin firma" color="warning" size="small" variant="outlined" />;
    }

    if (campo.tipo === 'documento_id') {
      if (!v) return <em style={{ color: '#aaa' }}>—</em>;
      try {
        const doc = JSON.parse(v);
        return `${doc.tipo || '—'} · ${doc.numero || '—'}`;
      } catch { return String(v); }
    }

    if (campo.tipo === 'document') {
      if (v) return (
        <Box display="flex" alignItems="center" gap={1}>
          <Chip label="✓ Entregado" color="success" size="small" />
          <Button size="small" sx={{ color: COLOR, p: 0, minWidth: 0, textDecoration: 'underline' }}
            onClick={() => window.open(v, '_blank', 'noopener,noreferrer')}>
            Ver PDF
          </Button>
        </Box>
      );
      return <Chip label="Pendiente" color="warning" size="small" variant="outlined" />;
    }

    if (v === undefined || v === null || v === '') return <em style={{ color: '#aaa' }}>—</em>;

    if (campo.tipo === 'boolean') return (v === 'true' || v === true) ? 'Sí' : 'No';

    if (campo.tipo === 'daterange') {
      try {
        const rng = JSON.parse(v);
        return `${fmtFechaCorta(rng.desde)} — ${fmtFechaCorta(rng.hasta)}`;
      } catch { return String(v); }
    }
    if (campo.tipo === 'talla' || campo.tipo === 'altura') return `${v} cm`;
    if (campo.tipo === 'edad')     return `${v} años`;
    if (campo.tipo === 'fecha_nac') return fmtFechaCorta(v);

    return String(v);
  };

  const fecha = new Date(inscripcion.fechaInscripcion).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}>
      <DialogTitle sx={{ bgcolor: COLOR, color: 'white', py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography fontWeight={700} component="div">Formulario de inscripción</Typography>
          <Typography variant="caption" sx={{ opacity: .85 }}>
            {inscripcion.nombreBeneficiario} · {inscripcion.nombrePrograma}
          </Typography>
        </Box>
        <Tooltip title="Generar PDF e imprimir">
          <span>
            <IconButton onClick={handleImprimir} disabled={generandoPdf || cargando} sx={{ color: 'white' }} size="small">
              {generandoPdf
                ? <CircularProgress size={18} sx={{ color: 'white' }} />
                : <PictureAsPdfIcon />}
            </IconButton>
          </span>
        </Tooltip>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {/* Resumen de la inscripción */}
        <Box sx={{ mb: 2.5, p: 1.5, bgcolor: '#f3f0ff', borderRadius: 2, border: '1px solid #d0c4f7' }}>
          <Grid container spacing={1}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">Programa</Typography>
              <Typography variant="body2" fontWeight={700} color={COLOR}>{inscripcion.nombrePrograma}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">Sede</Typography>
              <Typography variant="body2">{inscripcion.nombreSede}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">Fecha de inscripción</Typography>
              <Typography variant="body2">{fecha}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">Estado</Typography>
              <Box mt={0.3}>{chipEstado(inscripcion.estado)}</Box>
            </Grid>
          </Grid>
        </Box>

        {/* Datos personales del beneficiario */}
        {beneficiario && (
          <Box sx={{ mb: 2.5, p: 2, bgcolor: '#fdfbff', borderRadius: 2, border: '1px solid #e2d9f3' }}>
            <Box sx={{ borderLeft: `4px solid ${COLOR}`, pl: 1.5, mb: 1.5 }}>
              <Typography fontWeight={800} color={COLOR}
                sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Datos del Beneficiario
              </Typography>
            </Box>

            {/* Foto + nombre / documento / edad */}
            <Box sx={{ display: 'flex', gap: 2, mb: 1.5, alignItems: 'flex-start' }}>
              {beneficiario.fotoMenorUrl ? (
                <Box component="img" src={beneficiario.fotoMenorUrl} alt="Foto beneficiario"
                  sx={{ width: 72, height: 88, objectFit: 'contain', borderRadius: 1.5,
                        border: `2px solid ${COLOR}`, flexShrink: 0, bgcolor: '#f3f0ff' }} />
              ) : (
                <Avatar sx={{ bgcolor: COLOR, width: 72, height: 72, flexShrink: 0,
                              borderRadius: 1.5, fontSize: '1.5rem' }}>
                  {(beneficiario.nombreMenor || '?')[0].toUpperCase()}
                </Avatar>
              )}
              <Grid container spacing={0.8} sx={{ flex: 1 }}>
                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}
                    sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>
                    Nombre completo
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>{beneficiario.nombreMenor}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}
                    sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>
                    Documento
                  </Typography>
                  <Typography variant="body2">
                    {beneficiario.tipoDocumento} {beneficiario.numeroDocumento ?? '—'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}
                    sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>
                    Edad / Nacimiento
                  </Typography>
                  <Typography variant="body2">
                    {calcEdad(beneficiario.fechaNacimiento) != null
                      ? `${calcEdad(beneficiario.fechaNacimiento)} años`
                      : '—'}
                    {beneficiario.fechaNacimiento
                      ? ` · ${fmtFechaCorta(beneficiario.fechaNacimiento)}`
                      : ''}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Acudiente */}
            <Grid container spacing={0.8} sx={{ mb: 1 }}>
              <Grid size={{ xs: 12, sm: 5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}
                  sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>
                  Acudiente
                </Typography>
                <Typography variant="body2">{beneficiario.nombreAcudiente || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}
                  sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>
                  Parentesco
                </Typography>
                <Typography variant="body2">{beneficiario.parentesco || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}
                  sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>
                  WhatsApp / Teléfono
                </Typography>
                <Typography variant="body2">{beneficiario.whatsapp || '—'}</Typography>
              </Grid>
            </Grid>

            {/* Salud */}
            <Grid container spacing={0.8}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}
                  sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>
                  EPS / Aseguradora
                </Typography>
                <Typography variant="body2">{beneficiario.eps || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}
                  sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>
                  Alergia
                </Typography>
                <Typography variant="body2">
                  {beneficiario.tieneAlergia === 'si'
                    ? `Sí — ${beneficiario.descripcionAlergia || 'sin descripción'}`
                    : 'No'}
                </Typography>
              </Grid>
              {beneficiario.observacionesSalud && (
                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}
                    sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>
                    Observaciones de salud
                  </Typography>
                  <Typography variant="body2">{beneficiario.observacionesSalud}</Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {cargando ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress sx={{ color: COLOR }} />
          </Box>
        ) : editando ? (
          /* ── Modo edición ──────────────────────────────────────── */
          <Grid container spacing={2.5}>
            {agruparPorSeccion(campos).map(({ seccion: sec, campos: grp }) => (
              <Grid key={sec || '_root'} size={12} container spacing={2.5} sx={{ m: 0, p: 0 }}>
                <SeccionHeader titulo={sec} />
                {grp.map(c => (
                  <Grid key={c.id} size={(c.tipo === 'document' || c.tipo === 'daterange' || c.tipo === 'firma' || c.tipo === 'documento_id') ? 12 : { xs: 12, sm: c.columnas ?? 6 }}>
                    <CampoInput
                      campo={c}
                      value={datos[c.id]}
                      onChange={v => setDatos(prev => ({ ...prev, [c.id]: v }))}
                    />
                  </Grid>
                ))}
              </Grid>
            ))}
            <Grid size={12}>
              <TextField fullWidth size="small" label="Observaciones (opcional)"
                multiline rows={2} value={observaciones}
                onChange={e => setObservaciones(e.target.value)} />
            </Grid>
            {/* Firma del padre/acudiente — siempre obligatoria */}
            <Grid size={12}>
              <Box sx={{ p: 2, bgcolor: '#f3f0ff', borderRadius: 2, border: '2px solid #d0c4f7' }}>
                <Typography variant="caption" color={COLOR} fontWeight={800} display="block" mb={1}
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem' }}>
                  Autorización del padre / acudiente
                </Typography>
                <FirmaPad
                  label="Firma del padre / acudiente"
                  value={datos.__firma_padre__ ?? ''}
                  onChange={v => setDatos(prev => ({ ...prev, __firma_padre__: v }))}
                  obligatorio
                />
              </Box>
            </Grid>
          </Grid>
        ) : (
          /* ── Modo vista ────────────────────────────────────────── */
          <Box>
            {campos.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Este programa no tiene campos adicionales en el formulario.
              </Alert>
            ) : (
              <Box>
                {agruparPorSeccion(campos).map(({ seccion: sec, campos: grp }, gi) => (
                  <Box key={sec || '_root'} sx={{ mb: 2.5 }}>
                    {sec && (
                      <Box sx={{
                        borderLeft: `5px solid ${COLOR}`,
                        bgcolor: 'rgba(78,27,149,0.07)',
                        px: 1.5, py: 0.8,
                        borderRadius: '0 8px 8px 0',
                        mb: 1.2,
                      }}>
                        <Typography fontWeight={800} color={COLOR}
                          sx={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          {sec}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                      {grp.map((c) => (
                        <Box key={c.id} sx={{
                          bgcolor: '#fdfbff', borderRadius: 2,
                          border: '1px solid #ede7f6', px: 2, py: 1.1,
                        }}>
                          <Typography sx={{
                            fontSize: '0.68rem', fontWeight: 800, color: '#2d1566',
                            textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.35, display: 'block',
                          }}>
                            {c.etiqueta}{c.obligatorio ? ' *' : ''}
                          </Typography>
                          <Typography variant="body2" color="text.primary" sx={{ wordBreak: 'break-word', lineHeight: 1.5 }}>
                            {valorVista(c)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
            {/* Firma del padre/acudiente — siempre visible */}
            <Box sx={{ mt: 1, p: 2, bgcolor: '#f3f0ff', borderRadius: 2, border: '2px solid #d0c4f7' }}>
              <Typography variant="caption" color={COLOR} fontWeight={800} display="block" mb={1}
                sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem' }}>
                Autorización del padre / acudiente
              </Typography>
              {datos.__firma_padre__ ? (
                <Box component="img" src={datos.__firma_padre__} alt="Firma del padre"
                  sx={{ display: 'block', height: 60, maxWidth: 280, objectFit: 'contain',
                        border: '1px solid #d0c4f7', borderRadius: 1, bgcolor: 'white' }} />
              ) : (
                <Chip label="Sin firma registrada" color="warning" size="small" variant="outlined" />
              )}
            </Box>

            {observaciones && (
              <Box sx={{
                borderLeft: `5px solid ${COLOR}`,
                bgcolor: 'rgba(78,27,149,0.07)',
                borderRadius: '0 8px 8px 0',
                px: 1.5, py: 1, mt: 1,
              }}>
                <Typography fontWeight={800} color={COLOR}
                  sx={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5, display: 'block' }}>
                  Observaciones
                </Typography>
                <Typography variant="body2" color="text.primary">{observaciones}</Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onCerrar} disabled={guardando}>Cerrar</Button>
        <Box flex={1} />
        {editando ? (
          <>
            <Button onClick={() => { setEditando(false); setError(''); }} disabled={guardando}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={handleGuardar}
              disabled={guardando} sx={{ bgcolor: COLOR }}>
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </>
        ) : (
          <Button variant="outlined" startIcon={<EditIcon />}
            onClick={() => setEditando(true)}
            sx={{ color: COLOR, borderColor: COLOR }}>
            Editar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Stepper de nueva inscripción ──────────────────────────────────────────────

function NuevaInscripcionDialog({ onCerrar, onCreada }) {
  const [paso,            setPaso]            = useState(0);
  const [beneficiarios,   setBeneficiarios]   = useState([]);
  const [buscando,        setBuscando]        = useState(false);
  const [busqueda,        setBusqueda]        = useState('');
  const [selBenef,        setSelBenef]        = useState(null);
  const [programas,       setProgramas]       = useState([]);
  const [selPrograma,     setSelPrograma]     = useState(null);
  const [campos,          setCampos]          = useState([]);
  const [cargandoCampos,  setCargandoCampos]  = useState(false);
  const [datos,           setDatos]           = useState({});
  const [observaciones,   setObservaciones]   = useState('');
  const [guardando,       setGuardando]       = useState(false);
  const [error,           setError]           = useState('');
  const theme   = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Búsqueda diferida de beneficiarios mientras el usuario escribe (se dispara 300 ms tras el último tecleo)
  useEffect(() => {
    if (busqueda.length < 2) { setBeneficiarios([]); return; }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const { data } = await beneficiariosRepository.listar({ buscar: busqueda, porPagina: 20, pagina: 1, estado: 'activos' });
        setBeneficiarios(data.data ?? []);
      } catch { setBeneficiarios([]); }
      finally { setBuscando(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  // Carga todos los programas activos de todas las sedes al montar, para el paso de selección de programa
  useEffect(() => {
    sedesRepository.listar({ soloActivas: true }).then(({ data }) => {
      const progs = data.flatMap(s =>
        (s.programas ?? []).filter(p => p.activo).map(p => ({ ...p, nombreSede: s.nombre }))
      );
      setProgramas(progs);
    }).catch(() => {});
  }, []);

  // Carga los campos del programa elegido; auto-rellena edad y fecha de nacimiento del beneficiario
  useEffect(() => {
    if (!selPrograma) { setCampos([]); return; }
    setCargandoCampos(true);
    sedesRepository.listarCampos(selPrograma.id).then(({ data }) => {
      setCampos(data);
      // Auto-rellenar campos que se derivan del beneficiario seleccionado
      const auto = {};
      for (const c of data) {
        if (c.tipo === 'edad' && selBenef?.fechaNacimiento) {
          const e = calcEdad(selBenef.fechaNacimiento);
          if (e !== null) auto[c.id] = String(e);
        }
        if (c.tipo === 'fecha_nac' && selBenef?.fechaNacimiento)
          auto[c.id] = selBenef.fechaNacimiento;
      }
      setDatos(auto);
    }).catch(() => {}).finally(() => setCargandoCampos(false));
  }, [selPrograma, selBenef]);

  // Retorna verdadero cuando el paso actual del asistente tiene todos los datos obligatorios completos
  const pasoValido = () => {
    if (paso === 0) return !!selBenef;
    if (paso === 1) return !!selPrograma;
    if (paso === 2) {
      if (!datos.__firma_padre__) return false;
      return campos.every(c => {
        if (!c.obligatorio) return true;
        const v = datos[c.id];
        if (!v) return false;
        if (c.tipo === 'daterange') {
          try { const r = JSON.parse(v); return !!(r.desde && r.hasta); } catch { return false; }
        }
        if (c.tipo === 'documento_id') {
          try { const d = JSON.parse(v); return !!(d.tipo && d.numero); } catch { return false; }
        }
        return true;
      });
    }
    return true;
  };

  // Envía la inscripción completa (beneficiario + programa + datos del formulario) al backend
  const handleSubmit = async () => {
    setGuardando(true);
    setError('');
    try {
      const result = await inscripcionesRepository.crear({
        beneficiarioId: selBenef.id,
        programaId:     selPrograma.id,
        datos:          JSON.stringify(datos),
        observaciones:  observaciones.trim() || null,
      });
      onCreada(result.data);
    } catch {
      setError('No se pudo guardar la inscripción.');
    } finally {
      setGuardando(false);
    }
  };

  const PASOS = ['Beneficiario', 'Programa', 'Formulario'];

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}>
      <DialogTitle sx={{ bgcolor: COLOR, color: 'white', fontWeight: 700 }}>
        Nueva Inscripción
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        <Stepper activeStep={paso} sx={{ mb: 3 }}>
          {PASOS.map(label => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {paso === 0 && (
          <Box>
            <Typography fontWeight={700} mb={2}>Busca el beneficiario</Typography>
            <Autocomplete
              options={beneficiarios}
              loading={buscando}
              loadingText="Buscando..."
              value={selBenef}
              onChange={(_, v) => setSelBenef(v)}
              inputValue={busqueda}
              onInputChange={(_, v) => setBusqueda(v)}
              getOptionLabel={o => o.nombreMenor ?? o.nombre ?? ''}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              noOptionsText={busqueda.length < 2 ? 'Escribe al menos 2 caracteres' : 'Sin resultados'}
              renderOption={(props, o) => (
                <li {...props} key={o.id}>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>{o.nombreMenor ?? o.nombre}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {o.tipoDocumento} {o.numeroDocumento ?? 'Sin documento'}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField {...params} label="Buscar por nombre" size="small" />
              )}
            />
            {selBenef && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f3f0ff', borderRadius: 2, border: '1px solid #d0c4f7' }}>
                <Typography fontWeight={700}>{selBenef.nombreMenor ?? selBenef.nombre}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {selBenef.tipoDocumento} · {selBenef.numeroDocumento ?? 'Sin documento'}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {paso === 1 && (
          <Box>
            <Typography fontWeight={700} mb={2}>Selecciona el programa</Typography>
            {programas.length === 0 ? (
              <Alert severity="warning">No hay programas activos disponibles.</Alert>
            ) : (
              <Grid container spacing={1.5}>
                {programas.map(p => (
                  <Grid key={p.id} size={{ xs: 12, sm: 6 }}>
                    <Box onClick={() => setSelPrograma(p)} sx={{
                      border: `2px solid ${selPrograma?.id === p.id ? COLOR : '#e2d9f3'}`,
                      borderRadius: 2, p: 1.5, cursor: 'pointer',
                      bgcolor: selPrograma?.id === p.id ? '#f3f0ff' : '#fdfbff',
                      transition: 'all 0.15s',
                      '&:hover': { borderColor: COLOR, bgcolor: '#f3f0ff' },
                    }}>
                      <Typography fontWeight={700} color={COLOR}>{p.nombre}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.nombreSede}</Typography>
                      {selPrograma?.id === p.id && (
                        <CheckIcon sx={{ float: 'right', color: COLOR, fontSize: 20 }} />
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {paso === 2 && (
          <Box>
            <Typography fontWeight={700} mb={2}>
              Completa el formulario de {selPrograma?.nombre}
            </Typography>
            {cargandoCampos ? (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress sx={{ color: COLOR }} />
              </Box>
            ) : campos.length === 0 ? (
              <Alert severity="info">
                Este programa no tiene campos adicionales. Puedes inscribir directamente.
              </Alert>
            ) : (
              <Grid container spacing={2.5}>
                {agruparPorSeccion(campos).map(({ seccion: sec, campos: grp }) => (
                  <Grid key={sec || '_root'} size={12} container spacing={2.5} sx={{ m: 0, p: 0 }}>
                    <SeccionHeader titulo={sec} />
                    {grp.map(c => (
                      <Grid key={c.id} size={(c.tipo === 'document' || c.tipo === 'daterange' || c.tipo === 'firma' || c.tipo === 'documento_id') ? 12 : { xs: 12, sm: 6 }}>
                        <CampoInput
                          campo={c}
                          value={datos[c.id]}
                          onChange={v => setDatos(prev => ({ ...prev, [c.id]: v }))}
                        />
                      </Grid>
                    ))}
                  </Grid>
                ))}
                <Grid size={12}>
                  <TextField fullWidth size="small" label="Observaciones (opcional)"
                    multiline rows={2} value={observaciones}
                    onChange={e => setObservaciones(e.target.value)} />
                </Grid>
              </Grid>
            )}
            {/* Firma del padre/acudiente — siempre obligatoria */}
            <Box sx={{ mt: campos.length === 0 ? 0 : 1, p: 2, bgcolor: '#f3f0ff', borderRadius: 2, border: '2px solid #d0c4f7' }}>
              <Typography variant="caption" color={COLOR} fontWeight={800} display="block" mb={1}
                sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem' }}>
                Autorización del padre / acudiente
              </Typography>
              <FirmaPad
                label="Firma del padre / acudiente"
                value={datos.__firma_padre__ ?? ''}
                onChange={v => setDatos(prev => ({ ...prev, __firma_padre__: v }))}
                obligatorio
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onCerrar} disabled={guardando}>Cancelar</Button>
        {paso > 0 && (
          <Button onClick={() => setPaso(p => p - 1)} disabled={guardando}>Atrás</Button>
        )}
        <Box flex={1} />
        {paso < 2 ? (
          <Button variant="contained" onClick={() => setPaso(p => p + 1)}
            disabled={!pasoValido()} sx={{ bgcolor: COLOR }}>
            Siguiente
          </Button>
        ) : (
          <Button variant="contained" onClick={handleSubmit}
            disabled={guardando || !pasoValido()} sx={{ bgcolor: COLOR }}>
            {guardando ? 'Guardando...' : 'Inscribir'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function InscripcionesPage() {
  const { inscripciones, cargando, error, cargar, actualizar, cambiarEstado, eliminar } = useInscripciones();

  const [filtroProg,    setFiltroProg]    = useState('');
  const [filtroEstado,  setFiltroEstado]  = useState('');
  const [filtroBuscar,  setFiltroBuscar]  = useState('');
  const [programas,     setProgramas]     = useState([]);
  const [nuevaAbierta,  setNuevaAbierta]  = useState(false);
  const [verInscripcion, setVerInscripcion] = useState(null);
  const [cambiandoId,   setCambiandoId]   = useState(null);
  const [toast,         setToast]         = useState('');

  // Carga todos los programas al montar para poblar el selector de filtro "Programa"
  useEffect(() => {
    sedesRepository.listar().then(({ data }) => {
      setProgramas(data.flatMap(s =>
        (s.programas ?? []).map(p => ({ ...p, nombreSede: s.nombre }))
      ));
    }).catch(() => {});
  }, []);

  // Recarga el listado de inscripciones aplicando los filtros actuales de programa y estado
  const recargar = useCallback(() => {
    cargar({ programaId: filtroProg || undefined, estado: filtroEstado || undefined });
  }, [cargar, filtroProg, filtroEstado]);

  // Vuelve a obtener inscripciones cada vez que cambia el filtro de programa o estado
  useEffect(() => { recargar(); }, [recargar]);

  // Filtro en cliente por nombre o número de documento del beneficiario (sobre el filtro del servidor)
  const filtradas = inscripciones.filter(i => {
    if (filtroBuscar) {
      const q = filtroBuscar.toLowerCase();
      if (!i.nombreBeneficiario?.toLowerCase().includes(q) &&
          !i.documentoBeneficiario?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Actualiza el estado de una inscripción en la API y muestra un mensaje de confirmación
  const handleCambiarEstado = async (id, estado) => {
    setCambiandoId(id);
    try {
      await cambiarEstado(id, estado);
      setToast('Estado actualizado');
    } catch { setToast('Error al cambiar estado'); }
    finally  { setCambiandoId(null); }
  };

  // Elimina una inscripción en la API y muestra un mensaje de confirmación
  const handleEliminar = async (id) => {
    try {
      await eliminar(id);
      setToast('Inscripción eliminada');
    } catch { setToast('Error al eliminar'); }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>

      {/* ── Cabecera ─────────────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 2, mb: 4,
      }}>
        <Box>
          <Typography sx={{
            fontSize: '0.68rem', color: 'text.secondary',
            textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.5,
          }}>
            Módulo
          </Typography>
          <Typography variant="h5" fontWeight={800} color={COLOR}>Inscripciones</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => setNuevaAbierta(true)}
          sx={{ bgcolor: COLOR, flexShrink: 0, px: 2.5 }}>
          Nueva inscripción
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* ── Barra de filtros ─────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center',
        bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
        borderRadius: 2, p: 2, mb: 3,
      }}>
        <TextField size="small" label="Buscar beneficiario" sx={{ minWidth: 200, flex: 1 }}
          value={filtroBuscar} onChange={e => setFiltroBuscar(e.target.value)} />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Programa</InputLabel>
          <Select label="Programa" value={filtroProg}
            onChange={e => setFiltroProg(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Estado</InputLabel>
          <Select label="Estado" value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {ESTADOS.map(e => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {cargando ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress sx={{ color: COLOR }} />
        </Box>
      ) : filtradas.length === 0 ? (
        <Alert severity="info">No hay inscripciones que coincidan con los filtros.</Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtradas.map(i => (
            <Box key={i.id} sx={{
              border: '1.5px solid #e2d9f3', borderRadius: 2, p: 2.5, bgcolor: '#fdfbff',
              display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.5, sm: 2 }, alignItems: { xs: 'stretch', sm: 'flex-start' },
            }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                <Avatar sx={{ bgcolor: COLOR, width: 44, height: 44, flexShrink: 0 }}>
                  {(i.nombreBeneficiario || '?')[0].toUpperCase()}
                </Avatar>
                <Box flex={1} minWidth={0}>
                  <Typography fontWeight={800} noWrap>{i.nombreBeneficiario}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {i.documentoBeneficiario ?? 'Sin documento'}
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mt={1} alignItems="center">
                    <Chip label={i.nombrePrograma} size="small"
                      sx={{ bgcolor: '#ede7f6', color: COLOR, fontWeight: 600 }} />
                    <Typography variant="caption" color="text.secondary">{i.nombreSede}</Typography>
                    {chipEstado(i.estado)}
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.8}>
                    {new Date(i.fechaInscripcion).toLocaleDateString('es-CO')}
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" flexDirection={{ xs: 'row', sm: 'column' }} gap={1}
                alignItems="center" justifyContent={{ xs: 'flex-end', sm: 'flex-start' }}
                sx={{ flexShrink: 0 }}>
                <FormControl size="small" sx={{ minWidth: { xs: 'auto', sm: 130 }, flex: { xs: 1, sm: 'none' } }}>
                  <Select value={i.estado} size="small"
                    disabled={cambiandoId === i.id}
                    onChange={e => handleCambiarEstado(i.id, e.target.value)}>
                    {ESTADOS.map(e => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <Box display="flex" gap={0.5}>
                  <Tooltip title="Ver / Editar formulario">
                    <IconButton size="small" onClick={() => setVerInscripcion(i)}>
                      <VisibilityIcon fontSize="small" sx={{ color: COLOR }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar inscripción">
                    <IconButton size="small" onClick={() => handleEliminar(i.id)}>
                      <DeleteIcon fontSize="small" color="error" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {nuevaAbierta && (
        <NuevaInscripcionDialog
          onCerrar={() => setNuevaAbierta(false)}
          onCreada={(ins) => {
            setNuevaAbierta(false);
            setToast(`${ins.nombreBeneficiario} inscrito en ${ins.nombrePrograma}`);
            recargar();
          }}
        />
      )}

      {verInscripcion && (
        <VerFormularioDialog
          inscripcion={verInscripcion}
          onCerrar={() => setVerInscripcion(null)}
          onActualizada={(updated) => {
            actualizar(verInscripcion.id, { datos: updated.datos, observaciones: updated.observaciones });
            setVerInscripcion(updated);
            setToast('Formulario actualizado');
          }}
        />
      )}

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}

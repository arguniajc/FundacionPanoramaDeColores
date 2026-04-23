import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Autocomplete, Avatar, Box, Button, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, Grid, IconButton, InputLabel,
  MenuItem, Select, Snackbar, Step, StepLabel, Stepper, Switch,
  TextField, Tooltip, Typography,
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

const COLOR = '#4E1B95';

// Agrupa campos consecutivos con la misma sección
function agruparPorSeccion(campos) {
  const result = [];
  for (const c of campos) {
    const sec  = c.seccion?.trim() || '';
    const last = result[result.length - 1];
    if (!last || last.seccion !== sec) result.push({ seccion: sec, campos: [c] });
    else last.campos.push(c);
  }
  return result;
}

function SeccionHeader({ titulo }) {
  if (!titulo) return null;
  return (
    <Grid size={12}>
      <Box display="flex" alignItems="center" gap={1} mt={1} mb={0.5}>
        <Typography variant="caption" fontWeight={800} color={COLOR}
          sx={{ textTransform: 'uppercase', letterSpacing: 0.9,
                bgcolor: '#ede7f6', px: 1.5, py: 0.4, borderRadius: 1, flexShrink: 0 }}>
          {titulo}
        </Typography>
        <Box flex={1} sx={{ height: '1.5px', bgcolor: '#d0c4f7' }} />
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
            <Chip label="PDF cargado" color="success" size="small" />
            <Button size="small" onClick={() => window.open(value, '_blank', 'noopener,noreferrer')}>Ver</Button>
            <Button size="small" color="error" onClick={() => onChange('')}>Quitar</Button>
          </Box>
        ) : (
          <Button variant="outlined" component="label" size="small" disabled={subiendo}
            sx={{ color: COLOR, borderColor: COLOR }}>
            {subiendo ? 'Subiendo...' : 'Seleccionar PDF'}
            <input type="file" hidden accept="application/pdf" onChange={handleFile} />
          </Button>
        )}
      </Box>
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

  useEffect(() => {
    setCargando(true);
    setEditando(false);
    setError('');
    try { setDatos(JSON.parse(inscripcion.datos || '{}')); } catch { setDatos({}); }
    setObservaciones(inscripcion.observaciones ?? '');
    sedesRepository.listarCampos(inscripcion.programaId)
      .then(({ data }) => setCampos(data))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [inscripcion.id]);

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

  const handleImprimir = async () => {
    setGenerandoPdf(true);
    try {
      const { data: benef } = await beneficiariosRepository.obtener(inscripcion.beneficiarioId);
      const doc = generarPdfInscripcion({
        inscripcion,
        beneficiario: benef,
        campos,
        datos,
        observaciones,
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

  const valorVista = (campo) => {
    const v = datos[campo.id];
    if (v === undefined || v === null || v === '') return <em style={{ color: '#aaa' }}>—</em>;
    if (campo.tipo === 'boolean') return (v === 'true' || v === true) ? 'Sí' : 'No';
    if (campo.tipo === 'document') return (
      <Button size="small" sx={{ color: COLOR, p: 0, minWidth: 0, textDecoration: 'underline' }}
        onClick={() => window.open(v, '_blank', 'noopener,noreferrer')}>
        Ver PDF
      </Button>
    );
    return String(v);
  };

  const fecha = new Date(inscripcion.fechaInscripcion).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
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

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {cargando ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress sx={{ color: COLOR }} />
          </Box>
        ) : editando ? (
          /* ── Modo edición ──────────────────────────────────────── */
          <Grid container spacing={2}>
            {agruparPorSeccion(campos).map(({ seccion: sec, campos: grp }) => (
              <Grid key={sec || '_root'} size={12} container spacing={2} sx={{ m: 0, p: 0 }}>
                <SeccionHeader titulo={sec} />
                {grp.map(c => (
                  <Grid key={c.id} size={c.tipo === 'document' ? 12 : { xs: 12, sm: 6 }}>
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
        ) : (
          /* ── Modo vista ────────────────────────────────────────── */
          <Box>
            {campos.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Este programa no tiene campos adicionales en el formulario.
              </Alert>
            ) : (
              <Box mb={2}>
                {agruparPorSeccion(campos).map(({ seccion: sec, campos: grp }, gi) => (
                  <Box key={sec || '_root'}>
                    {sec && (
                      <Box display="flex" alignItems="center" gap={1} mt={gi > 0 ? 2 : 0} mb={0.5}>
                        <Typography variant="caption" fontWeight={800} color={COLOR}
                          sx={{ textTransform: 'uppercase', letterSpacing: 0.8,
                                bgcolor: '#ede7f6', px: 1.5, py: 0.3, borderRadius: 1, flexShrink: 0 }}>
                          {sec}
                        </Typography>
                        <Box flex={1} sx={{ height: '1px', bgcolor: '#d0c4f7' }} />
                      </Box>
                    )}
                    <Box sx={{ border: '1px solid #e2d9f3', borderRadius: 2, overflow: 'hidden' }}>
                      {grp.map((c, idx) => (
                        <Box key={c.id} sx={{
                          display: 'flex', gap: 2, p: '8px 14px',
                          bgcolor: idx % 2 === 0 ? '#fdfbff' : '#f8f5ff',
                          borderBottom: idx < grp.length - 1 ? '1px solid #ede7f6' : 'none',
                        }}>
                          <Typography variant="body2" fontWeight={700} color={COLOR}
                            sx={{ minWidth: 140, flexShrink: 0 }}>
                            {c.etiqueta}{c.obligatorio ? ' *' : ''}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                            {valorVista(c)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
            {observaciones && (
              <Box sx={{ p: 1.5, bgcolor: '#f3f0ff', borderRadius: 2, border: '1px solid #d0c4f7' }}>
                <Typography variant="caption" fontWeight={700} color={COLOR} display="block">Observaciones</Typography>
                <Typography variant="body2" mt={0.3}>{observaciones}</Typography>
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

  useEffect(() => {
    sedesRepository.listar({ soloActivas: true }).then(({ data }) => {
      const progs = data.flatMap(s =>
        (s.programas ?? []).filter(p => p.activo).map(p => ({ ...p, nombreSede: s.nombre }))
      );
      setProgramas(progs);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selPrograma) { setCampos([]); return; }
    setCargandoCampos(true);
    sedesRepository.listarCampos(selPrograma.id).then(({ data }) => {
      setCampos(data);
      setDatos({});
    }).catch(() => {}).finally(() => setCargandoCampos(false));
  }, [selPrograma]);

  const pasoValido = () => {
    if (paso === 0) return !!selBenef;
    if (paso === 1) return !!selPrograma;
    if (paso === 2) return campos.every(c => !c.obligatorio || !!datos[c.id]);
    return true;
  };

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
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
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
              <Grid container spacing={2}>
                {agruparPorSeccion(campos).map(({ seccion: sec, campos: grp }) => (
                  <Grid key={sec || '_root'} size={12} container spacing={2} sx={{ m: 0, p: 0 }}>
                    <SeccionHeader titulo={sec} />
                    {grp.map(c => (
                      <Grid key={c.id} size={c.tipo === 'document' ? 12 : { xs: 12, sm: 6 }}>
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

  useEffect(() => {
    sedesRepository.listar().then(({ data }) => {
      setProgramas(data.flatMap(s =>
        (s.programas ?? []).map(p => ({ ...p, nombreSede: s.nombre }))
      ));
    }).catch(() => {});
  }, []);

  const recargar = useCallback(() => {
    cargar({ programaId: filtroProg || undefined, estado: filtroEstado || undefined });
  }, [cargar, filtroProg, filtroEstado]);

  useEffect(() => { recargar(); }, [recargar]);

  const filtradas = inscripciones.filter(i => {
    if (filtroBuscar) {
      const q = filtroBuscar.toLowerCase();
      if (!i.nombreBeneficiario?.toLowerCase().includes(q) &&
          !i.documentoBeneficiario?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleCambiarEstado = async (id, estado) => {
    setCambiandoId(id);
    try {
      await cambiarEstado(id, estado);
      setToast('Estado actualizado');
    } catch { setToast('Error al cambiar estado'); }
    finally  { setCambiandoId(null); }
  };

  const handleEliminar = async (id) => {
    try {
      await eliminar(id);
      setToast('Inscripción eliminada');
    } catch { setToast('Error al eliminar'); }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5" fontWeight={800} color={COLOR}>Inscripciones</Typography>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => setNuevaAbierta(true)} sx={{ bgcolor: COLOR }}>
          Nueva inscripción
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
        <TextField size="small" label="Buscar beneficiario" sx={{ minWidth: 200 }}
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filtradas.map(i => (
            <Box key={i.id} sx={{
              border: '1.5px solid #e2d9f3', borderRadius: 2, p: 2,
              bgcolor: '#fdfbff', display: 'flex', gap: 1.5, alignItems: 'flex-start',
            }}>
              <Avatar sx={{ bgcolor: COLOR, width: 40, height: 40, flexShrink: 0 }}>
                {(i.nombreBeneficiario || '?')[0].toUpperCase()}
              </Avatar>
              <Box flex={1} minWidth={0}>
                <Typography fontWeight={800} noWrap>{i.nombreBeneficiario}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {i.documentoBeneficiario ?? 'Sin documento'}
                </Typography>
                <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5} alignItems="center">
                  <Chip label={i.nombrePrograma} size="small"
                    sx={{ bgcolor: '#ede7f6', color: COLOR, fontWeight: 600 }} />
                  <Typography variant="caption" color="text.secondary">{i.nombreSede}</Typography>
                  {chipEstado(i.estado)}
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mt={0.3}>
                  {new Date(i.fechaInscripcion).toLocaleDateString('es-CO')}
                </Typography>
              </Box>
              <Box display="flex" flexDirection="column" gap={0.5} alignItems="flex-end">
                <FormControl size="small" sx={{ minWidth: 130 }}>
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

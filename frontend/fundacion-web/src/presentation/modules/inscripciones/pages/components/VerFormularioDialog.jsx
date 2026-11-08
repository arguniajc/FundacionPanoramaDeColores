// Diálogo de vista y edición del formulario dinámico de una inscripción.
// En edición: Enter guarda, cerrar o cancelar con cambios pide confirmación y mientras guarda no se cierra.
import { useState, useEffect, useMemo } from 'react';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress,
  DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, TextField, Tooltip, Typography,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import { AccionesDialogo, ErrorServidor } from '@/shared/components/form/FormControles';
import { useCerrarConCambios, hayCambiosEn } from '@/shared/hooks/useCerrarConCambios';
import { alpha }          from '@mui/material/styles';
import EditIcon           from '@mui/icons-material/Edit';
import GavelIcon          from '@mui/icons-material/Gavel';
import PictureAsPdfIcon   from '@mui/icons-material/PictureAsPdf';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';
import { beneficiariosRepository } from '@/infrastructure/repositories/beneficiariosRepository';
import { generarPdfInscripcion }   from '@/shared/utils/generarPdfInscripcion';
import { sedesRepository }         from '@/infrastructure/repositories/sedesRepository';
import { inscripcionesRepository } from '@/infrastructure/repositories/inscripcionesRepository';
import { mensajeErrorApi }         from '@/shared/utils/mensajeErrorApi';
import ResumenErrores              from '@/shared/components/ResumenErrores';
import { CampoInput, FirmaAutorizacion, SeccionHeader } from './campos';
import { COLOR, ESTADOS, agruparPorSeccion, calcEdad, fmtFechaCorta } from './camposUtils';
import { erroresCamposDinamicos } from './validacionFormulario';
import { abrirArchivo, useArchivoUrl } from '@/shared/utils/archivos';

function chipEstado(estado) {
  const e = ESTADOS.find(x => x.value === estado) ?? { label: estado, color: 'default' };
  return <Chip label={e.label} size="small" color={e.color} />;
}

export function VerFormularioDialog({ inscripcion, onCerrar, onActualizada }) {
  const [campos,        setCampos]        = useState([]);
  const [cargando,      setCargando]      = useState(true);
  const [editando,      setEditando]      = useState(false);
  const [datos,         setDatos]         = useState({});
  const [panelActivo,   setPanelActivo]   = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [guardando,     setGuardando]     = useState(false);
  const [generandoPdf,  setGenerandoPdf]  = useState(false);
  const [error,         setError]         = useState('');        // error al guardar
  const [aviso,         setAviso]         = useState({ mensaje: '', titulo: '' }); // error al cargar o generar el PDF
  const [beneficiario,  setBeneficiario]  = useState(null);
  const fotoBeneficiario = useArchivoUrl(beneficiario?.fotoMenorUrl);
  const [programa,      setPrograma]      = useState(null);
  const [intentado,     setIntentado]     = useState(false); // ya se intentó guardar: mostrar errores en los campos
  const [verResumen,    setVerResumen]    = useState(false);

  // Datos guardados en el servidor: base para saber si hay cambios sin guardar
  const datosGuardados = useMemo(() => {
    try { return JSON.parse(inscripcion.datos || '{}'); } catch { return {}; }
  }, [inscripcion.datos]);
  const hayCambios = editando && (
    hayCambiosEn(datos, datosGuardados) || hayCambiosEn(observaciones, inscripcion.observaciones ?? ''));

  const tienePadreMadre = campos.some(c => c.tipo === 'datos_padre') && campos.some(c => c.tipo === 'datos_madre');

  useEffect(() => {
    setCargando(true);
    setEditando(false);
    setError('');
    setAviso({ mensaje: '', titulo: '' });
    setBeneficiario(null);
    setPrograma(null);
    try { setDatos(JSON.parse(inscripcion.datos || '{}')); } catch { setDatos({}); }
    setObservaciones(inscripcion.observaciones ?? '');
    Promise.all([
      sedesRepository.listarCampos(inscripcion.programaId),
      beneficiariosRepository.obtener(inscripcion.beneficiarioId),
      sedesRepository.obtenerPrograma(inscripcion.programaId),
    ])
      .then(([camposRes, benefRes, progRes]) => {
        setCampos(camposRes.data);
        setBeneficiario(benefRes.data);
        setPrograma(progRes.data);
        let datosActuales = {};
        try { datosActuales = JSON.parse(inscripcion.datos || '{}'); } catch { /* datos ilegibles: se usan paneles por defecto */ }
        const padresMadreIds = camposRes.data
          .filter(c => c.tipo === 'datos_padre' || c.tipo === 'datos_madre')
          .map(c => c.id);
        const alguienTieneDatos = padresMadreIds.some(id => !!datosActuales[id]);
        const initPanel = {};
        for (const c of camposRes.data) {
          if (c.tipo === 'datos_padre' || c.tipo === 'datos_madre')
            initPanel[c.id] = alguienTieneDatos ? !!datosActuales[c.id] : true;
          if (c.tipo === 'datos_tutor')
            initPanel[c.id] = !!datosActuales[c.id];
        }
        setPanelActivo(initPanel);
      })
      .catch(err => setAviso({ mensaje: mensajeErrorApi(err, { accion: 'cargar el formulario de la inscripción' }), titulo: 'No se pudo cargar' }))
      .finally(() => setCargando(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- se recarga solo al cambiar de inscripción, no cuando el padre pasa otro objeto con el mismo id
  }, [inscripcion.id]);

  // Errores de los campos del programa (obligatorios y formato), con el mismo criterio que al inscribir
  const errores    = editando ? erroresCamposDinamicos(campos, datos, panelActivo) : {};
  const hayErrores = Object.keys(errores).length > 0;
  const errCampo   = id => (intentado ? (errores[id] ?? '') : '');

  const cerrarEdicion = () => { setEditando(false); setError(''); setIntentado(false); setVerResumen(false); };
  // Cancelar descarta lo editado y vuelve a los datos guardados
  const cancelarEdicion = () => {
    try { setDatos(JSON.parse(inscripcion.datos || '{}')); } catch { setDatos({}); }
    setObservaciones(inscripcion.observaciones ?? '');
    cerrarEdicion();
  };

  // Cerrar el diálogo y cancelar la edición preguntan antes de descartar cambios
  const { confirmarCierre } = useCerrarConCambios({ hayCambios, bloqueado: guardando, onCerrar });
  const { confirmarCierre: confirmarCancelarEdicion } = useCerrarConCambios({
    hayCambios, bloqueado: guardando, onCerrar: cancelarEdicion,
  });

  const handleGuardar = async () => {
    if (guardando) return;
    if (hayErrores) { setIntentado(true); setVerResumen(true); return; }
    setGuardando(true);
    setError('');
    try {
      const result = await inscripcionesRepository.actualizar(inscripcion.id, {
        datos: JSON.stringify(datos),
        observaciones: observaciones.trim() || null,
      });
      onActualizada(result.data); // la página muestra "Formulario actualizado"
      cerrarEdicion();
    } catch (err) {
      setError(mensajeErrorApi(err, { accion: 'guardar los cambios de la inscripción' }));
    } finally {
      setGuardando(false);
    }
  };

  const handleTogglePanelEdit = (campo) => {
    const nuevoActivo = !panelActivo[campo.id];
    const next = { ...panelActivo, [campo.id]: nuevoActivo };
    if (!nuevoActivo) {
      setDatos(prev => { const n = { ...prev }; delete n[campo.id]; return n; });
      const padresMadre = campos.filter(c => c.tipo === 'datos_padre' || c.tipo === 'datos_madre');
      const todosApagados = padresMadre.every(c => (c.id === campo.id ? true : !next[c.id]));
      if (todosApagados) campos.filter(c => c.tipo === 'datos_tutor').forEach(c => { next[c.id] = true; });
    } else {
      campos.filter(c => c.tipo === 'datos_tutor').forEach(c => {
        next[c.id] = false;
        setDatos(prev => { const n = { ...prev }; delete n[c.id]; return n; });
      });
    }
    setPanelActivo(next);
  };

  const handleImprimir = async () => {
    setGenerandoPdf(true);
    try {
      const benef = beneficiario ?? (await beneficiariosRepository.obtener(inscripcion.beneficiarioId)).data;
      const prog  = programa     ?? (await sedesRepository.obtenerPrograma(inscripcion.programaId)).data;
      const doc = await generarPdfInscripcion({
        inscripcion, beneficiario: benef, campos, datos, observaciones,
        conTercero: prog.tieneTercero ?? false,
        nombreTercero: prog.nombreTercero ?? '',
        programa: prog,
      });
      const blob   = doc.output('blob');
      const url    = URL.createObjectURL(blob);
      const nombre = `inscripcion_${(inscripcion.nombreBeneficiario ?? 'beneficiario').replace(/\s+/g, '_')}.pdf`;
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        const a = document.createElement('a');
        a.href = url; a.download = nombre; a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      setAviso({
        mensaje: err?.isAxiosError
          ? mensajeErrorApi(err, { accion: 'generar el PDF de la inscripción' })
          : 'Ocurrió un error al armar el documento. Intenta de nuevo.',
        titulo: 'No se pudo generar el PDF',
      });
    } finally {
      setGenerandoPdf(false);
    }
  };

  const valorVista = (campo) => {
    const v = datos[campo.id];

    if (campo.tipo === 'firma') {
      if (v) return (
        <Box component="img" src={v} alt="Firma"
          sx={{ display: 'block', height: 56, maxWidth: 240, objectFit: 'contain',
                border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'white' }} />
      );
      return <Chip label="Sin firma" color="warning" size="small" variant="outlined" />;
    }
    if (campo.tipo === 'documento_id') {
      if (!v) return <Box component="em" sx={{ color: 'text.disabled' }}>—</Box>;
      try { const doc = JSON.parse(v); return `${doc.tipo || '—'} · ${doc.numero || '—'}`; } catch { return String(v); }
    }
    if (campo.tipo === 'document') {
      if (v) return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="✓ Entregado" color="success" size="small" />
          <Button size="small" sx={{ color: COLOR, p: 0, minWidth: 0, textDecoration: 'underline' }}
            onClick={() => abrirArchivo(v)}>Ver PDF</Button>
        </Box>
      );
      return <Chip label="Pendiente" color="warning" size="small" variant="outlined" />;
    }
    if (v === undefined || v === null || v === '') return <Box component="em" sx={{ color: 'text.disabled' }}>—</Box>;
    if (campo.tipo === 'boolean') return (v === 'true' || v === true) ? 'Sí' : 'No';
    if (campo.tipo === 'daterange') {
      try { const rng = JSON.parse(v); return `${fmtFechaCorta(rng.desde)} — ${fmtFechaCorta(rng.hasta)}`; } catch { return String(v); }
    }
    if (campo.tipo === 'talla' || campo.tipo === 'altura') return `${v} cm`;
    if (campo.tipo === 'edad')     return `${v} años`;
    if (campo.tipo === 'fecha_nac') return fmtFechaCorta(v);
    if (campo.tipo === 'grado_escolar') {
      try {
        const ge = JSON.parse(v);
        return [ge.grado, ge.jornada ? `Jornada ${ge.jornada}` : null].filter(Boolean).join(' — ') || String(v);
      } catch { return String(v); }
    }
    if (campo.tipo === 'datos_padre' || campo.tipo === 'datos_madre' || campo.tipo === 'datos_tutor') {
      try {
        const d = JSON.parse(v);
        const partes = [
          campo.tipo === 'datos_tutor' && d.relacion ? `Relación: ${d.relacion}` : null,
          d.tipoDoc && d.numDoc ? `${d.tipoDoc} ${d.numDoc}` : null,
          d.celular ? `Cel: ${d.celular}` : null,
          d.eps     ? `EPS: ${d.eps}`     : null,
        ].filter(Boolean);
        return partes.length ? partes.join(' · ') : '(datos registrados)';
      } catch { return String(v); }
    }
    return String(v);
  };

  const fecha = new Date(inscripcion.fechaInscripcion).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Dialog open onClose={confirmarCierre} maxWidth="sm" fullWidth
      alEnviar={() => { if (editando) handleGuardar(); }}
      slotProps={{ paper: { sx: { borderRadius: { xs: 0, sm: 3 } } } }}>
      <DialogTitle sx={{ bgcolor: COLOR, color: 'white', py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontWeight: 700 }} component="div">Formulario de inscripción</Typography>
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
        <Box sx={{ mb: 2.5, p: 2, bgcolor: (t) => alpha(t.palette.primary.main, 0.08), borderRadius: 2, border: '1px solid', borderColor: (t) => alpha(t.palette.primary.main, 0.3) }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <Typography sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.4 }} variant="caption">Programa</Typography>
              <Typography sx={{ fontWeight: 700, color: COLOR }} variant="body2">{inscripcion.nombrePrograma}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.4 }} variant="caption">Sede</Typography>
              <Typography variant="body2">{inscripcion.nombreSede}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.4 }} variant="caption">Fecha de inscripción</Typography>
              <Typography variant="body2">{fecha}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.4 }} variant="caption">Estado</Typography>
              <Box>{chipEstado(inscripcion.estado)}</Box>
            </Grid>
          </Grid>
        </Box>

        {beneficiario && (
          <Box sx={{ mb: 2.5, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ borderLeft: `4px solid ${COLOR}`, pl: 1.5, mb: 1.5 }}>
              <Typography
                sx={{ fontWeight: 800, color: COLOR, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Datos del Beneficiario
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 1.5, alignItems: 'flex-start' }}>
              {beneficiario.fotoMenorUrl ? (
                <Box component="img" src={fotoBeneficiario || undefined} alt="Foto beneficiario"
                  sx={{ width: 72, height: 88, objectFit: 'contain', borderRadius: 1.5,
                        border: `2px solid ${COLOR}`, flexShrink: 0, bgcolor: (t) => alpha(t.palette.primary.main, 0.08) }} />
              ) : (
                <Avatar sx={{ bgcolor: COLOR, width: 72, height: 72, flexShrink: 0,
                              borderRadius: 1.5, fontSize: '1.5rem' }}>
                  {(beneficiario.nombreMenor || '?')[0].toUpperCase()}
                </Avatar>
              )}
              <Grid container spacing={1.5} sx={{ flex: 1 }}>
                <Grid size={12}>
                  <Typography variant="caption"
                    sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.4, textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>Nombre completo</Typography>
                  <Typography sx={{ fontWeight: 700 }} variant="body2">{beneficiario.nombreMenor}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption"
                    sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.4, textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>Documento</Typography>
                  <Typography variant="body2">{beneficiario.tipoDocumento} {beneficiario.numeroDocumento ?? '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption"
                    sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.4, textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>Edad / Nacimiento</Typography>
                  <Typography variant="body2">
                    {calcEdad(beneficiario.fechaNacimiento) != null ? `${calcEdad(beneficiario.fechaNacimiento)} años` : '—'}
                    {beneficiario.fechaNacimiento ? ` · ${fmtFechaCorta(beneficiario.fechaNacimiento)}` : ''}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
              <Grid size={{ xs: 12, sm: 5 }}>
                <Typography variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.4, textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>Acudiente</Typography>
                <Typography variant="body2">{beneficiario.nombreAcudiente || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.4, textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>Parentesco</Typography>
                <Typography variant="body2">{beneficiario.parentesco || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Typography variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.4, textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>WhatsApp / Teléfono</Typography>
                <Typography variant="body2">{beneficiario.whatsapp || '—'}</Typography>
              </Grid>
            </Grid>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.4, textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>EPS / Aseguradora</Typography>
                <Typography variant="body2">{beneficiario.eps || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.4, textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>Alergia</Typography>
                <Typography variant="body2">
                  {beneficiario.tieneAlergia === 'si'
                    ? `Sí — ${beneficiario.descripcionAlergia || 'sin descripción'}`
                    : 'No'}
                </Typography>
              </Grid>
              {beneficiario.observacionesSalud && (
                <Grid size={12}>
                  <Typography variant="caption"
                    sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.4, textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>Observaciones de salud</Typography>
                  <Typography variant="body2">{beneficiario.observacionesSalud}</Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {cargando ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: COLOR }} />
          </Box>
        ) : editando ? (
          <Grid container spacing={2.5}>
            {agruparPorSeccion(campos).map(({ seccion: sec, campos: grp }) => (
              <Grid key={sec || '_root'} size={12} container spacing={2.5} sx={{ m: 0, p: 0 }}>
                <SeccionHeader titulo={sec} />
                {grp.map(c => {
                  const esPanel = c.tipo === 'datos_padre' || c.tipo === 'datos_madre' || c.tipo === 'datos_tutor';
                  const activo  = esPanel ? (panelActivo[c.id] !== false) : true;
                  if (c.tipo === 'datos_tutor' && !activo) return null;
                  return (
                    <Grid key={c.id} size={(c.tipo === 'document' || c.tipo === 'daterange' || c.tipo === 'firma' || c.tipo === 'documento_id' || c.tipo === 'grado_escolar' || esPanel) ? 12 : { xs: 12, sm: c.columnas ?? 6 }}>
                      <CampoInput
                        campo={c}
                        value={datos[c.id]}
                        onChange={v => setDatos(prev => ({ ...prev, [c.id]: v }))}
                        activo={esPanel ? activo : undefined}
                        onToggle={(c.tipo === 'datos_padre' || c.tipo === 'datos_madre') && tienePadreMadre ? () => handleTogglePanelEdit(c) : undefined}
                        error={errCampo(c.id)}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            ))}
            <Grid size={12}>
              <TextField fullWidth size="small" label="Observaciones (opcional)"
                multiline rows={2} value={observaciones}
                onChange={e => setObservaciones(e.target.value)} />
            </Grid>
            <Grid size={12}>
              <FirmaAutorizacion datos={datos} setDatos={setDatos}
                panelActivo={panelActivo} campos={campos} />
            </Grid>
          </Grid>
        ) : (
          <Box>
            {campos.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Este programa no tiene campos adicionales en el formulario.
              </Alert>
            ) : (
              <Box>
                {agruparPorSeccion(campos).map(({ seccion: sec, campos: grp }) => (
                  <Box key={sec || '_root'} sx={{ mb: 2.5 }}>
                    {sec && (
                      <Box sx={{ bgcolor: COLOR, borderRadius: 1.5, px: 2, py: 1.1, mb: 1.2 }}>
                        <Typography
                          sx={{ fontWeight: 800, color: 'white', fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                          {sec}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                      {grp.map((c) => (
                        <Box key={c.id} sx={{ bgcolor: 'superficie2', borderRadius: 2, border: '1px solid', borderColor: 'divider', px: 2, py: 1.1 }}>
                          <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: (t) => (t.palette.mode === 'dark' ? t.palette.primary.light : t.palette.primary.dark),
                            textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.35, display: 'block' }}>
                            {c.etiqueta}{c.obligatorio ? ' *' : ''}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.primary', wordBreak: 'break-word', lineHeight: 1.5 }}>
                            {valorVista(c)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
            <FirmaAutorizacion datos={datos} setDatos={setDatos}
              panelActivo={panelActivo} campos={campos} disabled sx={{ mt: 1 }} />

            {/* ── Firma del Representante Legal ──────────────────── */}
            <Box sx={{ mt: 2, p: 2, borderRadius: 2, border: '1px solid',
              borderColor: (t) => (programa?.repAutorizado && programa?.repFirma ? alpha(t.palette.primary.main, 0.3) : alpha(t.palette.warning.main, 0.5)),
              bgcolor: (t) => (programa?.repAutorizado && programa?.repFirma ? t.palette.background.paper : alpha(t.palette.warning.main, 0.08)) }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5,
                borderLeft: '4px solid', borderLeftColor: programa?.repAutorizado && programa?.repFirma ? COLOR : 'warning.main',
                pl: 1.5 }}>
                {programa?.repAutorizado && programa?.repFirma
                  ? <GavelIcon fontSize="small" sx={{ color: COLOR }} />
                  : <WarningAmberIcon fontSize="small" sx={{ color: 'warning.main' }} />}
                <Typography
                  sx={{ fontWeight: 800, color: programa?.repAutorizado && programa?.repFirma ? COLOR : 'warning.dark', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Firma Representante Legal — Fundación
                </Typography>
              </Box>
              {programa?.repAutorizado && programa?.repFirma ? (
                <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <Box component="img" src={programa.repFirma} alt="Firma representante"
                    sx={{ height: 64, maxWidth: 200, objectFit: 'contain',
                          border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'white', p: 0.5 }} />
                  <Box>
                    <Typography sx={{ fontWeight: 700 }} variant="body2">{programa.repNombre ?? '—'}</Typography>
                    {programa.repDocumento && (
                      <Typography sx={{ color: 'text.secondary', display: 'block' }} variant="caption">
                        Doc: {programa.repDocumento}
                      </Typography>
                    )}
                    {programa.repCargo && (
                      <Typography sx={{ color: 'text.secondary', display: 'block' }} variant="caption">
                        {programa.repCargo}
                      </Typography>
                    )}
                    {programa.repAutorizacionFecha && (
                      <Typography sx={{ color: 'text.secondary', display: 'block' }} variant="caption">
                        Autorizado: {new Date(programa.repAutorizacionFecha).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ) : programa?.repAutorizado && !programa?.repFirma ? (
                <Box>
                  <Typography sx={{ fontWeight: 600 }} variant="body2">{programa.repNombre ?? '—'}</Typography>
                  {programa.repCargo && <Typography sx={{ color: 'text.secondary' }} variant="caption">{programa.repCargo}</Typography>}
                  <Typography variant="caption" sx={{ color: 'warning.dark', display: 'block', mt: 0.5 }}>
                    No hay firma capturada. Ve a Configuración → Representante Legal, sube la firma y luego re-autoriza el programa.
                  </Typography>
                </Box>
              ) : (
                <Typography sx={{ color: 'warning.dark' }} variant="body2">
                  Este programa no tiene representante legal autorizado. Ve a <strong>Programas</strong> y haz clic en "Autorizar representante" para vincularlo.
                </Typography>
              )}
            </Box>

            {observaciones && (
              <Box sx={{ borderLeft: `5px solid ${COLOR}`, bgcolor: 'rgba(78,27,149,0.07)',
                          borderRadius: '0 8px 8px 0', px: 1.5, py: 1, mt: 1 }}>
                <Typography
                  sx={{ fontWeight: 800, color: COLOR, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5, display: 'block' }}>
                  Observaciones
                </Typography>
                <Typography sx={{ color: 'text.primary' }} variant="body2">{observaciones}</Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <ResumenErrores visible={editando && verResumen && hayErrores} errores={errores}
        etiqueta={id => campos.find(c => String(c.id) === id)?.etiqueta ?? id}
        onClose={() => setVerResumen(false)} accion="guardar los cambios" />
      <ErrorServidor mensaje={aviso.mensaje} titulo={aviso.titulo}
        onClose={() => setAviso({ mensaje: '', titulo: '' })} />
      <ErrorServidor mensaje={error} onClose={() => setError('')} />
      {editando ? (
        <AccionesDialogo
          onCancelar={confirmarCancelarEdicion}
          guardando={guardando}
          enviar
          textoGuardar="Guardar cambios"
          anterior={{ onClick: () => confirmarCierre(), texto: 'Cerrar' }}
          sxGuardar={{ bgcolor: COLOR }}
        />
      ) : (
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => confirmarCierre()} color="inherit">Cerrar</Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" startIcon={<EditIcon />}
            onClick={() => setEditando(true)} disabled={cargando}
            sx={{ color: COLOR, borderColor: COLOR }}>
            Editar
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

// Diálogo de vista y edición del formulario dinámico de una inscripción.
import { useState, useEffect } from 'react';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, TextField, Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import EditIcon        from '@mui/icons-material/Edit';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { beneficiariosRepository } from '../../../../../infrastructure/repositories/beneficiariosRepository';
import { generarPdfInscripcion }   from '../../../../../shared/utils/generarPdfInscripcion';
import { sedesRepository }         from '../../../../../infrastructure/repositories/sedesRepository';
import { inscripcionesRepository } from '../../../../../infrastructure/repositories/inscripcionesRepository';
import {
  COLOR, CampoInput, FirmaAutorizacion, SeccionHeader,
  agruparPorSeccion, calcEdad, chipEstado, fmtFechaCorta,
} from './campos';

export function VerFormularioDialog({ inscripcion, onCerrar, onActualizada }) {
  const [campos,        setCampos]        = useState([]);
  const [cargando,      setCargando]      = useState(true);
  const [editando,      setEditando]      = useState(false);
  const [datos,         setDatos]         = useState({});
  const [panelActivo,   setPanelActivo]   = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [guardando,     setGuardando]     = useState(false);
  const [generandoPdf,  setGenerandoPdf]  = useState(false);
  const [error,         setError]         = useState('');
  const [beneficiario,  setBeneficiario]  = useState(null);
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const tienePadreMadre = campos.some(c => c.tipo === 'datos_padre') && campos.some(c => c.tipo === 'datos_madre');

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
        let datosActuales = {};
        try { datosActuales = JSON.parse(inscripcion.datos || '{}'); } catch {}
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
      const [{ data: benef }, { data: programa }] = await Promise.all([
        beneficiariosRepository.obtener(inscripcion.beneficiarioId),
        sedesRepository.obtenerPrograma(inscripcion.programaId),
      ]);
      const doc = await generarPdfInscripcion({
        inscripcion, beneficiario: benef, campos, datos, observaciones,
        conTercero: programa.tieneTercero ?? false,
        nombreTercero: programa.nombreTercero ?? '',
        programa,
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
    } catch {
      setError('No se pudo generar el PDF.');
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
                border: '1px solid #e0d9f3', borderRadius: 1, bgcolor: 'white' }} />
      );
      return <Chip label="Sin firma" color="warning" size="small" variant="outlined" />;
    }
    if (campo.tipo === 'documento_id') {
      if (!v) return <em style={{ color: '#aaa' }}>—</em>;
      try { const doc = JSON.parse(v); return `${doc.tipo || '—'} · ${doc.numero || '—'}`; } catch { return String(v); }
    }
    if (campo.tipo === 'document') {
      if (v) return (
        <Box display="flex" alignItems="center" gap={1}>
          <Chip label="✓ Entregado" color="success" size="small" />
          <Button size="small" sx={{ color: COLOR, p: 0, minWidth: 0, textDecoration: 'underline' }}
            onClick={() => window.open(v, '_blank', 'noopener,noreferrer')}>Ver PDF</Button>
        </Box>
      );
      return <Chip label="Pendiente" color="warning" size="small" variant="outlined" />;
    }
    if (v === undefined || v === null || v === '') return <em style={{ color: '#aaa' }}>—</em>;
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
        <Box sx={{ mb: 2.5, p: 2, bgcolor: '#f3f0ff', borderRadius: 2, border: '1px solid #d0c4f7' }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.4}>Programa</Typography>
              <Typography variant="body2" fontWeight={700} color={COLOR}>{inscripcion.nombrePrograma}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.4}>Sede</Typography>
              <Typography variant="body2">{inscripcion.nombreSede}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.4}>Fecha de inscripción</Typography>
              <Typography variant="body2">{fecha}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.4}>Estado</Typography>
              <Box>{chipEstado(inscripcion.estado)}</Box>
            </Grid>
          </Grid>
        </Box>

        {beneficiario && (
          <Box sx={{ mb: 2.5, p: 2, bgcolor: '#fdfbff', borderRadius: 2, border: '1px solid #e2d9f3' }}>
            <Box sx={{ borderLeft: `4px solid ${COLOR}`, pl: 1.5, mb: 1.5 }}>
              <Typography fontWeight={800} color={COLOR}
                sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Datos del Beneficiario
              </Typography>
            </Box>
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
              <Grid container spacing={1.5} sx={{ flex: 1 }}>
                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.4}
                    sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>Nombre completo</Typography>
                  <Typography variant="body2" fontWeight={700}>{beneficiario.nombreMenor}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.4}
                    sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>Documento</Typography>
                  <Typography variant="body2">{beneficiario.tipoDocumento} {beneficiario.numeroDocumento ?? '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.4}
                    sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>Edad / Nacimiento</Typography>
                  <Typography variant="body2">
                    {calcEdad(beneficiario.fechaNacimiento) != null ? `${calcEdad(beneficiario.fechaNacimiento)} años` : '—'}
                    {beneficiario.fechaNacimiento ? ` · ${fmtFechaCorta(beneficiario.fechaNacimiento)}` : ''}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
              <Grid size={{ xs: 12, sm: 5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.4}
                  sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>Acudiente</Typography>
                <Typography variant="body2">{beneficiario.nombreAcudiente || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.4}
                  sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>Parentesco</Typography>
                <Typography variant="body2">{beneficiario.parentesco || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.4}
                  sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>WhatsApp / Teléfono</Typography>
                <Typography variant="body2">{beneficiario.whatsapp || '—'}</Typography>
              </Grid>
            </Grid>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.4}
                  sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>EPS / Aseguradora</Typography>
                <Typography variant="body2">{beneficiario.eps || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.4}
                  sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>Alergia</Typography>
                <Typography variant="body2">
                  {beneficiario.tieneAlergia === 'si'
                    ? `Sí — ${beneficiario.descripcionAlergia || 'sin descripción'}`
                    : 'No'}
                </Typography>
              </Grid>
              {beneficiario.observacionesSalud && (
                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.4}
                    sx={{ textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em' }}>Observaciones de salud</Typography>
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
                        <Typography fontWeight={800} color="white"
                          sx={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                          {sec}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                      {grp.map((c) => (
                        <Box key={c.id} sx={{ bgcolor: '#fdfbff', borderRadius: 2, border: '1px solid #ede7f6', px: 2, py: 1.1 }}>
                          <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#2d1566',
                            textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.35, display: 'block' }}>
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
            <FirmaAutorizacion datos={datos} setDatos={setDatos}
              panelActivo={panelActivo} campos={campos} disabled sx={{ mt: 1 }} />
            {observaciones && (
              <Box sx={{ borderLeft: `5px solid ${COLOR}`, bgcolor: 'rgba(78,27,149,0.07)',
                          borderRadius: '0 8px 8px 0', px: 1.5, py: 1, mt: 1 }}>
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

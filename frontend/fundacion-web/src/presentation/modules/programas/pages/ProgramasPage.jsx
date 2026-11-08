import { useRef, useState } from 'react';
import {
  Alert, Box, Button, DialogContent, DialogTitle,
  Divider, FormControl, FormControlLabel, FormHelperText, Grid, IconButton, InputLabel,
  MenuItem, Select, Snackbar, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import Dialog from '@/shared/components/DialogResponsive';
import { AccionesDialogo, CampoDocumento, ErrorServidor } from '@/shared/components/form/FormControles';
import { useCerrarConCambios, hayCambiosEn } from '@/shared/hooks/useCerrarConCambios';
import { useAutoFocus } from '@/shared/hooks/useAutoFocus';
import { normalizarTipoDocumento } from '@/shared/constants/tiposDocumento';
import { alpha }        from '@mui/material/styles';
import AddIcon          from '@mui/icons-material/Add';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import EditIcon         from '@mui/icons-material/Edit';
import GavelIcon        from '@mui/icons-material/Gavel';
import HandshakeIcon    from '@mui/icons-material/Handshake';
import TuneIcon         from '@mui/icons-material/Tune';
import UploadFileIcon   from '@mui/icons-material/UploadFile';
import { useSedes }     from '@/application/sedes/useSedes';
import { COLOR }                from './components/helpers';
import { chipEstado }           from './components/Chips';
import { EditorCamposDialog }   from './components/EditorCamposDialog';
import FirmaPad                 from '@/shared/components/FirmaPad';
import {
  leerArchivoComoDataUrl,
  redimensionarImagen,
} from '@/presentation/modules/configuracion/pages/components/helpers';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';
import { validarArchivo } from '@/shared/utils/archivosPermitidos';

// Tipos de documento del representante del tercero: catálogo único (persona + empresa), vía CampoDocumento.
const TIPOS_DOC_TERCERO = ['persona', 'empresa'];

// Reglas del formulario de proyecto: cada una dice qué está mal y cómo llenarlo
const conTercero = f => f.tieneTercero;
const ESQUEMA = {
  sedeId:              { etiqueta: 'Sede',                     reglas: [r.seleccion('Sede Principal')] },
  nombre:              { etiqueta: 'Nombre del programa',      reglas: [r.obligatorio('Escuela de fútbol'), r.texto({ min: 3, max: 150 })] },
  descripcion:         { etiqueta: 'Descripción',              reglas: [r.texto({ max: 500 })] },
  cupoMaximo:          { etiqueta: 'Cupo máximo',              reglas: [r.numero({ min: 1, max: 100000, entero: true, unidad: 'cupos', ejemplo: '30' })] },
  nombreTercero:       { etiqueta: 'Nombre de la entidad ejecutora', reglas: [
    r.si(conTercero, r.obligatorio('Club Deportivo AJAZZ F.C.')), r.si(conTercero, r.texto({ min: 3, max: 200 })),
  ] },
  terceroRepNombre:    { etiqueta: 'Nombre del representante', reglas: [r.si(conTercero, r.nombreCompleto('Juan Carlos Pérez Gómez')), r.si(conTercero, r.texto({ max: 200 }))] },
  terceroRepDocumento: { etiqueta: 'Número de documento',      reglas: [r.si(conTercero, r.documentoSegunTipo('terceroRepTipoDoc'))] },
  terceroRepCargo:     { etiqueta: 'Cargo',                    reglas: [r.si(conTercero, r.texto({ max: 100 }))] },
};

const FORM_VACIO = {
  sedeId: '', nombre: '', descripcion: '', cupoMaximo: '',
  tieneTercero: false, nombreTercero: '',
  terceroRepNombre: '', terceroRepTipoDoc: 'CC',
  terceroRepDocumento: '', terceroRepCargo: '', terceroRepFirma: '',
};

export default function ProgramasPage() {
  const {
    sedes, cargando, error, setError, toast, setToast,
    guardarPrograma, togglePrograma,
    autorizarRepPrograma, revocarRepPrograma,
  } = useSedes();

  const [camposPrograma, setCamposPrograma] = useState(null);
  const [formPrograma,   setFormPrograma]   = useState(null);
  const [guardandoProg,  setGuardandoProg]  = useState(false);
  const [inicialPrograma, setInicialPrograma] = useState(null);
  const [errForm,        setErrForm]        = useState('');
  const fileRef  = useRef(null);
  const v = useValidacion(ESQUEMA, formPrograma ?? FORM_VACIO);
  const autoFocus = useAutoFocus();

  // Snapshot al abrir: cerrar con cambios pregunta "¿Descartar los cambios?"; mientras guarda no se cierra.
  const abrirFormPrograma  = (form) => { setFormPrograma(form); setInicialPrograma(form); setErrForm(''); };
  const cerrarFormPrograma = () => { setFormPrograma(null); setInicialPrograma(null); setErrForm(''); };
  const hayCambiosPrograma = !!formPrograma && !!inicialPrograma && hayCambiosEn(formPrograma, inicialPrograma);
  const { confirmarCierre: confirmarCierrePrograma } = useCerrarConCambios({
    hayCambios: hayCambiosPrograma, bloqueado: guardandoProg, onCerrar: cerrarFormPrograma,
  });

  const todosLosProgramas = sedes.flatMap(s =>
    (s.programas ?? []).map(p => ({ ...p, nombreSede: s.nombre }))
  );

  const abrirNuevoPrograma = () => {
    v.reiniciar();
    abrirFormPrograma({ ...FORM_VACIO, sedeId: sedes[0]?.id ?? '' });
  };

  const abrirEditarPrograma = (p) => {
    v.reiniciar();
    abrirFormPrograma({
      id: p.id, sedeId: p.sedeId,
      nombre: p.nombre, descripcion: p.descripcion ?? '',
      cupoMaximo: p.cupoMaximo != null ? String(p.cupoMaximo) : '', tieneTercero: p.tieneTercero ?? false,
      nombreTercero: p.nombreTercero ?? '',
      terceroRepNombre:    p.terceroRepNombre    ?? '',
      terceroRepTipoDoc:   p.terceroRepTipoDoc   ?? 'CC',
      terceroRepDocumento: p.terceroRepDocumento ?? '',
      terceroRepCargo:     p.terceroRepCargo     ?? '',
      terceroRepFirma:     p.terceroRepFirma     ?? '',
    });
  };

  const handleGuardarPrograma = async () => {
    if (guardandoProg || !v.validarTodo()) return;
    setGuardandoProg(true);
    setErrForm('');
    setError('');
    const dto = {
      sedeId:              formPrograma.sedeId,
      nombre:              formPrograma.nombre.trim(),
      descripcion:         formPrograma.descripcion.trim() || null,
      cupoMaximo:          formPrograma.cupoMaximo ? Number(formPrograma.cupoMaximo) : null,
      tieneTercero:        formPrograma.tieneTercero,
      nombreTercero:       formPrograma.tieneTercero ? (formPrograma.nombreTercero.trim() || null) : null,
      terceroRepNombre:    formPrograma.tieneTercero ? (formPrograma.terceroRepNombre.trim()    || null) : null,
      terceroRepTipoDoc:   formPrograma.tieneTercero ? (normalizarTipoDocumento(formPrograma.terceroRepTipoDoc) || null) : null,
      terceroRepDocumento: formPrograma.tieneTercero ? (formPrograma.terceroRepDocumento.trim() || null) : null,
      terceroRepCargo:     formPrograma.tieneTercero ? (formPrograma.terceroRepCargo.trim()     || null) : null,
      terceroRepFirma:     formPrograma.tieneTercero ? (formPrograma.terceroRepFirma            || null) : null,
    };
    const ok = await guardarPrograma(dto, formPrograma.id);
    if (ok) { cerrarFormPrograma(); }
    // El detalle (validación, conflicto, conexión…) llega en `error` desde useSedes.
    else     { setErrForm('No se pudo guardar el programa.'); }
    setGuardandoProg(false);
  };

  const handleUploadFirmaTercero = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const errArchivo = validarArchivo(file, { tipos: 'imagen' });
    if (errArchivo) { setError(''); setErrForm(errArchivo); e.target.value = ''; return; }
    try {
      const raw      = await leerArchivoComoDataUrl(file);
      const resizada = await redimensionarImagen(raw, 600);
      setFormPrograma(p => ({ ...p, terceroRepFirma: resizada }));
    } catch {
      setError('');
      setErrForm('No se pudo leer la imagen de la firma. Usa un archivo JPG, PNG o WEBP válido.');
    }
    e.target.value = '';
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>

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
          <Typography sx={{ fontWeight: 800, color: COLOR }} variant="h5">Proyectos</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={abrirNuevoPrograma} disabled={sedes.length === 0}
          sx={{ bgcolor: COLOR, flexShrink: 0, px: 2.5 }}>
          Nuevo proyecto
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {cargando ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography sx={{ color: 'text.secondary' }}>Cargando proyectos…</Typography>
        </Box>
      ) : todosLosProgramas.length === 0 ? (
        <Alert severity="info">
          No hay proyectos registrados. {sedes.length === 0 && 'Primero crea una sede.'}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {todosLosProgramas.map(p => (
            <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{
                border: '1.5px solid', borderColor: 'divider', borderRadius: 3,
                p: 2.5, bgcolor: 'background.paper', height: '100%',
                display: 'flex', flexDirection: 'column', gap: 1.5,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 800, color: COLOR }}>{p.nombre}</Typography>
                    <Typography sx={{ color: 'text.secondary' }} variant="caption">{p.nombreSede}</Typography>
                  </Box>
                  {chipEstado(p.activo)}
                </Box>

                {p.descripcion && (
                  <Typography variant="body2" sx={{ color: 'text.secondary',
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {p.descripcion}
                  </Typography>
                )}

                {p.cupoMaximo && (
                  <Typography variant="caption">
                    Cupo máximo: <strong>{p.cupoMaximo}</strong>
                  </Typography>
                )}

                <Divider sx={{ my: 0.5 }} />

                {/* ── Rep. Legal de la Fundación ── */}
                <Box sx={{
                  border: '1px solid',
                  borderColor: (t) => (p.repAutorizado ? alpha(t.palette.success.main, 0.35) : t.palette.divider),
                  borderRadius: 2, p: 1.2,
                  bgcolor: (t) => (p.repAutorizado ? alpha(t.palette.success.main, 0.08) : t.palette.superficie2),
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: p.repAutorizado ? 0.5 : 0 }}>
                    <GavelIcon sx={{ fontSize: 15, color: p.repAutorizado ? 'success.main' : 'text.disabled' }} />
                    <Typography variant="caption"
                      sx={{ fontWeight: 700, color: p.repAutorizado ? 'success.main' : 'text.secondary', flex: 1 }}>
                      Rep. Legal
                    </Typography>
                    {p.repAutorizado ? (
                      <Tooltip title="Revocar autorización">
                        <Button size="small" color="error" variant="outlined"
                          onClick={() => revocarRepPrograma(p.id)}
                          sx={{ fontSize: '0.65rem', py: 0.2, px: 1, minWidth: 0 }}>
                          Revocar
                        </Button>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Autorizar representante legal en este proyecto">
                        <Button size="small" variant="outlined" startIcon={<CheckCircleIcon sx={{ fontSize: 13 }} />}
                          onClick={() => autorizarRepPrograma(p.id)}
                          sx={{ color: COLOR, borderColor: COLOR, fontSize: '0.65rem',
                                py: 0.2, px: 1, minWidth: 0 }}>
                          Autorizar
                        </Button>
                      </Tooltip>
                    )}
                  </Box>
                  {p.repAutorizado && (
                    <Box>
                      <Typography variant="caption" sx={{ color: 'success.main', display: 'block', fontWeight: 600 }}>
                        {p.repNombre ?? '—'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.62rem' }}>
                        {p.repDocumento ? `${p.repDocumento}` : ''}
                        {p.repCargo ? ` · ${p.repCargo}` : ''}
                      </Typography>
                      {p.repAutorizacionFecha && (
                        <Typography variant="caption"
                          sx={{ color: 'text.secondary', display: 'block', fontSize: '0.6rem' }}>
                          Desde {new Date(p.repAutorizacionFecha).toLocaleDateString('es-CO',
                            { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>

                {/* ── Entidad ejecutora (tercero) ── */}
                {p.tieneTercero && (
                  <Box sx={{
                    border: '1px solid',
                    borderColor: (t) => (p.terceroRepNombre ? alpha(t.palette.info.main, 0.35) : t.palette.divider),
                    borderRadius: 2, p: 1.2,
                    bgcolor: (t) => (p.terceroRepNombre ? alpha(t.palette.info.main, 0.08) : t.palette.superficie2),
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: p.terceroRepNombre ? 0.5 : 0 }}>
                      <HandshakeIcon sx={{ fontSize: 15, color: p.terceroRepNombre ? 'info.main' : 'text.disabled' }} />
                      <Typography variant="caption"
                        sx={{ fontWeight: 700, color: p.terceroRepNombre ? 'info.main' : 'text.secondary', flex: 1 }}>
                        Entidad ejecutora
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                      {p.nombreTercero || '—'}
                    </Typography>
                    {p.terceroRepNombre && (
                      <>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.62rem' }}>
                          Rep: {p.terceroRepNombre}
                          {p.terceroRepDocumento ? ` · ${p.terceroRepTipoDoc} ${p.terceroRepDocumento}` : ''}
                        </Typography>
                        {p.terceroRepCargo && (
                          <Typography variant="caption"
                            sx={{ color: 'text.secondary', display: 'block', fontSize: '0.6rem' }}>
                            {p.terceroRepCargo}
                          </Typography>
                        )}
                        {p.terceroRepFirma && (
                          <Box component="img" src={p.terceroRepFirma} alt="Firma entidad"
                            sx={{ mt: 0.5, height: 32, maxWidth: '100%', objectFit: 'contain',
                                  border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'white' }} />
                        )}
                      </>
                    )}
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button size="small" variant="outlined" startIcon={<TuneIcon />}
                    onClick={() => setCamposPrograma(p)}
                    sx={{ color: COLOR, borderColor: COLOR, flex: 1 }}>
                    Campos
                  </Button>
                  <Tooltip title="Editar proyecto">
                    <IconButton size="small" onClick={() => abrirEditarPrograma(p)}>
                      <EditIcon fontSize="small" sx={{ color: COLOR }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={p.activo ? 'Desactivar' : 'Activar'}>
                    <IconButton size="small" onClick={() => togglePrograma(p)}>
                      <Switch size="small" checked={p.activo} readOnly
                        sx={{ pointerEvents: 'none', '& .MuiSwitch-thumb': { bgcolor: COLOR } }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {camposPrograma && (
        <EditorCamposDialog
          programa={camposPrograma}
          onCerrar={() => setCamposPrograma(null)}
        />
      )}

      {formPrograma && (
        <Dialog open onClose={confirmarCierrePrograma} alEnviar={handleGuardarPrograma}
          maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {formPrograma.id ? 'Editar proyecto' : 'Nuevo proyecto'}
          </DialogTitle>
          <DialogContent dividers>
            <Grid sx={{ mt: 0 }} container spacing={2.5}>
              <Grid size={12}>
                <FormControl fullWidth size="small" error={!!v.err('sedeId')}>
                  <InputLabel id="programas-page-sede-label">Sede *</InputLabel>
                  <Select labelId="programas-page-sede-label" label="Sede *" autoFocus={autoFocus} value={formPrograma.sedeId} onBlur={() => v.tocar('sedeId')}
                    onChange={e => setFormPrograma(p => ({ ...p, sedeId: e.target.value }))}>
                    {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                  </Select>
                  {v.err('sedeId') && <FormHelperText>{v.err('sedeId')}</FormHelperText>}
                </FormControl>
              </Grid>
              <Grid size={12}>
                <TextField fullWidth size="small" label="Nombre del programa *"
                  value={formPrograma.nombre}
                  onChange={e => setFormPrograma(p => ({ ...p, nombre: e.target.value }))}
                  {...v.props('nombre')} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth size="small" label="Descripción (opcional)" multiline rows={2}
                  value={formPrograma.descripcion}
                  onChange={e => setFormPrograma(p => ({ ...p, descripcion: e.target.value }))}
                  {...v.props('descripcion')} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth size="small" label="Cupo máximo (opcional)" type="text"
                  slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                  value={formPrograma.cupoMaximo}
                  onChange={e => setFormPrograma(p => ({ ...p, cupoMaximo: e.target.value }))}
                  {...v.props('cupoMaximo')} />
              </Grid>
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Switch checked={formPrograma.tieneTercero}
                      onChange={e => setFormPrograma(p => ({ ...p, tieneTercero: e.target.checked, nombreTercero: e.target.checked ? p.nombreTercero : '' }))} />
                  }
                  label={
                    <Typography variant="body2">
                      El programa es ejecutado por una entidad externa
                    </Typography>
                  }
                />
              </Grid>
              {formPrograma.tieneTercero && (
                <>
                  <Grid size={12}>
                    <TextField fullWidth size="small" label="Nombre de la entidad ejecutora *"
                      placeholder="Ej: Fundación XYZ, Club Deportivo AJAZZ F.C.…"
                      value={formPrograma.nombreTercero}
                      onChange={e => setFormPrograma(p => ({ ...p, nombreTercero: e.target.value }))}
                      {...v.props('nombreTercero')} />
                  </Grid>

                  {/* Separador visual */}
                  <Grid size={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <HandshakeIcon sx={{ fontSize: 16, color: COLOR }} />
                      <Typography variant="caption"
                        sx={{ fontWeight: 700, color: COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Representante de la entidad ejecutora
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={12}>
                    <TextField fullWidth size="small" label="Nombre completo del representante"
                      placeholder="Ej: Juan Carlos Pérez Gómez"
                      value={formPrograma.terceroRepNombre}
                      onChange={e => setFormPrograma(p => ({ ...p, terceroRepNombre: e.target.value }))}
                      {...v.props('terceroRepNombre')} />
                  </Grid>
                  <Grid size={12}>
                    {/* Catálogo único de tipos: un valor viejo ('Pasaporte') se sigue mostrando y al
                        guardar se normaliza ('PA'). Con NIT valida el DV y sugiere el correcto. */}
                    <CampoDocumento
                      aplicaA={TIPOS_DOC_TERCERO}
                      labelTipo="Tipo de documento" labelNumero="Número de documento"
                      tipoDocumento={formPrograma.terceroRepTipoDoc}
                      documento={formPrograma.terceroRepDocumento}
                      onChangeTipo={t => setFormPrograma(p => ({ ...p, terceroRepTipoDoc: t }))}
                      onChangeNumero={n => setFormPrograma(p => ({ ...p, terceroRepDocumento: n }))}
                      validacionNumero={v.props('terceroRepDocumento')} />
                  </Grid>
                  <Grid size={12}>
                    <TextField fullWidth size="small" label="Cargo"
                      placeholder="Ej: Presidente, Director Técnico…"
                      value={formPrograma.terceroRepCargo}
                      onChange={e => setFormPrograma(p => ({ ...p, terceroRepCargo: e.target.value }))}
                      {...v.props('terceroRepCargo')} />
                  </Grid>

                  {/* Firma de la entidad */}
                  <Grid size={12}>
                    <Typography variant="caption"
                      sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 1 }}>
                      Firma de la entidad ejecutora
                    </Typography>
                    <FirmaPad
                      label="Firma de la entidad ejecutora"
                      value={formPrograma.terceroRepFirma}
                      onChange={v => setFormPrograma(p => ({ ...p, terceroRepFirma: v }))}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Button size="small" variant="outlined" startIcon={<UploadFileIcon />}
                        onClick={() => fileRef.current?.click()}
                        sx={{ color: COLOR, borderColor: COLOR, fontSize: '0.75rem' }}>
                        Subir imagen (JPG/PNG)
                      </Button>
                      {formPrograma.terceroRepFirma && (
                        <Button size="small" color="error"
                          onClick={() => setFormPrograma(p => ({ ...p, terceroRepFirma: '' }))}
                          sx={{ fontSize: '0.75rem' }}>
                          Borrar firma
                        </Button>
                      )}
                    </Box>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }} onChange={handleUploadFirmaTercero} />
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>
          <ResumenErrores {...v.resumen} accion={formPrograma.id ? 'guardar' : 'crear el proyecto'} />
          <ErrorServidor mensaje={errForm ? (error || errForm) : ''} onClose={() => setErrForm('')} />
          <AccionesDialogo onCancelar={confirmarCierrePrograma} guardando={guardandoProg} enviar
            textoGuardar={formPrograma.id ? 'Guardar' : 'Crear proyecto'} sxGuardar={{ bgcolor: COLOR }} />
        </Dialog>
      )}

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}

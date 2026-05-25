import { useRef, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, FormControlLabel, Grid, IconButton, InputLabel,
  MenuItem, Select, Snackbar, Switch, TextField, Tooltip, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
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
} from '../../../modules/configuracion/pages/components/helpers';

const TIPOS_DOC = ['CC', 'CE', 'NIT', 'Pasaporte', 'TI', 'PEP', 'PPT', 'Otro'];

const FORM_VACIO = {
  sedeId: '', nombre: '', descripcion: '', cupoMaximo: '',
  tieneTercero: false, nombreTercero: '',
  terceroRepNombre: '', terceroRepTipoDoc: 'CC',
  terceroRepDocumento: '', terceroRepCargo: '', terceroRepFirma: '',
};

export default function ProgramasPage() {
  const {
    sedes, cargando, error, toast, setToast,
    guardarPrograma, togglePrograma, eliminarPrograma,
    autorizarRepPrograma, revocarRepPrograma,
  } = useSedes();

  const [camposPrograma, setCamposPrograma] = useState(null);
  const [formPrograma,   setFormPrograma]   = useState(null);
  const [guardandoProg,  setGuardandoProg]  = useState(false);
  const [errForm,        setErrForm]        = useState('');
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const fileRef  = useRef(null);

  const todosLosProgramas = sedes.flatMap(s =>
    (s.programas ?? []).map(p => ({ ...p, nombreSede: s.nombre }))
  );

  const abrirNuevoPrograma = () =>
    setFormPrograma({ ...FORM_VACIO, sedeId: sedes[0]?.id ?? '' });

  const abrirEditarPrograma = (p) =>
    setFormPrograma({
      id: p.id, sedeId: p.sedeId,
      nombre: p.nombre, descripcion: p.descripcion ?? '',
      cupoMaximo: p.cupoMaximo ?? '', tieneTercero: p.tieneTercero ?? false,
      nombreTercero: p.nombreTercero ?? '',
      terceroRepNombre:    p.terceroRepNombre    ?? '',
      terceroRepTipoDoc:   p.terceroRepTipoDoc   ?? 'CC',
      terceroRepDocumento: p.terceroRepDocumento ?? '',
      terceroRepCargo:     p.terceroRepCargo     ?? '',
      terceroRepFirma:     p.terceroRepFirma     ?? '',
    });

  const handleGuardarPrograma = async () => {
    if (!formPrograma.nombre.trim() || !formPrograma.sedeId) return;
    setGuardandoProg(true);
    setErrForm('');
    const dto = {
      sedeId:              formPrograma.sedeId,
      nombre:              formPrograma.nombre.trim(),
      descripcion:         formPrograma.descripcion.trim() || null,
      cupoMaximo:          formPrograma.cupoMaximo ? Number(formPrograma.cupoMaximo) : null,
      tieneTercero:        formPrograma.tieneTercero,
      nombreTercero:       formPrograma.tieneTercero ? (formPrograma.nombreTercero.trim() || null) : null,
      terceroRepNombre:    formPrograma.tieneTercero ? (formPrograma.terceroRepNombre.trim()    || null) : null,
      terceroRepTipoDoc:   formPrograma.tieneTercero ? (formPrograma.terceroRepTipoDoc          || null) : null,
      terceroRepDocumento: formPrograma.tieneTercero ? (formPrograma.terceroRepDocumento.trim() || null) : null,
      terceroRepCargo:     formPrograma.tieneTercero ? (formPrograma.terceroRepCargo.trim()     || null) : null,
      terceroRepFirma:     formPrograma.tieneTercero ? (formPrograma.terceroRepFirma            || null) : null,
    };
    const ok = await guardarPrograma(dto, formPrograma.id);
    if (ok) { setFormPrograma(null); }
    else     { setErrForm('No se pudo guardar el programa.'); }
    setGuardandoProg(false);
  };

  const handleUploadFirmaTercero = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw      = await leerArchivoComoDataUrl(file);
      const resizada = await redimensionarImagen(raw, 600);
      setFormPrograma(p => ({ ...p, terceroRepFirma: resizada }));
    } catch {}
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
          <Typography variant="h5" fontWeight={800} color={COLOR}>Proyectos</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={abrirNuevoPrograma} disabled={sedes.length === 0}
          sx={{ bgcolor: COLOR, flexShrink: 0, px: 2.5 }}>
          Nuevo proyecto
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {cargando ? (
        <Box display="flex" justifyContent="center" py={8}>
          <Typography color="text.secondary">Cargando proyectos…</Typography>
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
                border: '1.5px solid #e2d9f3', borderRadius: 3,
                p: 2.5, bgcolor: '#fdfbff', height: '100%',
                display: 'flex', flexDirection: 'column', gap: 1.5,
              }}>
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <Box flex={1}>
                    <Typography fontWeight={800} sx={{ color: COLOR }}>{p.nombre}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.nombreSede}</Typography>
                  </Box>
                  {chipEstado(p.activo)}
                </Box>

                {p.descripcion && (
                  <Typography variant="body2" color="text.secondary" sx={{
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
                  border: `1px solid ${p.repAutorizado ? '#c8e6c9' : '#e2d9f3'}`,
                  borderRadius: 2, p: 1.2,
                  bgcolor: p.repAutorizado ? '#f1f8e9' : '#fdfbff',
                }}>
                  <Box display="flex" alignItems="center" gap={0.8} mb={p.repAutorizado ? 0.5 : 0}>
                    <GavelIcon sx={{ fontSize: 15, color: p.repAutorizado ? '#388e3c' : '#aaa' }} />
                    <Typography variant="caption" fontWeight={700}
                      sx={{ color: p.repAutorizado ? '#388e3c' : 'text.secondary', flex: 1 }}>
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
                      <Typography variant="caption" sx={{ color: '#2e7d32', display: 'block', fontWeight: 600 }}>
                        {p.repNombre ?? '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                        {p.repDocumento ? `${p.repDocumento}` : ''}
                        {p.repCargo ? ` · ${p.repCargo}` : ''}
                      </Typography>
                      {p.repAutorizacionFecha && (
                        <Typography variant="caption" color="text.secondary"
                          sx={{ display: 'block', fontSize: '0.6rem' }}>
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
                    border: `1px solid ${p.terceroRepNombre ? '#b3c6f7' : '#e2d9f3'}`,
                    borderRadius: 2, p: 1.2,
                    bgcolor: p.terceroRepNombre ? '#f0f4ff' : '#fdfbff',
                  }}>
                    <Box display="flex" alignItems="center" gap={0.8} mb={p.terceroRepNombre ? 0.5 : 0}>
                      <HandshakeIcon sx={{ fontSize: 15, color: p.terceroRepNombre ? '#1565c0' : '#aaa' }} />
                      <Typography variant="caption" fontWeight={700}
                        sx={{ color: p.terceroRepNombre ? '#1565c0' : 'text.secondary', flex: 1 }}>
                        Entidad ejecutora
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                      {p.nombreTercero || '—'}
                    </Typography>
                    {p.terceroRepNombre && (
                      <>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                          Rep: {p.terceroRepNombre}
                          {p.terceroRepDocumento ? ` · ${p.terceroRepTipoDoc} ${p.terceroRepDocumento}` : ''}
                        </Typography>
                        {p.terceroRepCargo && (
                          <Typography variant="caption" color="text.secondary"
                            sx={{ display: 'block', fontSize: '0.6rem' }}>
                            {p.terceroRepCargo}
                          </Typography>
                        )}
                        {p.terceroRepFirma && (
                          <Box component="img" src={p.terceroRepFirma} alt="Firma entidad"
                            sx={{ mt: 0.5, height: 32, maxWidth: '100%', objectFit: 'contain',
                                  border: '1px solid #d0dcf7', borderRadius: 1, bgcolor: 'white' }} />
                        )}
                      </>
                    )}
                  </Box>
                )}

                <Box display="flex" gap={1} flexWrap="wrap">
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
        <Dialog open onClose={() => setFormPrograma(null)}
          maxWidth={formPrograma.tieneTercero ? 'sm' : 'xs'} fullWidth
          fullScreen={isMobile}
          PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2 } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {formPrograma.id ? 'Editar proyecto' : 'Nuevo proyecto'}
          </DialogTitle>
          <DialogContent dividers>
            {errForm && <Alert severity="error" sx={{ mb: 2.5 }}>{errForm}</Alert>}
            <Grid container spacing={2.5} mt={0}>
              <Grid size={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sede *</InputLabel>
                  <Select label="Sede *" value={formPrograma.sedeId}
                    onChange={e => setFormPrograma(p => ({ ...p, sedeId: e.target.value }))}>
                    {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={12}>
                <TextField fullWidth size="small" label="Nombre del programa *"
                  value={formPrograma.nombre}
                  onChange={e => setFormPrograma(p => ({ ...p, nombre: e.target.value }))} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth size="small" label="Descripción (opcional)" multiline rows={2}
                  value={formPrograma.descripcion}
                  onChange={e => setFormPrograma(p => ({ ...p, descripcion: e.target.value }))} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth size="small" label="Cupo máximo (opcional)" type="number"
                  value={formPrograma.cupoMaximo}
                  onChange={e => setFormPrograma(p => ({ ...p, cupoMaximo: e.target.value }))} />
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
                    <TextField fullWidth size="small" label="Nombre de la entidad ejecutora"
                      placeholder="Ej: Fundación XYZ, Club Deportivo AJAZZ F.C.…"
                      value={formPrograma.nombreTercero}
                      onChange={e => setFormPrograma(p => ({ ...p, nombreTercero: e.target.value }))} />
                  </Grid>

                  {/* Separador visual */}
                  <Grid size={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <HandshakeIcon sx={{ fontSize: 16, color: COLOR }} />
                      <Typography variant="caption" fontWeight={700} color={COLOR}
                        sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Representante de la entidad ejecutora
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={12}>
                    <TextField fullWidth size="small" label="Nombre completo del representante"
                      placeholder="Ej: Juan Carlos Pérez Gómez"
                      value={formPrograma.terceroRepNombre}
                      onChange={e => setFormPrograma(p => ({ ...p, terceroRepNombre: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Tipo de documento</InputLabel>
                      <Select label="Tipo de documento" value={formPrograma.terceroRepTipoDoc}
                        onChange={e => setFormPrograma(p => ({ ...p, terceroRepTipoDoc: e.target.value }))}>
                        {TIPOS_DOC.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 7 }}>
                    <TextField fullWidth size="small" label="Número de documento"
                      value={formPrograma.terceroRepDocumento}
                      onChange={e => setFormPrograma(p => ({ ...p, terceroRepDocumento: e.target.value }))} />
                  </Grid>
                  <Grid size={12}>
                    <TextField fullWidth size="small" label="Cargo"
                      placeholder="Ej: Presidente, Director Técnico…"
                      value={formPrograma.terceroRepCargo}
                      onChange={e => setFormPrograma(p => ({ ...p, terceroRepCargo: e.target.value }))} />
                  </Grid>

                  {/* Firma de la entidad */}
                  <Grid size={12}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary"
                      sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 1 }}>
                      Firma de la entidad ejecutora
                    </Typography>
                    <FirmaPad
                      label="Firma de la entidad ejecutora"
                      value={formPrograma.terceroRepFirma}
                      onChange={v => setFormPrograma(p => ({ ...p, terceroRepFirma: v }))}
                    />
                    <Box display="flex" alignItems="center" gap={1} mt={1}>
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
          <DialogActions sx={{ px: 2, py: 1.5 }}>
            <Button onClick={() => setFormPrograma(null)} disabled={guardandoProg}>Cancelar</Button>
            <Button variant="contained" onClick={handleGuardarPrograma}
              disabled={guardandoProg || !formPrograma.nombre.trim() || !formPrograma.sedeId}
              sx={{ bgcolor: COLOR }}>
              {guardandoProg ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}

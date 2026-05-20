import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, FormControlLabel, Grid, IconButton, InputLabel,
  MenuItem, Select, Snackbar, Switch, TextField, Tooltip, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import AddIcon         from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon        from '@mui/icons-material/Edit';
import GavelIcon       from '@mui/icons-material/Gavel';
import TuneIcon        from '@mui/icons-material/Tune';
import { useSedes }    from '../../../../application/sedes/useSedes';
import { COLOR }               from './components/helpers';
import { chipEstado }         from './components/Chips';
import { EditorCamposDialog }     from './components/EditorCamposDialog';

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

  const todosLosProgramas = sedes.flatMap(s =>
    (s.programas ?? []).map(p => ({ ...p, nombreSede: s.nombre }))
  );

  const abrirNuevoPrograma = () =>
    setFormPrograma({ sedeId: sedes[0]?.id ?? '', nombre: '', descripcion: '', cupoMaximo: '', tieneTercero: false, nombreTercero: '' });

  const abrirEditarPrograma = (p) =>
    setFormPrograma({ id: p.id, sedeId: p.sedeId, nombre: p.nombre, descripcion: p.descripcion ?? '', cupoMaximo: p.cupoMaximo ?? '', tieneTercero: p.tieneTercero ?? false, nombreTercero: p.nombreTercero ?? '' });

  const handleGuardarPrograma = async () => {
    if (!formPrograma.nombre.trim() || !formPrograma.sedeId) return;
    setGuardandoProg(true);
    setErrForm('');
    const dto = {
      sedeId:        formPrograma.sedeId,
      nombre:        formPrograma.nombre.trim(),
      descripcion:   formPrograma.descripcion.trim() || null,
      cupoMaximo:    formPrograma.cupoMaximo ? Number(formPrograma.cupoMaximo) : null,
      tieneTercero:  formPrograma.tieneTercero,
      nombreTercero: formPrograma.tieneTercero ? (formPrograma.nombreTercero.trim() || null) : null,
    };
    const ok = await guardarPrograma(dto, formPrograma.id);
    if (ok) { setFormPrograma(null); }
    else     { setErrForm('No se pudo guardar el programa.'); }
    setGuardandoProg(false);
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
        <Dialog open onClose={() => setFormPrograma(null)} maxWidth="xs" fullWidth fullScreen={isMobile}
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
                <Grid size={12}>
                  <TextField fullWidth size="small" label="Nombre de la entidad ejecutora"
                    placeholder="Ej: Fundación XYZ, Empresa ABC…"
                    value={formPrograma.nombreTercero}
                    onChange={e => setFormPrograma(p => ({ ...p, nombreTercero: e.target.value }))} />
                </Grid>
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

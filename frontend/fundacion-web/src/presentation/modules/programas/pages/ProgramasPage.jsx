import { useState, useEffect } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, FormControlLabel,
  Grid, IconButton, InputLabel, MenuItem, Select, Snackbar, Switch,
  TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon        from '@mui/icons-material/Add';
import DeleteIcon     from '@mui/icons-material/Delete';
import EditIcon       from '@mui/icons-material/Edit';
import TuneIcon       from '@mui/icons-material/Tune';
import ArrowUpwardIcon   from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useSedes }          from '../../../../application/sedes/useSedes';
import { useProgramaCampos } from '../../../../application/programas/useProgramaCampos';

const COLOR = '#4E1B95';

const TIPOS_CAMPO = [
  { value: 'text',     label: 'Texto' },
  { value: 'number',   label: 'Número' },
  { value: 'date',     label: 'Fecha' },
  { value: 'select',   label: 'Selección' },
  { value: 'boolean',  label: 'Sí / No' },
  { value: 'document', label: 'Documento (PDF)' },
];

function chipEstado(activo) {
  return activo
    ? <Chip label="Activo"   size="small" color="success" />
    : <Chip label="Inactivo" size="small" color="default" />;
}

// ── Editor de campos de un programa ──────────────────────────────────────────

function EditorCamposDialog({ programa, onCerrar }) {
  const { campos, cargando, error, cargar, crearCampo, editarCampo, eliminarCampo } =
    useProgramaCampos(programa.id);

  const [formAbierto, setFormAbierto] = useState(false);
  const [editando,    setEditando]    = useState(null);
  const [guardando,   setGuardando]   = useState(false);
  const [toast,       setToast]       = useState('');

  const campoVacio = { etiqueta: '', tipo: 'text', obligatorio: false, opciones: '', seccion: '' };
  const [form, setForm] = useState(campoVacio);

  useEffect(() => { cargar(); }, [cargar]);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  // Secciones únicas ya usadas en este programa (para sugerencias)
  const seccionesExistentes = [...new Set(campos.map(c => c.seccion).filter(Boolean))];

  const abrirNuevo = () => { setForm(campoVacio); setEditando(null); setFormAbierto(true); };
  const abrirEditar = (c) => {
    setForm({
      etiqueta:    c.etiqueta,
      tipo:        c.tipo,
      obligatorio: c.obligatorio,
      opciones:    (c.opciones ?? []).join(', '),
      seccion:     c.seccion ?? '',
    });
    setEditando(c);
    setFormAbierto(true);
  };

  const handleGuardar = async () => {
    if (!form.etiqueta.trim()) return;
    setGuardando(true);
    try {
      const dto = {
        etiqueta:    form.etiqueta.trim(),
        tipo:        form.tipo,
        obligatorio: form.obligatorio,
        opciones:    form.tipo === 'select'
          ? form.opciones.split(',').map(o => o.trim()).filter(Boolean)
          : null,
        orden:   editando ? editando.orden : campos.length,
        seccion: form.seccion.trim() || null,
      };
      if (editando) {
        await editarCampo(editando.id, dto);
      } else {
        await crearCampo(dto);
      }
      setToast(editando ? 'Campo actualizado' : 'Campo creado');
      setFormAbierto(false);
    } catch {
      setToast('Error al guardar el campo');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await eliminarCampo(id);
      setToast('Campo eliminado');
    } catch {
      setToast('Error al eliminar');
    }
  };

  const mover = async (idx, direccion) => {
    const arr    = [...campos];
    const target = idx + direccion;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    try {
      await editarCampo(arr[idx].id,    { ...arr[idx],    orden: idx });
      await editarCampo(arr[target].id, { ...arr[target], orden: target });
    } catch { setToast('Error al reordenar'); }
  };

  return (
    <>
      <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ bgcolor: COLOR, color: 'white', fontWeight: 700 }}>
          Campos: {programa.nombre}
          <Typography variant="caption" display="block" sx={{ opacity: 0.75, fontWeight: 400 }}>
            {programa.nombreSede}
          </Typography>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {cargando ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress sx={{ color: COLOR }} />
            </Box>
          ) : campos.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={3}>
              Este programa no tiene campos configurados.
            </Typography>
          ) : (
            campos.map((c, idx) => {
              const sec     = c.seccion?.trim() || '';
              const prevSec = campos[idx - 1]?.seccion?.trim() || '';
              const showSec = sec && (idx === 0 || sec !== prevSec);
              return (
              <Box key={c.id}>
                {showSec && (
                  <Box display="flex" alignItems="center" gap={1} mt={idx > 0 ? 1.5 : 0} mb={0.5}>
                    <Typography variant="caption" fontWeight={800} color={COLOR}
                      sx={{ textTransform: 'uppercase', letterSpacing: 0.8,
                            bgcolor: '#ede7f6', px: 1.5, py: 0.3, borderRadius: 1 }}>
                      {sec}
                    </Typography>
                    <Box flex={1} sx={{ height: '1px', bgcolor: '#d0c4f7' }} />
                  </Box>
                )}
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                border: '1px solid #e2d9f3', borderRadius: 2,
                px: 1.5, py: 1, mb: 1, bgcolor: '#fdfbff',
              }}>
                <Box flex={1} minWidth={0}>
                  <Typography variant="body2" fontWeight={700} noWrap>{c.etiqueta}</Typography>
                  <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.3}>
                    <Chip label={TIPOS_CAMPO.find(t => t.value === c.tipo)?.label ?? c.tipo}
                      size="small" sx={{ bgcolor: '#ede7f6', color: COLOR, fontWeight: 600 }} />
                    {c.obligatorio && <Chip label="Requerido" size="small" color="warning" />}
                    {c.tipo === 'select' && c.opciones?.length > 0 && (
                      <Chip label={`${c.opciones.length} opciones`} size="small" variant="outlined" />
                    )}
                    {sec && <Chip label={sec} size="small" sx={{ bgcolor: '#f3f0ff', color: COLOR }} />}
                  </Box>
                </Box>
                <Tooltip title="Subir"><span>
                  <IconButton size="small" onClick={() => mover(idx, -1)} disabled={idx === 0}>
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                </span></Tooltip>
                <Tooltip title="Bajar"><span>
                  <IconButton size="small" onClick={() => mover(idx, 1)} disabled={idx === campos.length - 1}>
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                </span></Tooltip>
                <Tooltip title="Editar">
                  <IconButton size="small" onClick={() => abrirEditar(c)}>
                    <EditIcon fontSize="small" sx={{ color: COLOR }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Eliminar">
                  <IconButton size="small" onClick={() => handleEliminar(c.id)}>
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                </Tooltip>
              </Box>
              </Box>
            );})
          )}

          <Button fullWidth variant="outlined" startIcon={<AddIcon />}
            onClick={abrirNuevo} sx={{ mt: 1, color: COLOR, borderColor: COLOR }}>
            Agregar campo
          </Button>
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={onCerrar} variant="contained" sx={{ bgcolor: COLOR }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Formulario agregar / editar campo */}
      <Dialog open={formAbierto} onClose={() => setFormAbierto(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editando ? 'Editar campo' : 'Nuevo campo'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} mt={0}>
            <Grid size={12}>
              <TextField fullWidth size="small" label="Sección (opcional)"
                placeholder="Ej: Datos personales, Información académica…"
                value={form.seccion} onChange={set('seccion')}
                helperText={seccionesExistentes.length > 0
                  ? `Secciones existentes: ${seccionesExistentes.join(' · ')}`
                  : 'Agrupa campos bajo un mismo título de sección'} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth size="small" label="Etiqueta / Pregunta"
                value={form.etiqueta} onChange={set('etiqueta')} required />
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo</InputLabel>
                <Select label="Tipo" value={form.tipo} onChange={set('tipo')}>
                  {TIPOS_CAMPO.map(t => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {form.tipo === 'select' && (
              <Grid size={12}>
                <TextField fullWidth size="small" label="Opciones (separadas por coma)"
                  placeholder="Ej: Talla S, Talla M, Talla L"
                  value={form.opciones} onChange={set('opciones')} />
              </Grid>
            )}
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Switch checked={form.obligatorio}
                    onChange={e => setForm(p => ({ ...p, obligatorio: e.target.checked }))} />
                }
                label="Campo obligatorio"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={() => setFormAbierto(false)} disabled={guardando}>Cancelar</Button>
          <Button variant="contained" onClick={handleGuardar}
            disabled={guardando || !form.etiqueta.trim()}
            sx={{ bgcolor: COLOR }}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ProgramasPage() {
  const {
    sedes, cargando, error, toast, setToast, setError,
    guardarPrograma, togglePrograma, eliminarPrograma,
  } = useSedes();

  const [camposPrograma, setCamposPrograma] = useState(null);
  const [formPrograma,   setFormPrograma]   = useState(null);
  const [guardandoProg,  setGuardandoProg]  = useState(false);
  const [errForm,        setErrForm]        = useState('');

  const todosLosProgramas = sedes.flatMap(s =>
    (s.programas ?? []).map(p => ({ ...p, nombreSede: s.nombre }))
  );

  const abrirNuevoPrograma = () =>
    setFormPrograma({ sedeId: sedes[0]?.id ?? '', nombre: '', descripcion: '', cupoMaximo: '' });

  const abrirEditarPrograma = (p) =>
    setFormPrograma({ id: p.id, sedeId: p.sedeId, nombre: p.nombre, descripcion: p.descripcion ?? '', cupoMaximo: p.cupoMaximo ?? '' });

  const handleGuardarPrograma = async () => {
    if (!formPrograma.nombre.trim() || !formPrograma.sedeId) return;
    setGuardandoProg(true);
    setErrForm('');
    const dto = {
      sedeId:      formPrograma.sedeId,
      nombre:      formPrograma.nombre.trim(),
      descripcion: formPrograma.descripcion.trim() || null,
      cupoMaximo:  formPrograma.cupoMaximo ? Number(formPrograma.cupoMaximo) : null,
    };
    const ok = await guardarPrograma(dto, formPrograma.id);
    if (ok) { setFormPrograma(null); }
    else     { setErrForm('No se pudo guardar el programa.'); }
    setGuardandoProg(false);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight={800} color={COLOR}>Programas</Typography>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={abrirNuevoPrograma} disabled={sedes.length === 0}
          sx={{ bgcolor: COLOR }}>
          Nuevo programa
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {cargando ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress sx={{ color: COLOR }} />
        </Box>
      ) : todosLosProgramas.length === 0 ? (
        <Alert severity="info">
          No hay programas registrados. {sedes.length === 0 && 'Primero crea una sede.'}
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {todosLosProgramas.map(p => (
            <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{
                border: '1.5px solid #e2d9f3', borderRadius: 3,
                p: 2, bgcolor: '#fdfbff', height: '100%',
                display: 'flex', flexDirection: 'column', gap: 1,
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

                <Box display="flex" gap={1} flexWrap="wrap">
                  <Button size="small" variant="outlined" startIcon={<TuneIcon />}
                    onClick={() => setCamposPrograma(p)}
                    sx={{ color: COLOR, borderColor: COLOR, flex: 1 }}>
                    Campos
                  </Button>
                  <Tooltip title="Editar programa">
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

      {/* Editor de campos */}
      {camposPrograma && (
        <EditorCamposDialog
          programa={camposPrograma}
          onCerrar={() => setCamposPrograma(null)}
        />
      )}

      {/* Formulario programa */}
      {formPrograma && (
        <Dialog open onClose={() => setFormPrograma(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {formPrograma.id ? 'Editar programa' : 'Nuevo programa'}
          </DialogTitle>
          <DialogContent dividers>
            {errForm && <Alert severity="error" sx={{ mb: 2 }}>{errForm}</Alert>}
            <Grid container spacing={2} mt={0}>
              <Grid size={12}>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Sede</InputLabel>
                  <Select label="Sede" value={formPrograma.sedeId}
                    onChange={e => setFormPrograma(p => ({ ...p, sedeId: e.target.value }))}>
                    {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={12}>
                <TextField fullWidth size="small" label="Nombre del programa" required
                  value={formPrograma.nombre}
                  onChange={e => setFormPrograma(p => ({ ...p, nombre: e.target.value }))} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth size="small" label="Descripción" multiline rows={2}
                  value={formPrograma.descripcion}
                  onChange={e => setFormPrograma(p => ({ ...p, descripcion: e.target.value }))} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth size="small" label="Cupo máximo" type="number"
                  value={formPrograma.cupoMaximo}
                  onChange={e => setFormPrograma(p => ({ ...p, cupoMaximo: e.target.value }))} />
              </Grid>
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

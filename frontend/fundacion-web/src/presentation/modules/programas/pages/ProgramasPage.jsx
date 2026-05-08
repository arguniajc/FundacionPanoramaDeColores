import { useState, useEffect } from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, FormControlLabel,
  Grid, IconButton, InputAdornment, InputLabel, MenuItem, Select, Snackbar,
  Switch, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import AddIcon           from '@mui/icons-material/Add';
import DeleteIcon        from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon          from '@mui/icons-material/Edit';
import TuneIcon          from '@mui/icons-material/Tune';
import VisibilityIcon    from '@mui/icons-material/Visibility';
import ArrowUpwardIcon   from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSedes }          from '../../../../application/sedes/useSedes';
import { useProgramaCampos } from '../../../../application/programas/useProgramaCampos';

const COLOR = '#4E1B95';

const TIPOS_CAMPO = [
  { value: 'text',      label: 'Texto' },
  { value: 'number',    label: 'Número' },
  { value: 'date',      label: 'Fecha' },
  { value: 'daterange', label: 'Rango de fechas (Desde / Hasta)' },
  { value: 'altura',    label: 'Altura (cm)' },
  { value: 'edad',      label: 'Edad — auto del beneficiario' },
  { value: 'fecha_nac', label: 'Fecha de nacimiento — auto del beneficiario' },
  { value: 'select',    label: 'Selección' },
  { value: 'boolean',   label: 'Sí / No' },
  { value: 'document',  label: 'Documento (PDF)' },
];

function chipEstado(activo) {
  return activo
    ? <Chip label="Activo"   size="small" color="success" />
    : <Chip label="Inactivo" size="small" color="default" />;
}

// ── Helpers de ordenación ─────────────────────────────────────────────────────
const secDe          = (c) => c.seccion?.trim() || '';
const camposDeSeccion = (campos, sec) =>
  campos.filter(c => secDe(c) === sec).sort((a, b) => a.orden - b.orden);
const seccionesOrdenadas = (campos) => {
  const seen = new Map();
  for (const c of [...campos].sort((a, b) => a.orden - b.orden)) {
    const s = secDe(c);
    if (!seen.has(s)) seen.set(s, true);
  }
  return [...seen.keys()];
};
const toDto = (c, orden) => ({
  etiqueta: c.etiqueta, tipo: c.tipo, obligatorio: c.obligatorio,
  opciones: c.opciones, orden, seccion: c.seccion, columnas: c.columnas ?? 6,
});

// ── Vista previa: campo individual (deshabilitado) ────────────────────────────
function CampoPreview({ campo }) {
  const label = campo.etiqueta + (campo.obligatorio ? ' *' : '');
  const tipoLabel = TIPOS_CAMPO.find(t => t.value === campo.tipo)?.label ?? campo.tipo;

  if (campo.tipo === 'boolean') return (
    <FormControlLabel
      control={<Switch disabled size="small" />}
      label={<Typography variant="body2">{label}</Typography>}
    />
  );

  if (campo.tipo === 'select') return (
    <FormControl fullWidth size="small">
      <InputLabel shrink>{label}</InputLabel>
      <Select label={label} value="" disabled displayEmpty>
        <MenuItem value=""><em>Seleccionar…</em></MenuItem>
        {(campo.opciones ?? []).map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
      </Select>
    </FormControl>
  );

  if (campo.tipo === 'document') return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
        {label}
      </Typography>
      <Box display="flex" alignItems="center" gap={1}>
        <Chip label="Pendiente" color="warning" size="small" variant="outlined" />
        <Button variant="outlined" size="small" disabled sx={{ borderColor: '#ddd', color: '#aaa' }}>
          Seleccionar PDF
        </Button>
      </Box>
    </Box>
  );

  if (campo.tipo === 'daterange') return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
        {label}
      </Typography>
      <Box display="flex" gap={1} alignItems="center">
        <TextField size="small" label="Desde" type="date" disabled value=""
          slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
        <Typography variant="body2" color="text.secondary">—</Typography>
        <TextField size="small" label="Hasta" type="date" disabled value=""
          slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
      </Box>
    </Box>
  );

  if (campo.tipo === 'altura') return (
    <TextField fullWidth size="small" label={label} type="number" disabled value=""
      slotProps={{ input: { endAdornment: <InputAdornment position="end">cm</InputAdornment> } }}
    />
  );
  if (campo.tipo === 'edad') return (
    <TextField fullWidth size="small" label={label} type="number" disabled value=""
      helperText={`Tipo: ${tipoLabel}`}
      slotProps={{ input: { endAdornment: <InputAdornment position="end">años</InputAdornment> } }}
    />
  );
  if (campo.tipo === 'fecha_nac') return (
    <TextField fullWidth size="small" label={label} type="date" disabled value=""
      helperText={`Tipo: ${tipoLabel}`}
      slotProps={{ inputLabel: { shrink: true } }}
    />
  );

  return (
    <TextField fullWidth size="small" label={label} disabled value=""
      type={campo.tipo === 'number' ? 'number' : campo.tipo === 'date' ? 'date' : 'text'}
      slotProps={campo.tipo === 'date' ? { inputLabel: { shrink: true } } : undefined}
    />
  );
}

// ── Dialog de vista previa ────────────────────────────────────────────────────
function VistaPreviewDialog({ campos, programa, onCerrar }) {
  const secciones = seccionesOrdenadas(campos);
  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ bgcolor: COLOR, color: 'white', py: 1.5 }}>
        <Typography fontWeight={700}>Vista previa del formulario</Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>{programa.nombre} · {programa.nombreSede}</Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        {campos.length === 0 ? (
          <Alert severity="info">No hay campos configurados aún.</Alert>
        ) : (
          <Box>
            {secciones.map((sec, si) => {
              const grp = camposDeSeccion(campos, sec);
              return (
                <Box key={sec || '_root'} mb={si < secciones.length - 1 ? 3 : 0}>
                  {sec && (
                    <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                      <Typography variant="caption" fontWeight={800} color={COLOR}
                        sx={{ textTransform: 'uppercase', letterSpacing: 0.9,
                              bgcolor: '#ede7f6', px: 1.5, py: 0.4, borderRadius: 1, flexShrink: 0 }}>
                        {sec}
                      </Typography>
                      <Box flex={1} sx={{ height: '1.5px', bgcolor: '#d0c4f7' }} />
                    </Box>
                  )}
                  <Grid container spacing={2}>
                    {grp.map(c => (
                      <Grid key={c.id}
                        size={(c.tipo === 'document' || c.tipo === 'daterange') ? 12 : { xs: 12, sm: c.columnas ?? 6 }}>
                        <CampoPreview campo={c} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onCerrar} variant="contained" sx={{ bgcolor: COLOR }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Fila sortable de un campo ─────────────────────────────────────────────────
function SortableCampoRow({ campo, ci, grupoLength, onEditar, onEliminar, onAncho, reordenando }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: campo.id });

  const tipoLabel = TIPOS_CAMPO.find(t => t.value === campo.tipo)?.label ?? campo.tipo;
  const esFull    = (campo.columnas ?? 6) === 12;

  return (
    <Box ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 'auto' }}
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.8,
        bgcolor: isDragging ? '#ede7f6' : ci % 2 === 0 ? '#fdfbff' : '#f8f5ff',
        borderBottom: ci < grupoLength - 1 ? '1px solid #ede7f6' : 'none',
        boxShadow: isDragging ? '0 4px 14px rgba(78,27,149,.18)' : 'none',
        borderRadius: isDragging ? 1 : 0,
      }}>
      {/* Drag handle */}
      <Box {...attributes} {...listeners}
        sx={{ cursor: isDragging ? 'grabbing' : 'grab', color: '#ccc',
              display: 'flex', alignItems: 'center', touchAction: 'none', flexShrink: 0 }}>
        <DragIndicatorIcon fontSize="small" />
      </Box>

      {/* Info del campo */}
      <Box flex={1} minWidth={0}>
        <Typography variant="body2" fontWeight={700} noWrap>{campo.etiqueta}</Typography>
        <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.2}>
          <Chip label={tipoLabel} size="small"
            sx={{ bgcolor: '#ede7f6', color: COLOR, fontWeight: 600, height: 18, fontSize: 10 }} />
          {campo.obligatorio && (
            <Chip label="Req." size="small" color="warning" sx={{ height: 18, fontSize: 10 }} />
          )}
          <Chip label={esFull ? '← fila completa →' : '⬛ media fila'}
            size="small" variant="outlined"
            sx={{ height: 18, fontSize: 10, color: '#888', borderColor: '#ddd' }} />
        </Box>
      </Box>

      {/* Toggle ancho */}
      <Tooltip title={esFull ? 'Cambiar a media fila (½)' : 'Cambiar a fila completa'}>
        <IconButton size="small" disabled={reordenando} onClick={() => onAncho(campo)}
          sx={{ fontSize: 13, fontWeight: 800, color: esFull ? COLOR : '#bbb',
                border: '1px solid', borderColor: esFull ? COLOR : '#e0d9f3',
                borderRadius: 1, px: 0.7, py: 0.2, minWidth: 0 }}>
          {esFull ? '□' : '½'}
        </IconButton>
      </Tooltip>

      <Tooltip title="Editar">
        <IconButton size="small" onClick={() => onEditar(campo)}>
          <EditIcon fontSize="small" sx={{ color: COLOR }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Eliminar">
        <IconButton size="small" onClick={() => onEliminar(campo.id)}>
          <DeleteIcon fontSize="small" color="error" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// ── Editor de campos de un programa ──────────────────────────────────────────
function EditorCamposDialog({ programa, onCerrar }) {
  const { campos, cargando, error, cargar, crearCampo, editarCampo, eliminarCampo } =
    useProgramaCampos(programa.id);

  const [formAbierto,  setFormAbierto]  = useState(false);
  const [editando,     setEditando]     = useState(null);
  const [guardando,    setGuardando]    = useState(false);
  const [reordenando,  setReordenando]  = useState(false);
  const [toast,        setToast]        = useState('');
  const [preview,      setPreview]      = useState(false);

  const campoVacio = { seccion: '', etiqueta: '', tipo: 'text', obligatorio: false, opciones: '', columnas: 6 };
  const [form, setForm] = useState(campoVacio);

  useEffect(() => { cargar(); }, [cargar]);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const seccionesExistentes = seccionesOrdenadas(campos);
  const seccionDigitada     = form.seccion.trim();
  const seccionSimilar      = seccionesExistentes.find(
    s => s.toLowerCase() === seccionDigitada.toLowerCase() && s !== seccionDigitada
  ) ?? null;

  const abrirNuevo = () => {
    setForm({ ...campoVacio, seccion: seccionesExistentes[seccionesExistentes.length - 1] ?? '' });
    setEditando(null);
    setFormAbierto(true);
  };
  const abrirEditar = (c) => {
    setForm({
      seccion:     c.seccion ?? '',
      etiqueta:    c.etiqueta,
      tipo:        c.tipo,
      obligatorio: c.obligatorio,
      opciones:    (c.opciones ?? []).join(', '),
      columnas:    c.columnas ?? 6,
    });
    setEditando(c);
    setFormAbierto(true);
  };

  const handleGuardar = async () => {
    if (!form.seccion.trim() || !form.etiqueta.trim()) return;
    setGuardando(true);
    try {
      const dto = {
        seccion:     form.seccion.trim(),
        etiqueta:    form.etiqueta.trim(),
        tipo:        form.tipo,
        obligatorio: form.obligatorio,
        columnas:    form.columnas,
        opciones:    form.tipo === 'select'
          ? form.opciones.split(',').map(o => o.trim()).filter(Boolean)
          : null,
        orden: editando ? editando.orden : campos.length,
      };
      if (editando) await editarCampo(editando.id, dto);
      else          await crearCampo(dto);
      setToast(editando ? 'Campo actualizado' : 'Campo creado');
      setFormAbierto(false);
    } catch {
      setToast('Error al guardar el campo');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    try { await eliminarCampo(id); setToast('Campo eliminado'); }
    catch { setToast('Error al eliminar'); }
  };

  // ── Drag & drop — reordenar dentro de una sección ────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event, secNombre) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const grupo   = camposDeSeccion(campos, secNombre);
    const oldIdx  = grupo.findIndex(c => c.id === active.id);
    const newIdx  = grupo.findIndex(c => c.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reord   = arrayMove(grupo, oldIdx, newIdx);
    const ordenes = grupo.map(c => c.orden).sort((a, b) => a - b);
    const updates = reord
      .map((c, i) => ({ campo: c, ord: ordenes[i] }))
      .filter(({ campo, ord }) => campo.orden !== ord);
    if (!updates.length) return;
    setReordenando(true);
    try {
      for (const { campo, ord } of updates)
        await editarCampo(campo.id, toDto(campo, ord));
    } catch { setToast('Error al reordenar'); }
    finally   { setReordenando(false); }
  };

  // ── Mover sección completa ────────────────────────────────────────────────────
  const moverSeccion = async (secNombre, dir) => {
    setReordenando(true);
    const secciones = seccionesOrdenadas(campos);
    const idx = secciones.indexOf(secNombre);
    const tgt = idx + dir;
    if (tgt < 0 || tgt >= secciones.length) { setReordenando(false); return; }
    const cA   = camposDeSeccion(campos, secciones[idx]);
    const cB   = camposDeSeccion(campos, secciones[tgt]);
    const ords = [...cA, ...cB].map(c => c.orden).sort((a, b) => a - b);
    const [primero, segundo] = dir < 0 ? [cA, cB] : [cB, cA];
    const updates = [
      ...primero.map((c, i) => ({ campo: c, orden: ords[i] })),
      ...segundo.map((c, i) => ({ campo: c, orden: ords[primero.length + i] })),
    ].filter(({ campo, orden }) => campo.orden !== orden);
    try {
      for (const { campo, orden } of updates)
        await editarCampo(campo.id, toDto(campo, orden));
    } catch { setToast('Error al reordenar sección'); }
    finally   { setReordenando(false); }
  };

  // ── Cambiar ancho del campo ────────────────────────────────────────────────
  const cambiarAncho = async (campo) => {
    const nuevoCols = (campo.columnas ?? 6) === 6 ? 12 : 6;
    try {
      await editarCampo(campo.id, { ...toDto(campo, campo.orden), columnas: nuevoCols });
      setToast(nuevoCols === 12 ? 'Ancho: fila completa' : 'Ancho: media fila');
    } catch { setToast('Error al cambiar ancho'); }
  };

  const secciones = seccionesOrdenadas(campos);

  return (
    <>
      <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ bgcolor: COLOR, color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
          <Box flex={1}>
            Campos: {programa.nombre}
            <Typography variant="caption" display="block" sx={{ opacity: 0.75, fontWeight: 400 }}>
              {programa.nombreSede}
            </Typography>
          </Box>
          <Tooltip title="Vista previa del formulario">
            <IconButton onClick={() => setPreview(true)} sx={{ color: 'white' }}>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
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
            <Box>
              {secciones.map((sec, si) => {
                const grupo = camposDeSeccion(campos, sec);
                return (
                  <Box key={sec || '_root'} sx={{ mb: 2 }}>
                    {/* Encabezado de sección con ↑↓ */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5,
                               bgcolor: COLOR, borderRadius: '8px 8px 0 0', px: 1.5, py: 0.8 }}>
                      <Typography variant="caption" fontWeight={800} color="white"
                        sx={{ textTransform: 'uppercase', letterSpacing: 1, flex: 1 }}>
                        {sec || '(sin sección)'}
                      </Typography>
                      <Tooltip title="Subir sección"><span>
                        <IconButton size="small" disabled={si === 0 || reordenando}
                          onClick={() => moverSeccion(sec, -1)}
                          sx={{ color: 'white', '&.Mui-disabled': { color: 'rgba(255,255,255,.3)' } }}>
                          <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </span></Tooltip>
                      <Tooltip title="Bajar sección"><span>
                        <IconButton size="small" disabled={si === secciones.length - 1 || reordenando}
                          onClick={() => moverSeccion(sec, 1)}
                          sx={{ color: 'white', '&.Mui-disabled': { color: 'rgba(255,255,255,.3)' } }}>
                          <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </span></Tooltip>
                    </Box>

                    {/* Campos arrastrables */}
                    <Box sx={{ border: '1px solid #e2d9f3', borderTop: 'none',
                               borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                      <DndContext sensors={sensors} collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEnd(e, sec)}>
                        <SortableContext items={grupo.map(c => c.id)}
                          strategy={verticalListSortingStrategy}>
                          {grupo.map((c, ci) => (
                            <SortableCampoRow key={c.id}
                              campo={c} ci={ci} grupoLength={grupo.length}
                              onEditar={abrirEditar}
                              onEliminar={handleEliminar}
                              onAncho={cambiarAncho}
                              reordenando={reordenando} />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}

          <Button fullWidth variant="outlined" startIcon={<AddIcon />}
            onClick={abrirNuevo} sx={{ mt: 1, color: COLOR, borderColor: COLOR }}>
            Agregar campo
          </Button>
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5, gap: 1 }}>
          <Button variant="outlined" startIcon={<VisibilityIcon />}
            onClick={() => setPreview(true)}
            sx={{ color: COLOR, borderColor: COLOR }}>
            Vista previa
          </Button>
          <Box flex={1} />
          <Button onClick={onCerrar} variant="contained" sx={{ bgcolor: COLOR }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Vista previa */}
      {preview && (
        <VistaPreviewDialog campos={campos} programa={programa} onCerrar={() => setPreview(false)} />
      )}

      {/* Formulario agregar / editar campo */}
      <Dialog open={formAbierto} onClose={() => setFormAbierto(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editando ? 'Editar campo' : 'Nuevo campo'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} mt={0}>
            {/* Sección — obligatoria */}
            <Grid size={12}>
              <Autocomplete freeSolo options={seccionesExistentes}
                value={form.seccion}
                onInputChange={(_, val) => setForm(p => ({ ...p, seccion: val ?? '' }))}
                onChange={(_, val)      => setForm(p => ({ ...p, seccion: val ?? '' }))}
                renderInput={(params) => (
                  <TextField {...params} fullWidth size="small" label="Sección *" required
                    placeholder="Selecciona una existente o escribe una nueva…"
                    error={seccionSimilar !== null || (seccionDigitada === '' && guardando)}
                    helperText={
                      seccionSimilar !== null
                        ? `Ya existe "${seccionSimilar}" — selecciónala del listado`
                        : seccionesExistentes.length > 0
                          ? 'Selecciona una existente o escribe el nombre de una nueva'
                          : 'Escribe el nombre de la primera sección'
                    }
                  />
                )}
              />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth size="small" label="Etiqueta / Pregunta *" required
                value={form.etiqueta} onChange={set('etiqueta')} />
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de campo</InputLabel>
                <Select label="Tipo de campo" value={form.tipo} onChange={set('tipo')}>
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
            {/* Ancho del campo */}
            <Grid size={12}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
                Ancho en el formulario
              </Typography>
              <ToggleButtonGroup exclusive size="small"
                value={form.columnas}
                onChange={(_, v) => { if (v !== null) setForm(p => ({ ...p, columnas: v })); }}>
                <ToggleButton value={6} sx={{ px: 2, fontSize: 12 }}>
                  ½ Media fila
                </ToggleButton>
                <ToggleButton value={12} sx={{ px: 2, fontSize: 12 }}>
                  □ Fila completa
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
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
            disabled={guardando || !form.etiqueta.trim() || !seccionDigitada || seccionSimilar !== null}
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

      {camposPrograma && (
        <EditorCamposDialog
          programa={camposPrograma}
          onCerrar={() => setCamposPrograma(null)}
        />
      )}

      {formPrograma && (
        <Dialog open onClose={() => setFormPrograma(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {formPrograma.id ? 'Editar programa' : 'Nuevo programa'}
          </DialogTitle>
          <DialogContent dividers>
            {errForm && <Alert severity="error" sx={{ mb: 2 }}>{errForm}</Alert>}
            <Grid container spacing={2} mt={0}>
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

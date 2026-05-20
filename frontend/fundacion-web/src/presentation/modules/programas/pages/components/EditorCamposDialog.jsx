import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Alert, Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, FormControlLabel, Grid, IconButton,
  InputLabel, ListSubheader, MenuItem, Select, Snackbar, Switch, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import AddIcon          from '@mui/icons-material/Add';
import VisibilityIcon   from '@mui/icons-material/Visibility';
import ArrowUpwardIcon  from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useProgramaCampos } from '../../../../../application/programas/useProgramaCampos';
import {
  COLOR, TIPOS_CAMPO, camposDeSeccion, seccionesOrdenadas, toDto,
} from './helpers';
import { SortableCampoRow }   from './SortableCampoRow';
import { VistaPreviewDialog } from './VistaPreviewDialog';

export function EditorCamposDialog({ programa, onCerrar }) {
  const { campos: camposServidor, cargando, error, cargar, crearCampo, editarCampo, eliminarCampo } =
    useProgramaCampos(programa.id);

  const [camposLocal,  setCamposLocal]  = useState([]);
  const [camposOrig,   setCamposOrig]   = useState([]);
  const loadedRef = useRef(false);
  const tempRef   = useRef(0);

  const [formAbierto, setFormAbierto] = useState(false);
  const [editando,    setEditando]    = useState(null);
  const [guardando,   setGuardando]   = useState(false);
  const [toast,       setToast]       = useState('');
  const [preview,     setPreview]     = useState(false);
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const campoVacio = { seccion: '', etiqueta: '', tipo: 'text', obligatorio: false, opciones: '', columnas: 6 };
  const [form, setForm] = useState(campoVacio);

  useEffect(() => { cargar(); }, [cargar]);

  const wasLoadingRef = useRef(false);

  useEffect(() => {
    if (cargando) { wasLoadingRef.current = true; return; }
    if (!wasLoadingRef.current || loadedRef.current) return;
    loadedRef.current = true;
    const secs = seccionesOrdenadas(camposServidor);
    let ord = 0;
    const map = new Map(camposServidor.map(c => [c.id, { ...c }]));
    for (const sec of secs)
      for (const c of camposDeSeccion(camposServidor, sec))
        map.get(c.id).orden = ord++;
    const normalized = [...map.values()].sort((a, b) => a.orden - b.orden);
    setCamposLocal(normalized);
    setCamposOrig(normalized.map(c => ({ ...c })));
  }, [cargando, camposServidor]);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const seccionesExistentes = seccionesOrdenadas(camposLocal);
  const seccionDigitada     = form.seccion.trim();
  const seccionSimilar      = seccionesExistentes.find(
    s => s.toLowerCase() === seccionDigitada.toLowerCase() && s !== seccionDigitada
  ) ?? null;

  const hayPendientes = useMemo(() => {
    if (!loadedRef.current) return false;
    if (camposLocal.some(c => c._isNew)) return true;
    const localRealIds = new Set(camposLocal.filter(c => !c._isNew).map(c => c.id));
    if (camposOrig.some(c => !localRealIds.has(c.id))) return true;
    const origById = new Map(camposOrig.map(c => [c.id, c]));
    for (const l of camposLocal) {
      if (l._isNew) continue;
      const o = origById.get(l.id);
      if (o && JSON.stringify(toDto(l, l.orden)) !== JSON.stringify(toDto(o, o.orden))) return true;
    }
    return false;
  }, [camposLocal, camposOrig]);

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

  const handleCampoFormGuardar = () => {
    if (!form.seccion.trim() || !form.etiqueta.trim()) return;
    const seccion = form.seccion.trim();
    const dto = {
      seccion,
      etiqueta:    form.etiqueta.trim(),
      tipo:        form.tipo,
      obligatorio: form.obligatorio,
      columnas:    form.columnas,
      opciones:    form.tipo === 'select'
        ? form.opciones.split(',').map(o => o.trim()).filter(Boolean)
        : null,
    };
    if (editando) {
      setCamposLocal(prev => prev.map(c => c.id === editando.id ? { ...c, ...dto } : c));
    } else {
      setCamposLocal(prev => {
        const enSeccion = camposDeSeccion(prev, seccion);
        let orden, base;
        if (enSeccion.length > 0) {
          const max = Math.max(...enSeccion.map(c => c.orden));
          orden = max + 1;
          base  = prev.map(c => c.orden >= orden && c.seccion !== seccion ? { ...c, orden: c.orden + 1 } : c);
        } else {
          orden = prev.length > 0 ? Math.max(...prev.map(c => c.orden)) + 1 : 0;
          base  = prev;
        }
        return [...base, { ...dto, id: `_temp_${++tempRef.current}`, _isNew: true, orden }]
          .sort((a, b) => a.orden - b.orden);
      });
    }
    setFormAbierto(false);
  };

  const handleEliminar = (id) => {
    setCamposLocal(prev => prev.filter(c => c.id !== id));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event, secNombre) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const grupo   = camposDeSeccion(camposLocal, secNombre);
    const oldIdx  = grupo.findIndex(c => c.id === active.id);
    const newIdx  = grupo.findIndex(c => c.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reord   = arrayMove(grupo, oldIdx, newIdx);
    const ordenes = grupo.map(c => c.orden).sort((a, b) => a - b);
    const idToOrd = new Map(reord.map((c, i) => [c.id, ordenes[i]]));
    setCamposLocal(prev =>
      prev.map(c => idToOrd.has(c.id) ? { ...c, orden: idToOrd.get(c.id) } : c)
        .sort((a, b) => a.orden - b.orden)
    );
  };

  const moverSeccion = (secNombre, dir) => {
    const secs = seccionesOrdenadas(camposLocal);
    const idx  = secs.indexOf(secNombre);
    const tgt  = idx + dir;
    if (tgt < 0 || tgt >= secs.length) return;
    const cA   = camposDeSeccion(camposLocal, secs[idx]);
    const cB   = camposDeSeccion(camposLocal, secs[tgt]);
    const ords = [...cA, ...cB].map(c => c.orden).sort((a, b) => a - b);
    const [primero, segundo] = dir < 0 ? [cA, cB] : [cB, cA];
    const idToOrd = new Map([
      ...primero.map((c, i) => [c.id, ords[i]]),
      ...segundo.map((c, i) => [c.id, ords[primero.length + i]]),
    ]);
    setCamposLocal(prev =>
      prev.map(c => idToOrd.has(c.id) ? { ...c, orden: idToOrd.get(c.id) } : c)
        .sort((a, b) => a.orden - b.orden)
    );
  };

  const cambiarAncho = (campo) => {
    const nuevoCols = (campo.columnas ?? 6) === 6 ? 12 : 6;
    setCamposLocal(prev => prev.map(c => c.id === campo.id ? { ...c, columnas: nuevoCols } : c));
  };

  const handleGuardarTodo = async () => {
    setGuardando(true);
    try {
      const origById     = new Map(camposOrig.map(c => [c.id, c]));
      const localRealIds = new Set(camposLocal.filter(c => !c._isNew).map(c => c.id));

      for (const orig of camposOrig)
        if (!localRealIds.has(orig.id)) await eliminarCampo(orig.id);

      for (const local of camposLocal) {
        if (local._isNew) continue;
        const orig = origById.get(local.id);
        if (orig && JSON.stringify(toDto(local, local.orden)) !== JSON.stringify(toDto(orig, orig.orden)))
          await editarCampo(local.id, toDto(local, local.orden));
      }

      const tempToReal = new Map();
      for (const local of camposLocal) {
        if (!local._isNew) continue;
        const data = await crearCampo(toDto(local, local.orden));
        tempToReal.set(local.id, data);
      }

      const nuevosLocal = camposLocal.map(c => (!c._isNew ? c : (tempToReal.get(c.id) ?? c)));
      setCamposLocal(nuevosLocal);
      setCamposOrig(nuevosLocal.map(c => ({ ...c })));
      setToast('Cambios guardados correctamente');
    } catch {
      setToast('Error al guardar los cambios');
    } finally {
      setGuardando(false);
    }
  };

  const secciones = seccionesOrdenadas(camposLocal);

  return (
    <>
      <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}>
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

        <DialogContent dividers sx={{ p: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}
          {hayPendientes && (
            <Alert severity="warning" sx={{ mb: 2 }} icon={false}>
              Tienes cambios sin guardar — pulsa <strong>Guardar</strong> para aplicarlos.
            </Alert>
          )}

          {cargando ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress sx={{ color: COLOR }} />
            </Box>
          ) : camposLocal.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={3}>
              Este programa no tiene campos configurados.
            </Typography>
          ) : (
            <Box>
              {secciones.map((sec, si) => {
                const grupo = camposDeSeccion(camposLocal, sec);
                return (
                  <Box key={sec || '_root'} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5,
                               bgcolor: COLOR, borderRadius: '8px 8px 0 0', px: 1.5, py: 0.8 }}>
                      <Typography variant="caption" fontWeight={800} color="white"
                        sx={{ textTransform: 'uppercase', letterSpacing: 1, flex: 1 }}>
                        {sec || '(sin sección)'}
                      </Typography>
                      <Tooltip title="Subir sección"><span>
                        <IconButton size="small" disabled={si === 0}
                          onClick={() => moverSeccion(sec, -1)}
                          sx={{ color: 'white', '&.Mui-disabled': { color: 'rgba(255,255,255,.3)' } }}>
                          <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </span></Tooltip>
                      <Tooltip title="Bajar sección"><span>
                        <IconButton size="small" disabled={si === secciones.length - 1}
                          onClick={() => moverSeccion(sec, 1)}
                          sx={{ color: 'white', '&.Mui-disabled': { color: 'rgba(255,255,255,.3)' } }}>
                          <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </span></Tooltip>
                    </Box>

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
                              reordenando={false} />
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
          <Button onClick={onCerrar} disabled={guardando}>Cerrar</Button>
          <Button variant="contained" onClick={handleGuardarTodo}
            disabled={guardando || !hayPendientes}
            sx={{ bgcolor: COLOR, minWidth: 110 }}>
            {guardando ? 'Guardando…' : hayPendientes ? 'Guardar *' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {preview && (
        <VistaPreviewDialog campos={camposLocal} programa={programa} onCerrar={() => setPreview(false)} />
      )}

      <Dialog open={formAbierto} onClose={() => setFormAbierto(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editando ? 'Editar campo' : 'Nuevo campo'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2.5} mt={0}>
            <Grid size={12}>
              <Autocomplete freeSolo options={seccionesExistentes}
                value={form.seccion}
                onInputChange={(_, val) => setForm(p => ({ ...p, seccion: val ?? '' }))}
                onChange={(_, val)      => setForm(p => ({ ...p, seccion: val ?? '' }))}
                renderInput={(params) => (
                  <TextField {...params} fullWidth size="small" label="Sección *" required
                    placeholder="Selecciona una existente o escribe una nueva…"
                    error={seccionSimilar !== null}
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
                  {TIPOS_CAMPO.map((t, i) => t._h
                    ? <ListSubheader key={`h-${i}`}>{t.label}</ListSubheader>
                    : <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  )}
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
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
                Ancho en el formulario
              </Typography>
              <ToggleButtonGroup exclusive size="small"
                value={form.columnas}
                onChange={(_, v) => { if (v !== null) setForm(p => ({ ...p, columnas: v })); }}>
                <ToggleButton value={6} sx={{ px: 2, fontSize: 12 }}>½ Media fila</ToggleButton>
                <ToggleButton value={12} sx={{ px: 2, fontSize: 12 }}>□ Fila completa</ToggleButton>
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
          <Button onClick={() => setFormAbierto(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCampoFormGuardar}
            disabled={!form.etiqueta.trim() || !seccionDigitada || seccionSimilar !== null}
            sx={{ bgcolor: COLOR }}>
            {editando ? 'Actualizar' : 'Agregar'}
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

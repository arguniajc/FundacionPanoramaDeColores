import { useState, useEffect } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, FormControlLabel,
  Grid, IconButton, InputLabel, MenuItem, Select, Snackbar, Switch,
  TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon           from '@mui/icons-material/Add';
import DeleteIcon        from '@mui/icons-material/Delete';
import EditIcon          from '@mui/icons-material/Edit';
import TuneIcon          from '@mui/icons-material/Tune';
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

// ── Helpers de ordenación ─────────────────────────────────────────────────────

// Nombre de sección de un campo (vacío = sin sección asignada)
const secDe = (c) => c.seccion?.trim() || '';

// Campos de una sección ordenados por orden
const camposDeSeccion = (campos, sec) =>
  campos.filter(c => secDe(c) === sec).sort((a, b) => a.orden - b.orden);

// Secciones únicas en el orden en que aparecen (por el menor orden de sus campos)
const seccionesOrdenadas = (campos) => {
  const seen = new Map();
  for (const c of [...campos].sort((a, b) => a.orden - b.orden)) {
    const s = secDe(c);
    if (!seen.has(s)) seen.set(s, true);
  }
  return [...seen.keys()];
};

// DTO mínimo para editar un campo
const toDto = (c, orden) => ({
  etiqueta: c.etiqueta, tipo: c.tipo, obligatorio: c.obligatorio,
  opciones: c.opciones, orden, seccion: c.seccion,
});

// ── Editor de campos de un programa ──────────────────────────────────────────

function EditorCamposDialog({ programa, onCerrar }) {
  const { campos, cargando, error, cargar, crearCampo, editarCampo, eliminarCampo } =
    useProgramaCampos(programa.id);

  const [formAbierto,  setFormAbierto]  = useState(false);
  const [editando,     setEditando]     = useState(null);
  const [guardando,    setGuardando]    = useState(false);
  const [reordenando,  setReordenando]  = useState(false);
  const [toast,        setToast]        = useState('');

  const campoVacio = { seccion: '', etiqueta: '', tipo: 'text', obligatorio: false, opciones: '' };
  const [form, setForm] = useState(campoVacio);

  useEffect(() => { cargar(); }, [cargar]);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const seccionesExistentes = seccionesOrdenadas(campos);

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

  // ── Mover campo dentro de su sección ────────────────────────────────────────
  const moverCampo = async (campo, dir) => {
    setReordenando(true);
    const sec   = secDe(campo);
    const grupo = camposDeSeccion(campos, sec);
    const idx   = grupo.findIndex(c => c.id === campo.id);
    const tgt   = idx + dir;
    if (tgt < 0 || tgt >= grupo.length) return;
    const otro  = grupo[tgt];
    try {
      await editarCampo(campo.id, toDto(campo, otro.orden));
      await editarCampo(otro.id,  toDto(otro,  campo.orden));
    } catch { setToast('Error al reordenar'); }
    finally   { setReordenando(false); }
  };

  // ── Mover sección completa (intercambia bloques de campos) ──────────────────
  const moverSeccion = async (secNombre, dir) => {
    setReordenando(true);
    const secciones = seccionesOrdenadas(campos);
    const idx = secciones.indexOf(secNombre);
    const tgt = idx + dir;
    if (tgt < 0 || tgt >= secciones.length) { setReordenando(false); return; }

    const secA = secciones[idx];   // sección que se mueve
    const secB = secciones[tgt];   // sección vecina

    const cA = camposDeSeccion(campos, secA);
    const cB = camposDeSeccion(campos, secB);

    // Reunir todos los orden-values que usan los dos grupos, ordenados
    const ords = [...cA, ...cB].map(c => c.orden).sort((a, b) => a - b);

    // El grupo que queda "primero" toma los menores ords
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

  const secciones = seccionesOrdenadas(campos);

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
            <Box>
              {secciones.map((sec, si) => {
                const grupo = camposDeSeccion(campos, sec);
                return (
                  <Box key={sec || '_root'} sx={{ mb: 2 }}>
                    {/* ── Encabezado de sección ── */}
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 0.5,
                      bgcolor: COLOR, borderRadius: '8px 8px 0 0', px: 1.5, py: 0.8,
                    }}>
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

                    {/* ── Campos de la sección ── */}
                    <Box sx={{ border: '1px solid #e2d9f3', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                      {grupo.map((c, ci) => (
                        <Box key={c.id} sx={{
                          display: 'flex', alignItems: 'center', gap: 0.5,
                          px: 1.5, py: 1,
                          bgcolor: ci % 2 === 0 ? '#fdfbff' : '#f8f5ff',
                          borderBottom: ci < grupo.length - 1 ? '1px solid #ede7f6' : 'none',
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
                            </Box>
                          </Box>

                          {/* Flechas de reordenación dentro de la sección */}
                          <Tooltip title="Subir campo"><span>
                            <IconButton size="small" disabled={ci === 0 || reordenando}
                              onClick={() => moverCampo(c, -1)}>
                              <ArrowUpwardIcon fontSize="small" />
                            </IconButton>
                          </span></Tooltip>
                          <Tooltip title="Bajar campo"><span>
                            <IconButton size="small" disabled={ci === grupo.length - 1 || reordenando}
                              onClick={() => moverCampo(c, 1)}>
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
                      ))}
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
            {/* Sección — obligatoria */}
            <Grid size={12}>
              <TextField fullWidth size="small" label="Sección *" required
                placeholder="Ej: Datos personales, Información académica…"
                value={form.seccion} onChange={set('seccion')}
                error={form.seccion.trim() === '' && guardando}
                helperText={
                  seccionesExistentes.length > 0
                    ? `Secciones existentes: ${seccionesExistentes.join(' · ')}`
                    : 'Todos los campos deben pertenecer a una sección'
                } />
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
            disabled={guardando || !form.etiqueta.trim() || !form.seccion.trim()}
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

import { useState, useEffect, Children, memo } from 'react';
import {
  Box, Typography, Button, Avatar, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  FormControl, InputLabel, Select, MenuItem, Autocomplete, TextField, CircularProgress,
} from '@mui/material';
import AddIcon          from '@mui/icons-material/Add';
import EditIcon         from '@mui/icons-material/Edit';
import DeleteIcon       from '@mui/icons-material/Delete';
import SaveIcon         from '@mui/icons-material/Save';
import AccountTreeIcon  from '@mui/icons-material/AccountTree';
import { useConfirm }   from '@/shared/components/ConfirmDialog';
import apiClient        from '@/infrastructure/http/apiClient';
import { CARGOS_COMUNES } from './DialogEmpleado';
import { BRAND_COLOR } from '@/shared/constants/brand';
import { useAsyncData } from '@/shared/hooks/useAsyncData';

const LCOLOR       = '#94A3B8';
const DEPTH_COLORS = ['#1E1B4B',BRAND_COLOR,'#7C3AED','#2563EB','#0891B2','#059669','#D97706','#DC2626'];
const depthColor   = (d) => DEPTH_COLORS[Math.min(d, DEPTH_COLORS.length - 1)];

function VLine({ h = 28 }) {
  return <Box sx={{ width: 2, height: h, bgcolor: LCOLOR, mx: 'auto', flexShrink: 0 }} />;
}

function HBranch({ children }) {
  const arr = Children.toArray(children);
  if (!arr.length) return null;
  if (arr.length === 1) return arr[0];
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
      {arr.map((child, i) => {
        const first = i === 0, last = i === arr.length - 1;
        return (
          <Box key={i} sx={{
            minWidth: 172,
            px: 0.5,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            position: 'relative', pt: '32px',
            '&::before': first ? {} : { content: '""', position: 'absolute', top: 0, left: 0, right: '50%', height: 2, bgcolor: LCOLOR },
            '&::after':  last  ? {} : { content: '""', position: 'absolute', top: 0, left: '50%', right: 0, height: 2, bgcolor: LCOLOR },
          }}>
            <Box sx={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 2, height: 32, bgcolor: LCOLOR }} />
            {child}
          </Box>
        );
      })}
    </Box>
  );
}

const PersonCard = memo(function PersonCard({ persona, depth, canEdit, onEdit, onDelete, draggingId, onDragStart, onDragEnd, onDropOnto }) {
  const nombre = persona.empleadoNombre ?? persona.nombreExterno ?? '—';
  const color  = depthColor(depth);
  const isDragging   = draggingId === persona.id;
  const isDropTarget = draggingId && draggingId !== persona.id;

  return (
    <Box
      draggable={canEdit}
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', persona.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(persona.id);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const fromId = e.dataTransfer.getData('text/plain');
        if (fromId && fromId !== persona.id) onDropOnto(persona.id, fromId);
      }}
      sx={{
        width: 148, flexShrink: 0,
        borderRadius: '12px',
        border: isDropTarget ? `2.5px dashed ${color}` : `2.5px solid ${color}`,
        bgcolor: 'white',
        boxShadow: isDragging ? 0 : 3,
        opacity: isDragging ? 0.4 : 1,
        cursor: canEdit ? 'grab' : 'default',
        overflow: 'hidden',
        transition: 'box-shadow 0.15s, opacity 0.15s, border-color 0.15s',
        '&:hover': { boxShadow: 6 },
        position: 'relative',
      }}
    >
      {/* Foto — 70% de la altura de la card */}
      <Box sx={{ width: '100%', height: 120, overflow: 'hidden', bgcolor: color + '18', position: 'relative' }}>
        {persona.fotoUrl ? (
          <Box component="img" src={persona.fotoUrl} alt={nombre}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Avatar sx={{ width: 72, height: 72, bgcolor: color, fontSize: 28, fontWeight: 700 }}>
              {nombre.charAt(0).toUpperCase()}
            </Avatar>
          </Box>
        )}
        {canEdit && (
          <Box sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 0.25 }}>
            <IconButton size="small"
              onClick={(e) => { e.stopPropagation(); onEdit(persona); }}
              sx={{ bgcolor: 'rgba(255,255,255,0.92)', p: 0.4, boxShadow: 1,
                    '&:hover': { bgcolor: 'primary.main', color: 'white' } }}>
              <EditIcon sx={{ fontSize: 12 }} />
            </IconButton>
            <IconButton size="small"
              onClick={(e) => { e.stopPropagation(); onDelete(persona.id); }}
              sx={{ bgcolor: 'rgba(255,255,255,0.92)', p: 0.4, boxShadow: 1,
                    '&:hover': { bgcolor: 'error.main', color: 'white' } }}>
              <DeleteIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Info — 30% */}
      <Box sx={{ px: 1, py: 0.75, bgcolor: 'white' }}>
        <Typography sx={{
          fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
          color, letterSpacing: 0.4, lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {persona.cargo}
        </Typography>
        <Typography sx={{
          fontSize: 10, color: 'text.secondary', lineHeight: 1.3, mt: 0.25,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {nombre}
        </Typography>
      </Box>

      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: color }} />
    </Box>
  );
});

const TreeNode = memo(function TreeNode({ node, depth, canEdit, onEdit, onDelete, draggingId, onDragStart, onDragEnd, onDropOnto }) {
  const hasChildren = node.children?.length > 0;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <PersonCard
        persona={node}
        depth={depth}
        canEdit={canEdit}
        onEdit={onEdit}
        onDelete={onDelete}
        draggingId={draggingId}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDropOnto={onDropOnto}
      />
      {hasChildren && (
        <>
          <VLine h={32} />
          <HBranch>
            {node.children.map(child => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                canEdit={canEdit}
                onEdit={onEdit}
                onDelete={onDelete}
                draggingId={draggingId}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDropOnto={onDropOnto}
              />
            ))}
          </HBranch>
        </>
      )}
    </Box>
  );
});

function DialogOrgPersona({ open, onClose, persona, parentIdInicial, empleados, personas, onSave }) {
  const [cargo,         setCargo]         = useState('');
  const [parentId,      setParentId]      = useState('');
  const [empleadoId,    setEmpleadoId]    = useState('');
  const [nombreExterno, setNombreExterno] = useState('');
  const [fotoFile,      setFotoFile]      = useState(null);
  const [fotoPreview,   setFotoPreview]   = useState('');
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');

  useEffect(() => {
    if (!open) return;
    setCargo(persona?.cargo ?? '');
    setParentId(persona?.parentId ?? persona?.ParentId ?? parentIdInicial ?? '');
    setEmpleadoId(persona?.empleadoId ?? persona?.EmpleadoId ?? '');
    setNombreExterno(persona?.nombreExterno ?? persona?.NombreExterno ?? '');
    setFotoPreview(persona?.fotoUrl ?? persona?.FotoUrl ?? '');
    setFotoFile(null);
    setError('');
  }, [open, persona, parentIdInicial]);

  const handleFoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFotoFile(f);
    setFotoPreview(URL.createObjectURL(f));
  };

  const empSeleccionado = empleados.find(e => e.id === empleadoId);
  const nombreMostrado  = empleadoId
    ? `${empSeleccionado?.nombres ?? ''} ${empSeleccionado?.apellidos ?? ''}`.trim()
    : nombreExterno;

  const handleSave = async () => {
    if (!cargo.trim()) { setError('El cargo es obligatorio.'); return; }
    if (!empleadoId && !nombreExterno.trim()) { setError('Selecciona un empleado o ingresa un nombre.'); return; }
    setSaving(true); setError('');
    try {
      let fotoUrl = persona?.fotoUrl ?? null;
      if (fotoFile) {
        const fd = new FormData();
        fd.append('archivo', fotoFile);
        const { data } = await apiClient.post('/api/archivos/upload?carpeta=organigrama', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        fotoUrl = data.url;
      }
      await onSave({
        cargo: cargo.trim(),
        parentId:      parentId || null,
        empleadoId:    empleadoId || null,
        nombreExterno: empleadoId ? null : nombreExterno.trim(),
        fotoUrl,
      });
    } catch (e) {
      setError(e.response?.data?.error ?? e.response?.data?.mensaje ?? e.message ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const posiblesJefes = personas.filter(p => p.id !== persona?.id);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={700}>
        {persona ? 'Editar persona' : 'Agregar persona al organigrama'}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Foto */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <Box sx={{
            width: 110, height: 110, borderRadius: '12px', overflow: 'hidden',
            border: '3px solid', borderColor: 'primary.main', mb: 1.5, bgcolor: 'grey.100',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {fotoPreview
              ? <Box component="img" src={fotoPreview} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Avatar sx={{ width: 80, height: 80, fontSize: 32 }}>{nombreMostrado?.charAt(0)?.toUpperCase() ?? '?'}</Avatar>
            }
          </Box>
          <Button size="small" component="label" variant="outlined">
            {fotoPreview ? 'Cambiar foto' : 'Subir foto'}
            <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={handleFoto} />
          </Button>
        </Box>

        {/* Cargo con sugerencias */}
        <Autocomplete
          freeSolo
          options={CARGOS_COMUNES}
          value={cargo}
          onChange={(_, v) => setCargo(v || '')}
          onInputChange={(_, v) => setCargo(v)}
          renderInput={(params) => (
            <TextField {...params} size="small" label="Cargo *"
              placeholder="Ej: Director, Coordinador, Tesorero..."
              required />
          )}
          sx={{ mb: 1.5 }}
        />

        {/* Jefe directo */}
        <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
          <InputLabel>Reporta a (jefe directo)</InputLabel>
          <Select value={parentId} label="Reporta a (jefe directo)" onChange={e => setParentId(e.target.value)}>
            <MenuItem value="">— Nivel raíz (sin jefe) —</MenuItem>
            {posiblesJefes.map(p => {
              const n = p.empleadoNombre ?? p.nombreExterno ?? '—';
              return (
                <MenuItem key={p.id} value={p.id}>
                  {p.cargo} — {n}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        {/* Selector de empleado */}
        <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
          <InputLabel>Empleado del panel</InputLabel>
          <Select
            value={empleadoId}
            label="Empleado del panel"
            onChange={e => {
              const id = e.target.value;
              setEmpleadoId(id);
              if (id) {
                const emp = empleados.find(x => x.id === id);
                if (emp?.cargo) setCargo(emp.cargo);
              }
            }}
          >
            <MenuItem value="">— Persona externa —</MenuItem>
            {empleados.map(e => (
              <MenuItem key={e.id} value={e.id}>
                {e.nombres} {e.apellidos}{e.cargo ? ` · ${e.cargo}` : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {!empleadoId && (
          <TextField
            fullWidth size="small" label="Nombre completo *"
            value={nombreExterno} onChange={e => setNombreExterno(e.target.value)}
            helperText="Para personas que no están registradas como empleados"
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}
          disabled={saving || !cargo.trim() || (!empleadoId && !nombreExterno.trim())}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function buildTree(personas) {
  const map = {};
  personas.forEach(p => { map[p.id] = { ...p, children: [] }; });
  const roots = [];
  personas.forEach(p => {
    const pid = p.parentId || p.ParentId || null;
    if (pid && map[pid]) map[pid].children.push(map[p.id]);
    else roots.push(map[p.id]);
  });
  return roots;
}

export function OrgChartTab({ puedoEditar, empleados }) {
  const confirm = useConfirm();
  const { data: personas, cargando, ejecutar: cargar } = useAsyncData(
    async () => (await apiClient.get('/api/organigrama')).data,
    { inicial: [], errorMsg: '' }
  );
  const [dlg,        setDlg]        = useState({ open: false, persona: null, parentIdInicial: null });
  const [draggingId, setDraggingId] = useState(null);

  useEffect(() => { cargar(); }, [cargar]);

  const openAdd  = (parentIdInicial = null) => setDlg({ open: true, persona: null, parentIdInicial });
  const openEdit = (p) => setDlg({ open: true, persona: p, parentIdInicial: null });

  const handleDelete = async (id) => {
    if (!await confirm('¿Quitar esta persona del organigrama?')) return;
    await apiClient.delete(`/api/organigrama/${id}`);
    cargar();
  };

  const handleSave = async ({ cargo, parentId, empleadoId, nombreExterno, fotoUrl }) => {
    if (dlg.persona) {
      await apiClient.put(`/api/organigrama/${dlg.persona.id}`, {
        cargo:         cargo         || null,
        orden:         dlg.persona.orden,
        empleadoId:    empleadoId    || null,
        nombreExterno: nombreExterno || null,
        fotoUrl:       fotoUrl       || null,
        parentId:      parentId      || null,
      });
    } else {
      await apiClient.post('/api/organigrama', {
        cargo,
        orden:         personas.length,
        empleadoId:    empleadoId    || null,
        nombreExterno: nombreExterno || null,
        fotoUrl:       fotoUrl       || null,
        parentId:      parentId      || null,
      });
    }
    setDlg(d => ({ ...d, open: false }));
    cargar();
  };

  const handleDropOnto = async (targetId, sourceId) => {
    if (!sourceId || sourceId === targetId) return;
    const pMap = {};
    personas.forEach(p => { pMap[p.id] = p; });
    const isDescendant = (nodeId, ancId) => {
      if (!nodeId || !pMap[nodeId]) return false;
      if (nodeId === ancId) return true;
      return isDescendant(pMap[nodeId].parentId || pMap[nodeId].ParentId, ancId);
    };
    if (isDescendant(targetId, sourceId)) return;
    const p = pMap[sourceId];
    if (!p) return;
    await apiClient.put(`/api/organigrama/${sourceId}`, {
      orden: p.orden, empleadoId: p.empleadoId ?? null,
      nombreExterno: p.nombreExterno ?? null, fotoUrl: p.fotoUrl ?? null,
      parentId: targetId,
    });
    setDraggingId(null);
    cargar();
  };

  const handleDropRoot = async (e) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId) return;
    const p = personas.find(x => x.id === sourceId);
    if (!p) return;
    await apiClient.put(`/api/organigrama/${sourceId}`, {
      orden: p.orden, empleadoId: p.empleadoId ?? null,
      nombreExterno: p.nombreExterno ?? null, fotoUrl: p.fotoUrl ?? null,
      parentId: null,
    });
    setDraggingId(null);
    cargar();
  };

  const roots = buildTree(personas);

  if (cargando) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Cabecera */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Organigrama Institucional</Typography>
          <Typography variant="body2" color="text.secondary">
            {puedoEditar
              ? 'Arrastra una card sobre otra para definir quién reporta a quién. Usa el botón "+" para agregar.'
              : 'Visualización del organigrama institucional.'}
          </Typography>
        </Box>
        {puedoEditar && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openAdd(null)}
            sx={{ bgcolor: BRAND_COLOR, '&:hover': { bgcolor: '#3b1470' } }}>
            Agregar persona
          </Button>
        )}
      </Box>

      {/* Zona "soltar aquí para hacer raíz" */}
      {puedoEditar && (
        <Box
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropRoot}
          sx={{
            display: draggingId ? undefined : 'none',
            mb: 2, p: 1.5, borderRadius: 2, textAlign: 'center',
            border: '2px dashed', borderColor: 'warning.main',
            bgcolor: 'warning.light', color: 'warning.dark', fontSize: 13, fontWeight: 600,
          }}
        >
          Suelta aquí para mover al nivel raíz (sin jefe directo)
        </Box>
      )}

      {/* Árbol */}
      <Box sx={{
        overflowX: 'auto',
        background: 'linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%)',
        borderRadius: 3, p: { xs: 2, sm: 3, md: 4 },
        border: '1px solid', borderColor: 'divider',
        minHeight: 200,
      }}>
        {personas.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, opacity: 0.5 }}>
            <AccountTreeIcon sx={{ fontSize: 48, mb: 1, color: 'text.disabled' }} />
            <Typography color="text.secondary">
              El organigrama está vacío. Haz clic en "Agregar persona" para comenzar.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', userSelect: 'none' }}>
            <HBranch>
              {roots.map(root => (
                <TreeNode
                  key={root.id}
                  node={root}
                  depth={0}
                  canEdit={puedoEditar}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  draggingId={draggingId}
                  onDragStart={setDraggingId}
                  onDragEnd={() => setDraggingId(null)}
                  onDropOnto={handleDropOnto}
                />
              ))}
            </HBranch>
          </Box>
        )}
      </Box>

      {puedoEditar && personas.length > 0 && (
        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, opacity: 0.6 }}>
          <AccountTreeIcon sx={{ fontSize: 16 }} />
          <Typography variant="caption">
            Arrastra una card encima de otra para establecer jerarquía. Haz clic en el lápiz para editar nombre, cargo o foto.
          </Typography>
        </Box>
      )}

      <DialogOrgPersona
        open={dlg.open}
        onClose={() => setDlg(d => ({ ...d, open: false }))}
        persona={dlg.persona}
        parentIdInicial={dlg.parentIdInicial}
        empleados={empleados}
        personas={personas}
        onSave={handleSave}
      />
    </Box>
  );
}

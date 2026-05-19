import { useState, useEffect, useCallback, Children } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Grid, Card, CardContent,
  Avatar, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, Alert, Skeleton, Tooltip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Badge, InputAdornment,
  CircularProgress, FormControl, InputLabel, Select,
} from '@mui/material';
import AddIcon            from '@mui/icons-material/Add';
import EditIcon           from '@mui/icons-material/Edit';
import DeleteIcon         from '@mui/icons-material/Delete';
import SearchIcon         from '@mui/icons-material/Search';
import SaveIcon           from '@mui/icons-material/Save';
import BadgeIcon          from '@mui/icons-material/Badge';
import PeopleIcon         from '@mui/icons-material/People';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';
import NotificationsIcon  from '@mui/icons-material/Notifications';
import EventNoteIcon      from '@mui/icons-material/EventNote';
import AccountTreeIcon    from '@mui/icons-material/AccountTree';
import apiClient          from '../../../../infrastructure/http/apiClient';
import { useAuth }        from '../../../../application/auth/AuthContext';

// ── Catálogos ─────────────────────────────────────────────────────────────────
const TIPOS_DOCUMENTO   = ['CC','TI','CE','Pasaporte','NIT','Otro'];
const TIPOS_CONTRATO    = ['indefinido','fijo','prestacion_servicios','aprendizaje','voluntario','otro'];
const AREAS             = ['Administración','Coordinación','Educación','Trabajo Social','Salud','Comunicaciones','Sistemas','Contabilidad','Otro'];
const TIPOS_NOVEDAD     = ['vacaciones','incapacidad','permiso_remunerado','permiso_no_remunerado','comision','otro'];
const ESTADOS_NOVEDAD   = ['pendiente','aprobada','rechazada'];

const CONTRATO_COLORS = {
  indefinido:           'success',
  fijo:                 'primary',
  prestacion_servicios: 'warning',
  aprendizaje:          'info',
  voluntario:           'secondary',
  otro:                 'default',
};
const NOVEDAD_COLORS = {
  vacaciones:          '#10B981',
  incapacidad:         '#EF4444',
  permiso_remunerado:  '#F59E0B',
  permiso_no_remunerado:'#9CA3AF',
  comision:            '#2563EB',
  otro:                '#7C3AED',
};
const ESTADO_NOVEDAD_COLORS = { pendiente: 'warning', aprobada: 'success', rechazada: 'error' };

function iniciales(nombres, apellidos) {
  return `${nombres?.[0] ?? ''}${apellidos?.[0] ?? ''}`.toUpperCase();
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color = 'primary.main', warn }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: warn ? 'warning.light' : 'divider' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '12px !important' }}>
        <Box sx={{ color, fontSize: 32 }}>{icon}</Box>
        <Box>
          <Typography variant="h5" fontWeight={700} color={color}>{value ?? '—'}</Typography>
          <Typography variant="body2">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DIALOGO EMPLEADO (crear / editar)
// ════════════════════════════════════════════════════════════════════════════
const EMPLEADO_VACIO = {
  nombres:'', apellidos:'', tipoDocumento:'CC', numeroDocumento:'',
  email:'', telefono:'', celular:'', cargo:'', area:'',
  sedeId:'', tipoContrato:'indefinido',
  fechaIngreso:'', fechaFinContrato:'', salario:'',
  eps:'', pension:'', activo: true, notas:'',
};

function DialogEmpleado({ open, onClose, empleado, sedes, onSaved }) {
  const [form, setForm]   = useState(EMPLEADO_VACIO);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (empleado) {
      setForm({
        nombres:          empleado.nombres ?? '',
        apellidos:        empleado.apellidos ?? '',
        tipoDocumento:    empleado.tipoDocumento ?? 'CC',
        numeroDocumento:  empleado.numeroDocumento ?? '',
        email:            empleado.email ?? '',
        telefono:         empleado.telefono ?? '',
        celular:          empleado.celular ?? '',
        cargo:            empleado.cargo ?? '',
        area:             empleado.area ?? '',
        sedeId:           empleado.sedeId ?? '',
        tipoContrato:     empleado.tipoContrato ?? 'indefinido',
        fechaIngreso:     empleado.fechaIngreso ?? '',
        fechaFinContrato: empleado.fechaFinContrato ?? '',
        salario:          empleado.salario ?? '',
        eps:              empleado.eps ?? '',
        pension:          empleado.pension ?? '',
        activo:           empleado.activo ?? true,
        notas:            empleado.notas ?? '',
      });
    } else {
      setForm(EMPLEADO_VACIO);
    }
    setError('');
  }, [empleado, open]);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const guardar = async () => {
    if (!form.nombres.trim() || !form.apellidos.trim()) { setError('Nombres y apellidos son requeridos.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        sedeId:          form.sedeId    || null,
        salario:         form.salario   ? Number(form.salario) : null,
        fechaIngreso:    form.fechaIngreso    || null,
        fechaFinContrato:form.fechaFinContrato || null,
        tipoDocumento:   form.tipoDocumento || null,
        numeroDocumento: form.numeroDocumento || null,
        email:           form.email    || null,
        telefono:        form.telefono || null,
        celular:         form.celular  || null,
        cargo:           form.cargo    || null,
        area:            form.area     || null,
        tipoContrato:    form.tipoContrato || null,
        eps:             form.eps      || null,
        pension:         form.pension  || null,
        notas:           form.notas    || null,
      };
      if (empleado) {
        await apiClient.put(`/api/talento-humano/${empleado.id}`, payload);
      } else {
        await apiClient.post('/api/talento-humano', payload);
      }
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle fontWeight={700}>{empleado ? 'Editar empleado' : 'Nuevo empleado'}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          {/* Datos personales */}
          <Grid size={12}><Typography variant="subtitle2" fontWeight={700} color="text.secondary">Datos personales</Typography></Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Nombres *" value={form.nombres} onChange={set('nombres')} size="small" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Apellidos *" value={form.apellidos} onChange={set('apellidos')} size="small" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth label="Tipo documento" value={form.tipoDocumento} onChange={set('tipoDocumento')} size="small">
              {TIPOS_DOCUMENTO.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Número documento" value={form.numeroDocumento} onChange={set('numeroDocumento')} size="small" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Email" value={form.email} onChange={set('email')} size="small" type="email" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Teléfono" value={form.telefono} onChange={set('telefono')} size="small" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Celular" value={form.celular} onChange={set('celular')} size="small" />
          </Grid>

          {/* Cargo y sede */}
          <Grid size={12}><Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mt: 1 }}>Cargo y ubicación</Typography></Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Cargo" value={form.cargo} onChange={set('cargo')} size="small" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Área" value={form.area} onChange={set('area')} size="small">
              <MenuItem value="">— Sin área —</MenuItem>
              {AREAS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Sede" value={form.sedeId} onChange={set('sedeId')} size="small">
              <MenuItem value="">— Sin sede —</MenuItem>
              {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
            </TextField>
          </Grid>

          {/* Contrato */}
          <Grid size={12}><Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mt: 1 }}>Contrato</Typography></Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth label="Tipo contrato" value={form.tipoContrato} onChange={set('tipoContrato')} size="small">
              {TIPOS_CONTRATO.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g,' ')}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Fecha ingreso" value={form.fechaIngreso} onChange={set('fechaIngreso')} size="small" type="date" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Fecha fin contrato" value={form.fechaFinContrato} onChange={set('fechaFinContrato')} size="small" type="date" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Salario (COP)" value={form.salario} onChange={set('salario')} size="small" type="number" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="EPS" value={form.eps} onChange={set('eps')} size="small" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Pensión" value={form.pension} onChange={set('pension')} size="small" />
          </Grid>

          {/* Estado y notas */}
          {empleado && (
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth label="Estado" value={form.activo} onChange={e => setForm(p => ({ ...p, activo: e.target.value === 'true' }))} size="small">
                <MenuItem value="true">Activo</MenuItem>
                <MenuItem value="false">Inactivo</MenuItem>
              </TextField>
            </Grid>
          )}
          <Grid size={12}>
            <TextField fullWidth label="Notas" value={form.notas} onChange={set('notas')} size="small" multiline rows={2} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={guardar} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DIALOGO NOVEDAD
// ════════════════════════════════════════════════════════════════════════════
const NOVEDAD_VACIA = { tipo: 'vacaciones', fechaInicio: '', fechaFin: '', dias: '', descripcion: '', estado: 'pendiente' };

function DialogNovedad({ open, onClose, novedad, empleadoId, onSaved }) {
  const [form, setForm]   = useState(NOVEDAD_VACIA);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    setForm(novedad ? {
      tipo:        novedad.tipo,
      fechaInicio: novedad.fechaInicio ?? '',
      fechaFin:    novedad.fechaFin ?? '',
      dias:        novedad.dias ?? '',
      descripcion: novedad.descripcion ?? '',
      estado:      novedad.estado,
    } : NOVEDAD_VACIA);
    setError('');
  }, [novedad, open]);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const guardar = async () => {
    if (!form.fechaInicio) { setError('La fecha de inicio es requerida.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        tipo:        form.tipo,
        fechaInicio: form.fechaInicio,
        fechaFin:    form.fechaFin  || null,
        dias:        form.dias      ? Number(form.dias) : null,
        descripcion: form.descripcion || null,
        estado:      form.estado,
      };
      if (novedad) {
        await apiClient.put(`/api/talento-humano/novedades/${novedad.id}`, payload);
      } else {
        await apiClient.post(`/api/talento-humano/${empleadoId}/novedades`, payload);
      }
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>{novedad ? 'Editar novedad' : 'Nueva novedad'}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Tipo" value={form.tipo} onChange={set('tipo')} size="small">
              {TIPOS_NOVEDAD.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g,' ')}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Estado" value={form.estado} onChange={set('estado')} size="small">
              {ESTADOS_NOVEDAD.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Fecha inicio *" value={form.fechaInicio} onChange={set('fechaInicio')} size="small" type="date" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Fecha fin" value={form.fechaFin} onChange={set('fechaFin')} size="small" type="date" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Días" value={form.dias} onChange={set('dias')} size="small" type="number" />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Descripción" value={form.descripcion} onChange={set('descripcion')} size="small" multiline rows={2} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={guardar} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PANEL DETALLE EMPLEADO (novedades + info)
// ════════════════════════════════════════════════════════════════════════════
function PanelEmpleado({ empleado, onClose, onEdit, onDeleted, puedo }) {
  const [novedades, setNovedades] = useState([]);
  const [loadingNov, setLoadingNov] = useState(true);
  const [dialogNov, setDialogNov]   = useState(false);
  const [editNov,   setEditNov]     = useState(null);

  const cargarNovedades = useCallback(async () => {
    setLoadingNov(true);
    try {
      const { data } = await apiClient.get(`/api/talento-humano/${empleado.id}/novedades`);
      setNovedades(data);
    } finally {
      setLoadingNov(false);
    }
  }, [empleado.id]);

  useEffect(() => { cargarNovedades(); }, [cargarNovedades]);

  const eliminarNovedad = async (id) => {
    if (!window.confirm('¿Eliminar esta novedad?')) return;
    await apiClient.delete(`/api/talento-humano/novedades/${id}`);
    cargarNovedades();
  };

  const fmtFecha = (f) => f ? new Date(f + 'T00:00:00').toLocaleDateString('es-CO') : '—';
  const fmtCop   = (v) => v ? `$${Number(v).toLocaleString('es-CO')}` : '—';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 20 }}>
          {iniciales(empleado.nombres, empleado.apellidos)}
        </Avatar>
        <Box flex={1}>
          <Typography variant="h6" fontWeight={700}>{empleado.nombres} {empleado.apellidos}</Typography>
          <Typography variant="body2" color="text.secondary">{empleado.cargo ?? 'Sin cargo'} · {empleado.area ?? 'Sin área'}</Typography>
        </Box>
        <Chip label={empleado.activo ? 'Activo' : 'Inactivo'} color={empleado.activo ? 'success' : 'default'} size="small" />
      </Box>

      {/* Info */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {[
          ['Documento',   `${empleado.tipoDocumento ?? ''} ${empleado.numeroDocumento ?? '—'}`],
          ['Email',       empleado.email    ?? '—'],
          ['Teléfono',    empleado.telefono ?? empleado.celular ?? '—'],
          ['Sede',        empleado.sedeNombre ?? '—'],
          ['Contrato',    empleado.tipoContrato?.replace(/_/g,' ') ?? '—'],
          ['Ingreso',     fmtFecha(empleado.fechaIngreso)],
          ['Fin contrato',fmtFecha(empleado.fechaFinContrato)],
          ['Salario',     fmtCop(empleado.salario)],
          ['EPS',         empleado.eps      ?? '—'],
          ['Pensión',     empleado.pension  ?? '—'],
        ].map(([k, v]) => (
          <Grid key={k} size={{ xs: 6, sm: 4 }}>
            <Typography variant="caption" color="text.secondary" display="block">{k}</Typography>
            <Typography variant="body2" fontWeight={500}>{v}</Typography>
          </Grid>
        ))}
      </Grid>

      {/* Novedades */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>Novedades</Typography>
        {puedo('talento_humano', 'crear') && (
          <Button size="small" startIcon={<AddIcon />} onClick={() => { setEditNov(null); setDialogNov(true); }}>
            Nueva novedad
          </Button>
        )}
      </Box>

      {loadingNov ? <Skeleton height={80} /> : novedades.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          Sin novedades registradas
        </Typography>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>Tipo</TableCell>
                <TableCell>Fecha inicio</TableCell>
                <TableCell>Fecha fin</TableCell>
                <TableCell>Días</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {novedades.map(n => (
                <TableRow key={n.id} hover>
                  <TableCell>
                    <Chip label={n.tipo.replace(/_/g,' ')} size="small"
                      sx={{ bgcolor: NOVEDAD_COLORS[n.tipo] + '22', color: NOVEDAD_COLORS[n.tipo], fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>{fmtFecha(n.fechaInicio)}</TableCell>
                  <TableCell>{fmtFecha(n.fechaFin)}</TableCell>
                  <TableCell>{n.dias ?? '—'}</TableCell>
                  <TableCell>
                    <Chip label={n.estado} size="small" color={ESTADO_NOVEDAD_COLORS[n.estado] ?? 'default'} />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {puedo('talento_humano', 'editar') && (
                      <IconButton size="small" onClick={() => { setEditNov(n); setDialogNov(true); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    {puedo('talento_humano', 'eliminar') && (
                      <IconButton size="small" color="error" onClick={() => eliminarNovedad(n.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <DialogNovedad
        open={dialogNov}
        onClose={() => setDialogNov(false)}
        novedad={editNov}
        empleadoId={empleado.id}
        onSaved={() => { setDialogNov(false); cargarNovedades(); }}
      />
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ORGANIGRAMA — árbol dinámico con drag & drop
// ════════════════════════════════════════════════════════════════════════════
const LCOLOR       = '#94A3B8';
const DEPTH_COLORS = ['#1E1B4B','#4E1B95','#7C3AED','#2563EB','#0891B2','#059669','#D97706','#DC2626'];
const depthColor   = (d) => DEPTH_COLORS[Math.min(d, DEPTH_COLORS.length - 1)];

// ── Conectores ────────────────────────────────────────────────────────────────
function VLine({ h = 28 }) {
  return <Box sx={{ width: 2, height: h, bgcolor: LCOLOR, mx: 'auto', flexShrink: 0 }} />;
}

function HBranch({ children }) {
  const arr = Children.toArray(children);
  if (!arr.length) return null;
  // 1 hijo: renderizar directo — el VLine lo pone TreeNode arriba
  if (arr.length === 1) return arr[0];
  // Varios hijos: expandir horizontalmente con barras conectoras
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
      {arr.map((child, i) => {
        const first = i === 0, last = i === arr.length - 1;
        return (
          <Box key={i} sx={{
            minWidth: 172, // evita colapso flex
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

// ── PersonCard — foto 70%, cargo grande, nombre pequeño, drag & drop ─────────
function PersonCard({ persona, depth, canEdit, onEdit, onDelete, draggingId, onDragStart, onDragEnd, onDropOnto }) {
  const nombre = persona.empleadoNombre ?? persona.nombreExterno ?? '—';
  const color  = depthColor(depth);
  const isDragging = draggingId === persona.id;
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
        {/* Botones de acción en overlay */}
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

      {/* Borde superior de color */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: color }} />
    </Box>
  );
}

// ── Nodo del árbol recursivo ──────────────────────────────────────────────────
function TreeNode({ node, depth, canEdit, onEdit, onDelete, draggingId, onDragStart, onDragEnd, onDropOnto }) {
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
}

// ── Dialog agregar / editar persona del organigrama ──────────────────────────
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
    setParentId(persona?.parentId ?? parentIdInicial ?? '');
    setEmpleadoId(persona?.empleadoId ?? '');
    setNombreExterno(persona?.nombreExterno ?? '');
    setFotoPreview(persona?.fotoUrl ?? '');
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
      setError(e.response?.data?.mensaje ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  // Excluir la persona actual y sus descendientes de la lista de jefes
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

        {/* Cargo libre */}
        <TextField
          fullWidth size="small" label="Cargo *" value={cargo}
          onChange={e => setCargo(e.target.value)}
          placeholder="Ej: Junta Directiva, Gerente, Tesorero..."
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
          <Select value={empleadoId} label="Empleado del panel" onChange={e => setEmpleadoId(e.target.value)}>
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

// ── OrgChartTab principal ─────────────────────────────────────────────────────
function buildTree(personas) {
  const map = {};
  personas.forEach(p => { map[p.id] = { ...p, children: [] }; });
  const roots = [];
  personas.forEach(p => {
    if (p.parentId && map[p.parentId]) map[p.parentId].children.push(map[p.id]);
    else roots.push(map[p.id]);
  });
  return roots;
}

function OrgChartTab({ puedoEditar, empleados }) {
  const [personas,    setPersonas]    = useState([]);
  const [cargando,    setCargando]    = useState(true);
  const [dlg,         setDlg]         = useState({ open: false, persona: null, parentIdInicial: null });
  const [draggingId,  setDraggingId]  = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { const { data } = await apiClient.get('/api/organigrama'); setPersonas(data); }
    catch { /* silent */ } finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const openAdd  = (parentIdInicial = null) => setDlg({ open: true, persona: null, parentIdInicial });
  const openEdit = (p) => setDlg({ open: true, persona: p, parentIdInicial: null });

  const handleDelete = async (id) => {
    if (!window.confirm('¿Quitar esta persona del organigrama?')) return;
    await apiClient.delete(`/api/organigrama/${id}`);
    cargar();
  };

  const handleSave = async ({ cargo, parentId, empleadoId, nombreExterno, fotoUrl }) => {
    if (dlg.persona) {
      await apiClient.put(`/api/organigrama/${dlg.persona.id}`, {
        orden:         dlg.persona.orden,
        empleadoId:    empleadoId    ?? null,
        nombreExterno: nombreExterno ?? null,
        fotoUrl:       fotoUrl       ?? null,
        parentId:      parentId      ?? null,
      });
    } else {
      await apiClient.post('/api/organigrama', {
        cargo,
        orden:         personas.length,
        empleadoId:    empleadoId    ?? null,
        nombreExterno: nombreExterno ?? null,
        fotoUrl:       fotoUrl       ?? null,
        parentId:      parentId      ?? null,
      });
    }
    setDlg(d => ({ ...d, open: false }));
    cargar();
  };

  // Drag & drop — usa sourceId de dataTransfer, no de state (evita race condition)
  const handleDropOnto = async (targetId, sourceId) => {
    if (!sourceId || sourceId === targetId) return;
    const pMap = {};
    personas.forEach(p => { pMap[p.id] = p; });
    // Evitar ciclos: targetId no puede ser descendiente de sourceId
    const isDescendant = (nodeId, ancId) => {
      if (!nodeId || !pMap[nodeId]) return false;
      if (nodeId === ancId) return true;
      return isDescendant(pMap[nodeId].parentId, ancId);
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
            sx={{ bgcolor: '#4E1B95', '&:hover': { bgcolor: '#3b1470' } }}>
            Agregar persona
          </Button>
        )}
      </Box>

      {/* Zona "soltar aquí para hacer raíz" */}
      {puedoEditar && (
        <Box
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropRoot}
          sx={{ display: draggingId ? undefined : 'none' }}
          sx={{
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

      {/* Ayuda drag & drop */}
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

// ════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function TalentoHumanoPage() {
  const { puedo } = useAuth();

  const [empleados, setEmpleados] = useState([]);
  const [stats,     setStats]     = useState(null);
  const [sedes,     setSedes]     = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState('');

  const [busqueda,  setBusqueda]  = useState('');
  const [filtroActivo, setFiltroActivo] = useState('true');

  const [mainTab,        setMainTab]        = useState(0);
  const [dialogEmpleado, setDialogEmpleado] = useState(false);
  const [editEmpleado,   setEditEmpleado]   = useState(null);
  const [panelEmpleado,  setPanelEmpleado]  = useState(null);
  const [tabPanel,       setTabPanel]       = useState(0);

  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try {
      const params = filtroActivo !== 'todos' ? { activo: filtroActivo } : {};
      const [empRes, statsRes, sedesRes] = await Promise.all([
        apiClient.get('/api/talento-humano', { params }),
        apiClient.get('/api/talento-humano/stats'),
        apiClient.get('/api/sedes'),
      ]);
      setEmpleados(empRes.data);
      setStats(statsRes.data);
      setSedes(sedesRes.data ?? []);
    } catch {
      setError('Error al cargar datos.');
    } finally {
      setCargando(false);
    }
  }, [filtroActivo]);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este empleado? Esta acción no se puede deshacer.')) return;
    await apiClient.delete(`/api/talento-humano/${id}`);
    if (panelEmpleado?.id === id) setPanelEmpleado(null);
    cargar();
  };

  const abrirPanel = async (emp) => {
    const { data } = await apiClient.get(`/api/talento-humano/${emp.id}`);
    setPanelEmpleado(data);
    setTabPanel(0);
  };

  const filtrados = empleados.filter(e => {
    const q = busqueda.toLowerCase();
    return !q || `${e.nombres} ${e.apellidos} ${e.cargo ?? ''} ${e.area ?? ''} ${e.numeroDocumento ?? ''}`.toLowerCase().includes(q);
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Talento Humano</Typography>
          <Typography variant="body2" color="text.secondary">Gestión del personal y novedades de la fundación</Typography>
        </Box>
        {mainTab === 0 && puedo('talento_humano', 'crear') && (
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => { setEditEmpleado(null); setDialogEmpleado(true); }}>
            Nuevo empleado
          </Button>
        )}
      </Box>

      {/* Pestañas principales */}
      <Tabs
        value={mainTab}
        onChange={(_, v) => setMainTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          label="Empleados"
          icon={<BadgeIcon fontSize="small" />}
          iconPosition="start"
          sx={{ minHeight: 42, py: 0, fontWeight: 600 }}
        />
        <Tab
          label="Organigrama"
          icon={<AccountTreeIcon fontSize="small" />}
          iconPosition="start"
          sx={{ minHeight: 42, py: 0, fontWeight: 600 }}
        />
      </Tabs>

      {/* ── Tab Organigrama ───────────────────────────────────────── */}
      {mainTab === 1 && (
        <OrgChartTab puedoEditar={puedo('talento_humano', 'editar')} empleados={empleados} />
      )}

      {/* ── Tab Empleados ─────────────────────────────────────────── */}
      {mainTab === 0 && <>

      {/* KPIs */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <KpiCard label="Total empleados" value={stats.total} icon={<PeopleIcon fontSize="inherit" />} color="#4E1B95" />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <KpiCard label="Activos" value={stats.activos} icon={<BadgeIcon fontSize="inherit" />} color="#10B981" />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <KpiCard label="Contratos vencen en 30 días" value={stats.contratosProximosVencer}
              icon={<WarningAmberIcon fontSize="inherit" />} color="#F59E0B" warn={stats.contratosProximosVencer > 0} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <KpiCard label="Novedades pendientes" value={stats.novedadesPendientes}
              icon={<NotificationsIcon fontSize="inherit" />} color="#EF4444" warn={stats.novedadesPendientes > 0} />
          </Grid>
        </Grid>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Buscar por nombre, cargo, documento…"
          size="small" sx={{ minWidth: 280 }}
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <TextField select size="small" label="Estado" value={filtroActivo}
          onChange={e => setFiltroActivo(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="true">Activos</MenuItem>
          <MenuItem value="false">Inactivos</MenuItem>
          <MenuItem value="todos">Todos</MenuItem>
        </TextField>
      </Box>

      {/* Layout: lista + panel detalle */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* Lista de empleados */}
        <Box sx={{ flex: panelEmpleado ? '0 0 380px' : 1, minWidth: 0 }}>
          {cargando ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={76} sx={{ mb: 1 }} />)
          ) : filtrados.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <PeopleIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
              <Typography color="text.secondary" mt={1}>No hay empleados registrados</Typography>
            </Box>
          ) : (
            filtrados.map(emp => (
              <Card key={emp.id} elevation={0}
                sx={{
                  mb: 1, cursor: 'pointer', border: '1px solid',
                  borderColor: panelEmpleado?.id === emp.id ? 'primary.main' : 'divider',
                  bgcolor: panelEmpleado?.id === emp.id ? 'primary.50' : 'background.paper',
                  '&:hover': { borderColor: 'primary.main' },
                }}
                onClick={() => abrirPanel(emp)}
              >
                <CardContent sx={{ py: '10px !important', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Badge badgeContent={emp.novedadesPendientes > 0 ? emp.novedadesPendientes : null} color="error">
                    <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, fontSize: 14 }}>
                      {iniciales(emp.nombres, emp.apellidos)}
                    </Avatar>
                  </Badge>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {emp.nombres} {emp.apellidos}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {emp.cargo ?? 'Sin cargo'}{emp.area ? ` · ${emp.area}` : ''}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    {emp.tipoContrato && (
                      <Chip label={emp.tipoContrato.replace(/_/g,' ')} size="small"
                        color={CONTRATO_COLORS[emp.tipoContrato] ?? 'default'} />
                    )}
                    <Chip label={emp.activo ? 'Activo' : 'Inactivo'} size="small"
                      color={emp.activo ? 'success' : 'default'} variant="outlined" />
                  </Box>
                  <Box onClick={e => e.stopPropagation()} sx={{ display: 'flex', gap: 0.5 }}>
                    {puedo('talento_humano', 'editar') && (
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => { setEditEmpleado(emp); setDialogEmpleado(true); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {puedo('talento_humano', 'eliminar') && (
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => eliminar(emp.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </Box>

        {/* Panel detalle */}
        {panelEmpleado && (
          <Card elevation={0} sx={{ flex: 1, border: '1px solid', borderColor: 'primary.main', borderRadius: 2, minWidth: 0 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Tabs value={tabPanel} onChange={(_, v) => setTabPanel(v)} sx={{ minHeight: 36 }}>
                  <Tab label="Detalle" icon={<BadgeIcon fontSize="small" />} iconPosition="start" sx={{ minHeight: 36, py: 0 }} />
                  <Tab label="Novedades" icon={<EventNoteIcon fontSize="small" />} iconPosition="start" sx={{ minHeight: 36, py: 0 }} />
                </Tabs>
                <Button size="small" onClick={() => setPanelEmpleado(null)}>Cerrar</Button>
              </Box>
              {tabPanel === 0 && (
                <PanelEmpleado
                  empleado={panelEmpleado}
                  onClose={() => setPanelEmpleado(null)}
                  onEdit={() => { setEditEmpleado(panelEmpleado); setDialogEmpleado(true); }}
                  onDeleted={() => { setPanelEmpleado(null); cargar(); }}
                  puedo={puedo}
                />
              )}
              {tabPanel === 1 && (
                <PanelEmpleado
                  empleado={panelEmpleado}
                  onClose={() => setPanelEmpleado(null)}
                  onEdit={() => { setEditEmpleado(panelEmpleado); setDialogEmpleado(true); }}
                  onDeleted={() => { setPanelEmpleado(null); cargar(); }}
                  puedo={puedo}
                />
              )}
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Dialogo empleado */}
      <DialogEmpleado
        open={dialogEmpleado}
        onClose={() => setDialogEmpleado(false)}
        empleado={editEmpleado}
        sedes={sedes}
        onSaved={() => { setDialogEmpleado(false); cargar(); }}
      />

      </>}
    </Box>
  );
}

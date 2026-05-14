import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Tooltip, Switch,
} from '@mui/material';
import AddIcon    from '@mui/icons-material/Add';
import EditIcon   from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Alert      from '@mui/material/Alert';
import apiClient  from '../../../../infrastructure/http/apiClient';
import usePermisos from '../../../../shared/hooks/usePermisos';

const ROLES = [
  { value: 'administrador',       label: 'Administrador' },
  { value: 'representante_legal', label: 'Representante Legal' },
  { value: 'sistemas',            label: 'Sistemas' },
  { value: 'coordinador_programas', label: 'Coordinador de Programas' },
  { value: 'trabajador_social',   label: 'Trabajador Social' },
  { value: 'tesorero',            label: 'Tesorero' },
  { value: 'contador',            label: 'Contador' },
  { value: 'secretario',          label: 'Secretario' },
  { value: 'talento_humano',      label: 'Talento Humano' },
  { value: 'auditor',             label: 'Auditor / Solo lectura' },
];

const ROL_COLOR = {
  administrador:        'error',
  representante_legal:  'secondary',
  sistemas:             'warning',
  coordinador_programas:'primary',
  trabajador_social:    'info',
  tesorero:             'success',
  contador:             'success',
  secretario:           'default',
  talento_humano:       'info',
  auditor:              'default',
};

const EMPTY = { email: '', nombre: '', rol: 'trabajador_social' };

export default function EquipoPage() {
  const { puedo } = usePermisos();
  const [usuarios, setUsuarios] = useState([]);
  const [open,     setOpen]     = useState(false);
  const [editing,  setEditing]  = useState(null); // null=crear, obj=editar
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [errorCarga, setErrorCarga] = useState('');

  const cargar = useCallback(async () => {
    setErrorCarga('');
    try {
      const { data } = await apiClient.get('/api/equipo');
      setUsuarios(data);
    } catch (e) {
      const status = e.response?.status;
      if (status === 403) setErrorCarga('Sin permiso para ver el equipo (403). Cierra sesión y vuelve a entrar.');
      else if (status === 401) setErrorCarga('Sesión expirada (401). Cierra sesión y vuelve a entrar.');
      else setErrorCarga(`Error al cargar usuarios: ${status ?? e.message}`);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirCrear = () => {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setOpen(true);
  };

  const abrirEditar = (u) => {
    setEditing(u);
    setForm({ email: u.email, nombre: u.nombre ?? '', rol: u.rol });
    setError('');
    setOpen(true);
  };

  const guardar = async () => {
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await apiClient.put(`/api/equipo/${editing.id}`, {
          nombre: form.nombre || null,
          rol:    form.rol,
          activo: editing.activo,
        });
      } else {
        await apiClient.post('/api/equipo', {
          email:  form.email.trim(),
          nombre: form.nombre || null,
          rol:    form.rol,
        });
      }
      setOpen(false);
      cargar();
    } catch (e) {
      setError(e.response?.data?.error ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (u) => {
    try {
      await apiClient.put(`/api/equipo/${u.id}`, {
        nombre: u.nombre, rol: u.rol, activo: !u.activo,
      });
      cargar();
    } catch { /* silencioso */ }
  };

  const eliminar = async (u) => {
    if (!window.confirm(`¿Desactivar a ${u.nombre ?? u.email}?`)) return;
    try {
      await apiClient.delete(`/api/equipo/${u.id}`);
      cargar();
    } catch { /* silencioso */ }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Equipo</Typography>
          <Typography variant="body2" color="text.secondary">Usuarios con acceso al panel administrativo</Typography>
        </Box>
        {puedo('equipo', 'crear') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCrear}>
            Agregar usuario
          </Button>
        )}
      </Box>

      {errorCarga && <Alert severity="error" sx={{ mb: 2 }}>{errorCarga}</Alert>}

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell><b>Nombre / Email</b></TableCell>
              <TableCell><b>Rol</b></TableCell>
              <TableCell align="center"><b>Activo</b></TableCell>
              <TableCell align="center"><b>Miembro desde</b></TableCell>
              {(puedo('equipo', 'editar') || puedo('equipo', 'eliminar')) && (
                <TableCell align="center"><b>Acciones</b></TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{u.nombre ?? '—'}</Typography>
                  <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={ROLES.find(r => r.value === u.rol)?.label ?? u.rol}
                    color={ROL_COLOR[u.rol] ?? 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  {puedo('equipo', 'editar') ? (
                    <Switch checked={u.activo} size="small" onChange={() => toggleActivo(u)} />
                  ) : (
                    <Chip label={u.activo ? 'Activo' : 'Inactivo'} size="small"
                          color={u.activo ? 'success' : 'default'} />
                  )}
                </TableCell>
                <TableCell align="center">
                  <Typography variant="caption">
                    {new Date(u.fechaCreacion).toLocaleDateString('es-CO')}
                  </Typography>
                </TableCell>
                {(puedo('equipo', 'editar') || puedo('equipo', 'eliminar')) && (
                  <TableCell align="center">
                    {puedo('equipo', 'editar') && (
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => abrirEditar(u)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {puedo('equipo', 'eliminar') && (
                      <Tooltip title="Desactivar">
                        <IconButton size="small" color="error" onClick={() => eliminar(u)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {usuarios.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.disabled' }}>
                  No hay usuarios registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo crear/editar */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? 'Editar usuario' : 'Agregar usuario'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {!editing && (
            <TextField
              label="Correo de Google" fullWidth size="small"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              helperText="Debe ser el mismo correo de Google con el que inicia sesión"
            />
          )}
          <TextField
            label="Nombre (opcional)" fullWidth size="small"
            value={form.nombre}
            onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
          />
          <TextField
            select label="Rol" fullWidth size="small"
            value={form.rol}
            onChange={e => setForm(p => ({ ...p, rol: e.target.value }))}
          >
            {ROLES.map(r => (
              <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
            ))}
          </TextField>
          {error && (
            <Typography variant="caption" color="error">{error}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardar} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

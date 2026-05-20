import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Grid, Chip,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import AddIcon    from '@mui/icons-material/Add';
import EditIcon   from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon   from '@mui/icons-material/Save';
import { useConfirm } from '../../../../../shared/components/ConfirmDialog';
import apiClient from '../../../../../infrastructure/http/apiClient';

const TIPOS_NOVEDAD   = ['vacaciones','incapacidad','permiso_remunerado','permiso_no_remunerado','comision','otro'];
const ESTADOS_NOVEDAD = ['pendiente','aprobada','rechazada'];

const NOVEDAD_COLORS = {
  vacaciones:            '#10B981',
  incapacidad:           '#EF4444',
  permiso_remunerado:    '#F59E0B',
  permiso_no_remunerado: '#9CA3AF',
  comision:              '#2563EB',
  otro:                  '#7C3AED',
};
const ESTADO_NOVEDAD_COLORS = { pendiente: 'warning', aprobada: 'success', rechazada: 'error' };
const NOVEDAD_VACIA = { tipo: 'vacaciones', fechaInicio: '', fechaFin: '', dias: '', descripcion: '', estado: 'pendiente' };

function fmtFecha(f) {
  return f ? new Date(f + 'T00:00:00').toLocaleDateString('es-CO') : '—';
}

function DialogNovedad({ open, onClose, novedad, empleadoId, onSaved }) {
  const [form, setForm]     = useState(NOVEDAD_VACIA);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    setForm(novedad ? {
      tipo:        novedad.tipo,
      fechaInicio: novedad.fechaInicio ?? '',
      fechaFin:    novedad.fechaFin    ?? '',
      dias:        novedad.dias        ?? '',
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
        fechaFin:    form.fechaFin   || null,
        dias:        form.dias       ? Number(form.dias) : null,
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
              {TIPOS_NOVEDAD.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Estado" value={form.estado} onChange={set('estado')} size="small">
              {ESTADOS_NOVEDAD.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Fecha inicio *" value={form.fechaInicio} onChange={set('fechaInicio')}
              size="small" type="date" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Fecha fin" value={form.fechaFin} onChange={set('fechaFin')}
              size="small" type="date" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Días" value={form.dias} onChange={set('dias')} size="small" type="number" />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Descripción" value={form.descripcion} onChange={set('descripcion')}
              size="small" multiline rows={2} />
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

/** @param {{ empleado: object, puedo: (mod: string, acc: string) => boolean }} props */
export function PanelNovedades({ empleado, puedo }) {
  const confirm = useConfirm();
  const [novedades, setNovedades]   = useState([]);
  const [loading,   setLoading]     = useState(true);
  const [dialog,    setDialog]      = useState(false);
  const [editNov,   setEditNov]     = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/api/talento-humano/${empleado.id}/novedades`);
      setNovedades(data);
    } finally {
      setLoading(false);
    }
  }, [empleado.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async (id) => {
    if (!await confirm('¿Eliminar esta novedad?')) return;
    await apiClient.delete(`/api/talento-humano/novedades/${id}`);
    cargar();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Novedades — {empleado.nombres} {empleado.apellidos}
        </Typography>
        {puedo('talento_humano', 'crear') && (
          <Button size="small" startIcon={<AddIcon />} onClick={() => { setEditNov(null); setDialog(true); }}>
            Nueva novedad
          </Button>
        )}
      </Box>

      {loading ? (
        <Skeleton height={120} />
      ) : novedades.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
          Sin novedades registradas para este empleado
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
                    <Chip label={n.tipo.replace(/_/g, ' ')} size="small"
                      sx={{ bgcolor: (NOVEDAD_COLORS[n.tipo] ?? '#888') + '22',
                            color:   NOVEDAD_COLORS[n.tipo] ?? '#888', fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>{fmtFecha(n.fechaInicio)}</TableCell>
                  <TableCell>{fmtFecha(n.fechaFin)}</TableCell>
                  <TableCell>{n.dias ?? '—'}</TableCell>
                  <TableCell>
                    <Chip label={n.estado} size="small" color={ESTADO_NOVEDAD_COLORS[n.estado] ?? 'default'} />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {puedo('talento_humano', 'editar') && (
                      <IconButton size="small" onClick={() => { setEditNov(n); setDialog(true); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    {puedo('talento_humano', 'eliminar') && (
                      <IconButton size="small" color="error" onClick={() => eliminar(n.id)}>
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
        open={dialog}
        onClose={() => setDialog(false)}
        novedad={editNov}
        empleadoId={empleado.id}
        onSaved={() => { setDialog(false); cargar(); }}
      />
    </Box>
  );
}

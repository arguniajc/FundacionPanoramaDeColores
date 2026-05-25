import { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '../../../../shared/components/ConfirmDialog';
import {
  Box, Typography, Button, TextField, MenuItem, Grid, Card, CardContent,
  Avatar, Chip, IconButton, Tabs, Tab, Alert, Skeleton, Tooltip,
  Badge, InputAdornment,
} from '@mui/material';
import AddIcon           from '@mui/icons-material/Add';
import EditIcon          from '@mui/icons-material/Edit';
import DeleteIcon        from '@mui/icons-material/Delete';
import SearchIcon        from '@mui/icons-material/Search';
import BadgeIcon         from '@mui/icons-material/Badge';
import PeopleIcon        from '@mui/icons-material/People';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EventNoteIcon     from '@mui/icons-material/EventNote';
import AccountTreeIcon   from '@mui/icons-material/AccountTree';
import PaymentsIcon      from '@mui/icons-material/Payments';
import apiClient         from '../../../../infrastructure/http/apiClient';
import { useAuth }       from '../../../../application/auth/AuthContext';
import { DialogEmpleado } from './components/DialogEmpleado';
import { PanelEmpleado }  from './components/PanelEmpleado';
import { PanelNovedades } from './components/PanelNovedades';
import { OrgChartTab }    from './components/OrgChartTab';
import { PanelNomina }    from './components/PanelNomina';
import { BRAND_COLOR } from '../../../../shared/constants/brand';

const CONTRATO_COLORS = {
  indefinido:           'success',
  fijo:                 'primary',
  prestacion_servicios: 'warning',
  aprendizaje:          'info',
  voluntario:           'secondary',
  otro:                 'default',
};

function iniciales(nombres, apellidos) {
  return `${nombres?.[0] ?? ''}${apellidos?.[0] ?? ''}`.toUpperCase();
}

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

export default function TalentoHumanoPage() {
  const { puedo } = useAuth();
  const confirm = useConfirm();

  const [empleados, setEmpleados] = useState([]);
  const [stats,     setStats]     = useState(null);
  const [sedes,     setSedes]     = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState('');

  const [busqueda,     setBusqueda]     = useState('');
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
    if (!await confirm('¿Eliminar este empleado? Esta acción no se puede deshacer.')) return;
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
        <Tab
          label="Nómina"
          icon={<PaymentsIcon fontSize="small" />}
          iconPosition="start"
          sx={{ minHeight: 42, py: 0, fontWeight: 600 }}
        />
      </Tabs>

      {/* ── Tab Organigrama ───────────────────────────────────────── */}
      {mainTab === 1 && (
        <OrgChartTab puedoEditar={puedo('talento_humano', 'editar')} empleados={empleados} />
      )}

      {/* ── Tab Nómina ────────────────────────────────────────────── */}
      {mainTab === 2 && (
        <PanelNomina puedo={puedo} />
      )}

      {/* ── Tab Empleados ─────────────────────────────────────────── */}
      {mainTab === 0 && <>

      {/* KPIs */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <KpiCard label="Total empleados" value={stats.total} icon={<PeopleIcon fontSize="inherit" />} color={BRAND_COLOR} />
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
                <PanelEmpleado empleado={panelEmpleado} puedo={puedo} />
              )}
              {tabPanel === 1 && (
                <PanelNovedades empleado={panelEmpleado} puedo={puedo} />
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

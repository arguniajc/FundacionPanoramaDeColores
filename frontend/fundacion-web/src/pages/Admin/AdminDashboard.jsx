import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Container,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Chip, TextField, InputAdornment, Pagination,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Tooltip, Button, Snackbar, Tabs, Tab,
  Divider, Stack,
} from '@mui/material';
import SearchIcon       from '@mui/icons-material/Search';
import DeleteIcon       from '@mui/icons-material/Delete';
import VisibilityIcon   from '@mui/icons-material/Visibility';
import EditIcon         from '@mui/icons-material/Edit';
import DownloadIcon     from '@mui/icons-material/Download';
import BlockIcon        from '@mui/icons-material/Block';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import PeopleIcon       from '@mui/icons-material/People';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PersonOffIcon    from '@mui/icons-material/PersonOff';
import LockIcon         from '@mui/icons-material/Lock';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import DetalleInscripcion from './DetalleInscripcion';
import EditarInscripcion  from './EditarInscripcion';

const POR_PAGINA = 15;

/* ── Tarjeta de estadística ─────────────────────────────────────────────────── */
function StatCard({ icon, label, value, color }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 },
      bgcolor: 'rgba(255,255,255,0.12)', borderRadius: 2,
      px: { xs: 1.5, sm: 2.5 }, py: { xs: 1, sm: 1.5 },
      border: '1px solid rgba(255,255,255,0.18)',
      minWidth: { xs: 0, sm: 130 }, flex: { xs: 1, sm: 'none' },
    }}>
      <Box sx={{ color, fontSize: { xs: '1.2rem', sm: '1.6rem' }, lineHeight: 1, display: 'flex', flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' }, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: { xs: '0.6rem', sm: '0.68rem' }, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

export default function AdminDashboard() {
  const [inscripciones,   setInscripciones]   = useState([]);
  const [total,           setTotal]           = useState(0);
  const [pagina,          setPagina]          = useState(1);
  const [buscar,          setBuscar]          = useState('');
  const [estado,          setEstado]          = useState('activos');
  const [cargando,        setCargando]        = useState(false);
  const [error,           setError]           = useState('');
  const [toast,           setToast]           = useState('');
  const [exportando,      setExportando]      = useState(false);
  const [stats,           setStats]           = useState({ activos: 0, baja: 0, total: 0 });
  const [seleccionada,    setSeleccionada]    = useState(null);
  const [editando,        setEditando]        = useState(null);
  const [idEliminar,      setIdEliminar]      = useState(null);
  const [eliminando,      setEliminando]      = useState(false);
  const [idBaja,          setIdBaja]          = useState(null);
  const [procesandoBaja,  setProcesandoBaja]  = useState(false);

  /* ── Stats ────────────────────────────────────────────────────────────────── */
  const cargarStats = useCallback(async () => {
    try {
      const [{ data: a }, { data: b }] = await Promise.all([
        api.get('/api/inscripciones', { params: { pagina: 1, porPagina: 1, estado: 'activos' } }),
        api.get('/api/inscripciones', { params: { pagina: 1, porPagina: 1, estado: 'baja'    } }),
      ]);
      setStats({ activos: a.total, baja: b.total, total: a.total + b.total });
    } catch { /* silencioso */ }
  }, []);

  /* ── Tabla ────────────────────────────────────────────────────────────────── */
  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try {
      const { data } = await api.get('/api/inscripciones', {
        params: { pagina, porPagina: POR_PAGINA, buscar: buscar || undefined, estado },
      });
      setInscripciones(data.data);
      setTotal(data.total);
    } catch {
      setError('No se pudieron cargar los beneficiarios.');
    } finally {
      setCargando(false);
    }
  }, [pagina, buscar, estado]);

  useEffect(() => { cargarStats(); }, [cargarStats]);
  useEffect(() => { cargar(); },      [cargar]);
  useEffect(() => { setPagina(1); },  [buscar, estado]);

  /* ── Dar de baja ──────────────────────────────────────────────────────────── */
  const handleDarDeBaja = async () => {
    if (!idBaja) return;
    setProcesandoBaja(true);
    try {
      await api.patch(`/api/inscripciones/${idBaja}/baja`);
      setIdBaja(null);
      setToast('Beneficiario dado de baja correctamente');
      cargar(); cargarStats();
    } catch { setError('No se pudo dar de baja al beneficiario.'); }
    finally   { setProcesandoBaja(false); }
  };

  const handleReactivar = async (id) => {
    try {
      await api.patch(`/api/inscripciones/${id}/reactivar`);
      setToast('Beneficiario reactivado correctamente');
      cargar(); cargarStats();
    } catch { setError('No se pudo reactivar el beneficiario.'); }
  };

  /* ── Eliminar ─────────────────────────────────────────────────────────────── */
  const handleEliminar = async () => {
    if (!idEliminar) return;
    setEliminando(true);
    try {
      await api.delete(`/api/inscripciones/${idEliminar}`);
      setIdEliminar(null);
      setToast('Registro eliminado permanentemente');
      cargar(); cargarStats();
    } catch { setError('No se pudo eliminar el registro.'); }
    finally  { setEliminando(false); }
  };

  const handleGuardadoEdicion = () => {
    setEditando(null);
    setToast('Beneficiario actualizado correctamente');
    cargar();
  };

  /* ── Excel ────────────────────────────────────────────────────────────────── */
  const exportarExcel = async () => {
    setExportando(true);
    setToast('Preparando exportación completa…');
    try {
      const { data } = await api.get('/api/inscripciones', {
        params: { pagina: 1, porPagina: 9999, estado: 'todos' },
      });
      const todos = data.data;
      if (!todos.length) { setToast('No hay datos para exportar'); return; }

      const encabezados = [
        'NOMBRE', 'F. NACIMIENTO', 'TIPO DOC.', 'N° DOCUMENTO',
        'EDAD', 'EPS', 'T. CAMISA', 'T. PANTALÓN', 'T. ZAPATOS',
        'ALERGIA', 'DESC. ALERGIA', 'OBS. SALUD',
        'ACUDIENTE', 'PARENTESCO', 'WHATSAPP', 'DIRECCIÓN',
        'ESTADO', 'F. INSCRIPCIÓN',
      ];
      const filas = todos.map(ins => [
        ins.nombreMenor           || '—',
        ins.fechaNacimiento       || '—',
        ins.tipoDocumento         || '—',
        ins.numeroDocumento       || '—',
        calcularEdad(ins.fechaNacimiento),
        ins.eps                   || '—',
        ins.tallaCamisa           || '—',
        ins.tallaPantalon         || '—',
        ins.tallaZapatos          || '—',
        ins.tieneAlergia === 'si' ? 'Sí' : 'No',
        ins.descripcionAlergia    || '—',
        ins.observacionesSalud    || '—',
        ins.nombreAcudiente       || '—',
        ins.parentesco            || '—',
        ins.whatsapp              || '—',
        ins.direccion             || '—',
        ins.activo ? 'Activo' : 'Baja',
        ins.createdAt ? new Date(ins.createdAt).toLocaleDateString('es-CO') : '—',
      ]);

      const hoja = XLSX.utils.aoa_to_sheet([encabezados, ...filas]);
      hoja['!cols'] = [30,15,14,18,10,20,10,11,10,10,30,30,30,14,18,30,12,16].map(wch => ({ wch }));
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, 'Beneficiarios');
      XLSX.writeFile(libro, `beneficiarios_${new Date().toISOString().slice(0,10)}.xlsx`);
      setToast(`${todos.length} registros exportados`);
    } catch {
      setToast('Error al generar el Excel. Intenta de nuevo.');
    } finally {
      setExportando(false);
    }
  };

  const totalPaginas = Math.ceil(total / POR_PAGINA);

  const TABS = [
    { value: 'activos', label: `Activos (${stats.activos})` },
    { value: 'baja',    label: `Baja (${stats.baja})` },
    { value: 'todos',   label: `Todos (${stats.total})` },
  ];

  /* ── Estilos de hover (texto negro, fondo lavanda suave) ─────────────────── */
  const hoverSx = (activo) => ({
    bgcolor: activo ? '#ede7f6 !important' : '#f5f5f5 !important',
    '& .MuiTableCell-root': { color: '#1a1a1a !important' },
    '& .MuiTableCell-root:first-of-type': { borderLeft: '3px solid #7C3AED' },
    '& a': { color: '#1a6b35 !important' },
  });

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>

      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #4E1B95 0%, #3a1470 60%, #2D984F 100%)',
        px: { xs: 2, sm: 3, md: 4 },
        pt: { xs: 2, sm: 3 },
        pb: { xs: 2, sm: 3 },
      }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          {/* Título */}
          <Box>
            <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.3 }}>
              Módulo
            </Typography>
            <Typography sx={{ fontSize: { xs: '1.3rem', sm: '1.6rem' }, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              Beneficiarios
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', mt: 0.3 }}>
              Gestión de niños y niñas inscritos
            </Typography>
          </Box>
          {/* Stats */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap', width: { xs: '100%', sm: 'auto' } }}>
            <StatCard icon={<PeopleIcon />}       label="Total"   value={stats.total}   color="#B4E8E8" />
            <StatCard icon={<VerifiedUserIcon />} label="Activos" value={stats.activos} color="#81c784" />
            <StatCard icon={<PersonOffIcon />}    label="Baja"    value={stats.baja}    color="#ef9a9a" />
          </Box>
        </Box>
      </Box>

      {/* ── Contenido ──────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1 }}>
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>

          {/* Búsqueda + Export */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ mb: 2 }}
          >
            <TextField
              placeholder="Buscar nombre, documento, acudiente…"
              size="small"
              fullWidth
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              sx={{ maxWidth: { sm: 480 } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: '#9e9e9e' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Tooltip title="Exporta TODOS los beneficiarios de la base de datos">
              <Button
                variant="contained"
                size="small"
                startIcon={exportando ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
                onClick={exportarExcel}
                disabled={exportando}
                sx={{
                  bgcolor: '#2D984F', '&:hover': { bgcolor: '#1e6e38' },
                  whiteSpace: 'nowrap', fontWeight: 700, borderRadius: 2,
                  flexShrink: 0,
                }}
              >
                {exportando ? 'Exportando…' : 'Exportar Excel'}
              </Button>
            </Tooltip>
          </Stack>

          {/* Tabs */}
          <Tabs
            value={estado}
            onChange={(_, v) => setEstado(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              mb: 2,
              '& .MuiTab-root':       { fontWeight: 600, textTransform: 'none', minHeight: 40, fontSize: '0.85rem' },
              '& .Mui-selected':      { color: '#4E1B95' },
              '& .MuiTabs-indicator': { bgcolor: '#4E1B95', height: 3, borderRadius: 2 },
            }}
          >
            {TABS.map(t => <Tab key={t.value} value={t.value} label={t.label} />)}
          </Tabs>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Tabla */}
          <TableContainer component={Paper} elevation={0} sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            overflowX: 'auto',
          }}>
            <Table size="small" sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{
                  background: 'linear-gradient(90deg, #4E1B95, #3a1470)',
                  '& .MuiTableCell-root': {
                    color: '#fff', fontWeight: 700, fontSize: '0.8rem',
                    py: 1.5, borderBottom: 'none', whiteSpace: 'nowrap',
                  },
                }}>
                  {['Nombre del menor', 'Documento', 'Edad', 'WhatsApp', 'Alergia', 'Estado', 'Acciones'].map(h => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {cargando ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} sx={{ color: '#4E1B95' }} />
                    </TableCell>
                  </TableRow>
                ) : inscripciones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No se encontraron beneficiarios.
                    </TableCell>
                  </TableRow>
                ) : (
                  inscripciones.map((ins, idx) => (
                    <TableRow
                      key={ins.id}
                      hover
                      onClick={() => setSeleccionada(ins)}
                      sx={{
                        cursor: 'pointer',
                        opacity: ins.activo ? 1 : 0.65,
                        bgcolor: idx % 2 === 0 ? 'inherit' : 'rgba(78,27,149,0.04)',
                        transition: 'background 0.15s, opacity 0.15s',
                        '&:hover': hoverSx(ins.activo),
                        '&:last-child td': { borderBottom: 0 },
                      }}
                    >
                      <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', color: 'text.primary' }}>
                        {ins.nombreMenor}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', whiteSpace: 'nowrap', color: 'text.secondary' }}>
                        {ins.tipoDocumento} {ins.numeroDocumento || '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', whiteSpace: 'nowrap', color: 'text.primary' }}>
                        {calcularEdad(ins.fechaNacimiento)}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {ins.whatsapp ? (
                          <a
                            href={`https://wa.me/${ins.whatsapp.replace(/\D/g, '')}`}
                            target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ color: '#2D984F', textDecoration: 'none', fontWeight: 700 }}
                          >
                            {ins.whatsapp}
                          </a>
                        ) : '—'}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Chip
                          label={ins.tieneAlergia === 'si' ? 'Sí' : 'No'}
                          color={ins.tieneAlergia === 'si' ? 'warning' : 'default'}
                          size="small"
                          sx={{ fontSize: '0.72rem', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Chip
                          label={ins.activo ? 'Activo' : 'Baja'}
                          size="small"
                          sx={{
                            fontSize: '0.72rem', fontWeight: 700,
                            bgcolor: ins.activo ? '#e8f5e9' : '#fce4ec',
                            color:   ins.activo ? '#2e7d32' : '#c62828',
                          }}
                        />
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()} sx={{ whiteSpace: 'nowrap', pr: 0.5 }}>
                        <Tooltip title="Ver detalle">
                          <IconButton size="small" sx={{ color: '#4E1B95', '&:hover': { bgcolor: 'rgba(78,27,149,0.1)' } }} onClick={() => setSeleccionada(ins)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton size="small" sx={{ color: '#1976d2', '&:hover': { bgcolor: 'rgba(25,118,210,0.1)' } }} onClick={() => setEditando(ins)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {ins.activo ? (
                          <Tooltip title="Dar de baja">
                            <IconButton size="small" sx={{ color: '#e65100', '&:hover': { bgcolor: 'rgba(230,81,0,0.1)' } }} onClick={() => setIdBaja(ins.id)}>
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Reactivar">
                            <IconButton size="small" sx={{ color: '#2e7d32', '&:hover': { bgcolor: 'rgba(46,125,50,0.1)' } }} onClick={() => handleReactivar(ins.id)}>
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Eliminar permanentemente">
                          <IconButton size="small" sx={{ color: '#c62828', '&:hover': { bgcolor: 'rgba(198,40,40,0.1)' } }} onClick={() => setIdEliminar(ins.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPaginas}
                page={pagina}
                onChange={(_, v) => setPagina(v)}
                size="small"
                sx={{
                  '& .Mui-selected': { bgcolor: '#4E1B95 !important', color: '#fff' },
                  '& .MuiPaginationItem-root': { fontWeight: 600 },
                }}
              />
            </Box>
          )}

          {/* Footer */}
          <Box sx={{ mt: 5, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
              <LockIcon sx={{ fontSize: '1rem', color: '#4E1B95', mt: '2px', flexShrink: 0 }} />
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#4E1B95', display: 'block', mb: 0.3 }}>
                  Aviso de confidencialidad
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  La información contenida en este panel es de carácter <strong>estrictamente confidencial</strong> y de uso exclusivo del personal autorizado de la fundación.
                  Queda prohibida su reproducción, divulgación o uso no autorizado. El acceso indebido a estos datos puede constituir una infracción a la <strong>Ley 1581 de 2012</strong> (Protección de Datos Personales).
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Fundación Panorama de Colores</strong> · Entidad sin ánimo de lucro · NIT registrado ante la DIAN
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Panel Administrativo · {new Date().getFullYear()}
              </Typography>
            </Box>
          </Box>

        </Container>
      </Box>

      {/* ── Modales ────────────────────────────────────────────────────────── */}
      {seleccionada && (
        <DetalleInscripcion
          inscripcion={seleccionada}
          onCerrar={() => setSeleccionada(null)}
          onEditar={() => { setEditando(seleccionada); setSeleccionada(null); }}
          onEliminar={() => { setIdEliminar(seleccionada.id); setSeleccionada(null); }}
        />
      )}
      {editando && (
        <EditarInscripcion
          inscripcion={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={handleGuardadoEdicion}
        />
      )}

      <Dialog open={!!idBaja} onClose={() => setIdBaja(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#e65100', fontWeight: 700, pb: 1 }}>
          ¿Dar de baja al beneficiario?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            El beneficiario quedará inactivo pero su información se conservará. Podrás reactivarlo en cualquier momento.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIdBaja(null)} variant="outlined">Cancelar</Button>
          <Button variant="contained" onClick={handleDarDeBaja} disabled={procesandoBaja}
            sx={{ bgcolor: '#e65100', '&:hover': { bgcolor: '#bf360c' } }}>
            {procesandoBaja ? 'Procesando…' : 'Dar de baja'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!idEliminar} onClose={() => setIdEliminar(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#c62828', fontWeight: 700, pb: 1 }}>
          ¿Eliminar permanentemente?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Esta acción no se puede deshacer. El registro se borrará definitivamente de la base de datos.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIdEliminar(null)} variant="outlined">Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleEliminar} disabled={eliminando}>
            {eliminando ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

export function calcularEdad(fechaNac) {
  if (!fechaNac) return '—';
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return `${edad} años`;
}

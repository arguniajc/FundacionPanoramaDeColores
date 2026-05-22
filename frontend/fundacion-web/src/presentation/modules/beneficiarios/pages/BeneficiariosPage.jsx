import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Container,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Chip, TextField, InputAdornment, Pagination,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Tooltip, Button, Snackbar, Tabs, Tab,
  Divider, Stack,
} from '@mui/material';
import SearchIcon           from '@mui/icons-material/Search';
import VisibilityIcon       from '@mui/icons-material/Visibility';
import EditIcon             from '@mui/icons-material/Edit';
import DownloadIcon         from '@mui/icons-material/Download';
import BlockIcon            from '@mui/icons-material/Block';
import CheckCircleIcon      from '@mui/icons-material/CheckCircle';
import PeopleIcon           from '@mui/icons-material/People';
import VerifiedUserIcon     from '@mui/icons-material/VerifiedUser';
import PersonOffIcon        from '@mui/icons-material/PersonOff';
import LockIcon             from '@mui/icons-material/Lock';
import WhatsAppIcon         from '@mui/icons-material/WhatsApp';
import BarChartIcon         from '@mui/icons-material/BarChart';
import PersonAddIcon        from '@mui/icons-material/PersonAdd';
import SyncIcon             from '@mui/icons-material/Sync';
import UploadFileIcon       from '@mui/icons-material/UploadFile';
import DeleteForeverIcon    from '@mui/icons-material/DeleteForever';
import * as XLSX from 'xlsx';
import apiClient                                        from '../../../../infrastructure/http/apiClient';
import { useAuth }          from '../../../../application/auth/AuthContext';
import { cacheKey, leerCache, escribirCache, limpiarCache } from '../../../../infrastructure/cache/sessionCache';
import { calcularEdad }     from '../../../../shared/utils/fecha';
import DetalleInscripcion   from '../components/DetalleInscripcion';
import EditarInscripcion    from '../components/EditarInscripcion';
import NuevoBeneficiario    from '../components/NuevoBeneficiario';
import { ModalEstadisticas, StatCard } from './components/ModalEstadisticas';
import { ImportarBeneficiariosDialog } from './components/ImportarBeneficiariosDialog';

const POR_PAGINA = 15;

export default function BeneficiariosPage() {
  const { esAdmin } = useAuth();
  const [inscripciones,  setInscripciones]  = useState([]);
  const [total,          setTotal]          = useState(0);
  const [pagina,         setPagina]         = useState(1);
  const [buscar,         setBuscar]         = useState('');
  const [estado,         setEstado]         = useState('activos');
  const [cargando,       setCargando]       = useState(false);
  const [error,          setError]          = useState('');
  const [toast,          setToast]          = useState('');
  const [exportando,     setExportando]     = useState(false);
  const [stats,          setStats]          = useState({ activos: 0, baja: 0, total: 0 });
  const [statsDetalle,   setStatsDetalle]   = useState(null);
  const [cargandoStats,  setCargandoStats]  = useState(false);
  const [modalStats,     setModalStats]     = useState(false);
  const [seleccionada,   setSeleccionada]   = useState(null);
  const [editando,       setEditando]       = useState(null);
  const [creando,        setCreando]        = useState(false);
  const [idBaja,         setIdBaja]         = useState(null);
  const [motivoBaja,     setMotivoBaja]     = useState('');
  const [procesandoBaja, setProcesandoBaja] = useState(false);
  const [actualizando,   setActualizando]   = useState(false);
  const [importDialog,   setImportDialog]   = useState(false);
  const [eliminar,       setEliminar]       = useState(null);   // { id, nombre }
  const [eliminando,     setEliminando]     = useState(false);
  const [errorEliminar,  setErrorEliminar]  = useState('');

  const cargarStatsDetalle = useCallback(async () => {
    setCargandoStats(true);
    try {
      const { data } = await apiClient.get('/api/beneficiarios/stats');
      setStatsDetalle(data);
      setStats({ activos: data.activos ?? 0, baja: data.baja ?? 0, total: data.total ?? 0 });
    } catch { /* silencioso */ }
    finally { setCargandoStats(false); }
  }, []);

  const cargar = useCallback(async (forzar = false) => {
    const key    = cacheKey(estado, pagina, buscar);
    const cached = !forzar && leerCache(key);

    if (cached) {
      setInscripciones(cached.data);
      setTotal(cached.total);
      setActualizando(true);
      try {
        const { data } = await apiClient.get('/api/beneficiarios', {
          params: { pagina, porPagina: POR_PAGINA, buscar: buscar || undefined, estado },
        });
        setInscripciones(data.data);
        setTotal(data.total);
        escribirCache(key, data.data, data.total);
      } catch { /* mantener caché si falla la red */ }
      finally { setActualizando(false); }
      return;
    }

    setCargando(true); setActualizando(false); setError('');
    try {
      const { data } = await apiClient.get('/api/beneficiarios', {
        params: { pagina, porPagina: POR_PAGINA, buscar: buscar || undefined, estado },
      });
      setInscripciones(data.data);
      setTotal(data.total);
      escribirCache(key, data.data, data.total);
    } catch {
      setError('No se pudieron cargar los beneficiarios.');
    } finally { setCargando(false); }
  }, [pagina, buscar, estado]);

  useEffect(() => { cargarStatsDetalle(); }, [cargarStatsDetalle]);
  useEffect(() => { cargar(); },     [cargar]);
  useEffect(() => { setPagina(1); }, [buscar, estado]);

  const handleDarDeBaja = async () => {
    if (!idBaja) return;
    setProcesandoBaja(true);
    try {
      await apiClient.patch(`/api/beneficiarios/${idBaja}/baja`, { motivo: motivoBaja || null });
      setIdBaja(null); setMotivoBaja('');
      setToast('Beneficiario dado de baja correctamente');
      limpiarCache(); cargar(true); cargarStatsDetalle();
    } catch { setError('No se pudo dar de baja al beneficiario.'); }
    finally  { setProcesandoBaja(false); }
  };

  const handleReactivar = async (id) => {
    try {
      await apiClient.patch(`/api/beneficiarios/${id}/reactivar`);
      setToast('Beneficiario reactivado correctamente');
      limpiarCache(); cargar(true); cargarStatsDetalle();
    } catch { setError('No se pudo reactivar el beneficiario.'); }
  };

  const handleEliminarPermanente = async () => {
    if (!eliminar) return;
    setEliminando(true); setErrorEliminar('');
    try {
      await apiClient.delete(`/api/beneficiarios/${eliminar.id}`);
      setEliminar(null);
      setToast('Beneficiario eliminado permanentemente.');
      limpiarCache(); cargar(true); cargarStatsDetalle();
    } catch (e) {
      setErrorEliminar(e?.response?.data?.mensaje || 'No se pudo eliminar el beneficiario.');
    } finally {
      setEliminando(false);
    }
  };

  const handleGuardadoEdicion = () => {
    setEditando(null);
    setToast('Beneficiario actualizado correctamente');
    limpiarCache(); cargar(true); cargarStatsDetalle();
  };

  const handleBeneficiarioCreado = () => {
    setCreando(false);
    setToast('Beneficiario inscrito correctamente');
    limpiarCache(); cargar(true); cargarStatsDetalle();
  };

  const exportarExcel = async () => {
    setExportando(true);
    setToast('Preparando exportación completa…');
    try {
      const { data } = await apiClient.get('/api/beneficiarios', {
        params: { pagina: 1, porPagina: 9999, estado: 'todos' },
      });
      const todos = data.data;
      if (!todos.length) { setToast('No hay datos para exportar'); return; }

      const encabezados = [
        'NOMBRE','F. NACIMIENTO','TIPO DOC.','N° DOCUMENTO',
        'EDAD','EPS','T. CAMISA','T. PANTALÓN','T. ZAPATOS',
        'ALERGIA','DESC. ALERGIA','OBS. SALUD',
        'ACUDIENTE','PARENTESCO','WHATSAPP','DIRECCIÓN',
        'ESTADO','F. INSCRIPCIÓN',
      ];
      const filas = todos.map(ins => [
        ins.nombreMenor        || '—', ins.fechaNacimiento  || '—',
        ins.tipoDocumento      || '—', ins.numeroDocumento  || '—',
        calcularEdad(ins.fechaNacimiento),
        ins.eps                || '—', ins.tallaCamisa      || '—',
        ins.tallaPantalon      || '—', ins.tallaZapatos     || '—',
        ins.tieneAlergia === 'si' ? 'Sí' : 'No',
        ins.descripcionAlergia || '—', ins.observacionesSalud || '—',
        ins.nombreAcudiente    || '—', ins.parentesco       || '—',
        ins.whatsapp           || '—', ins.direccion        || '—',
        ins.activo ? 'Activo' : 'Baja',
        ins.createdAt ? new Date(ins.createdAt).toLocaleDateString('es-CO') : '—',
      ]);

      const hoja = XLSX.utils.aoa_to_sheet([encabezados, ...filas]);
      hoja['!cols'] = [30,15,14,18,10,20,10,11,10,10,30,30,30,14,18,30,12,16].map(wch => ({ wch }));
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, 'Beneficiarios');
      XLSX.writeFile(libro, `beneficiarios_${new Date().toISOString().slice(0,10)}.xlsx`);
      setToast(`${todos.length} registros exportados`);
    } catch { setToast('Error al generar el Excel. Intenta de nuevo.'); }
    finally  { setExportando(false); }
  };

  const totalPaginas = Math.ceil(total / POR_PAGINA);
  const TABS = [
    { value: 'activos', label: `Activos (${stats.activos})` },
    { value: 'baja',    label: `Baja (${stats.baja})` },
    { value: 'todos',   label: `Todos (${stats.total})` },
  ];

  const HOVER_SX = {
    bgcolor: '#ede7f6 !important',
    '& .MuiTableCell-root': { color: '#1a1a1a !important' },
    '& .MuiTableCell-root:first-of-type': { borderLeft: '3px solid #7C3AED' },
    '& a': { color: '#1a6b35 !important' },
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>

      <Box sx={{
        background: 'linear-gradient(135deg, var(--color-primario) 0%, #3a1470 60%, #2D984F 100%)',
        px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 },
      }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
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
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, width: { xs: '100%', sm: 'auto' }, alignItems: { xs: 'stretch', sm: 'center' } }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <StatCard icon={<PeopleIcon />}       label="Total"   value={stats.total}   color="#B4E8E8" />
              <StatCard icon={<VerifiedUserIcon />} label="Activos" value={stats.activos} color="#81c784" />
              <StatCard icon={<PersonOffIcon />}    label="Baja"    value={stats.baja}    color="#ef9a9a" />
            </Box>
            <Button
              variant="contained" size="small"
              startIcon={<UploadFileIcon />}
              onClick={() => setImportDialog(true)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.12)',
                border: '1.5px solid rgba(255,255,255,0.25)',
                color: '#fff', fontWeight: 700,
                borderRadius: 2, whiteSpace: 'nowrap',
                backdropFilter: 'blur(6px)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
              }}
            >
              Importar CSV
            </Button>
            <Button
              variant="contained" size="small"
              startIcon={<PersonAddIcon />}
              onClick={() => setCreando(true)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.18)',
                border: '1.5px solid rgba(255,255,255,0.35)',
                color: '#fff', fontWeight: 700,
                borderRadius: 2, whiteSpace: 'nowrap',
                backdropFilter: 'blur(6px)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' },
              }}
            >
              Nuevo beneficiario
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1 }}>
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
            <TextField
              placeholder="Buscar nombre, documento, acudiente…"
              size="small" fullWidth
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              sx={{ maxWidth: { sm: 420 } }}
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
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <Tooltip title="Ver estadísticas detalladas de beneficiarios">
                <Button
                  variant="contained" size="small"
                  startIcon={cargandoStats ? <CircularProgress size={14} color="inherit" /> : <BarChartIcon />}
                  onClick={() => setModalStats(true)}
                  disabled={cargandoStats}
                  sx={{ bgcolor: 'var(--color-primario)', '&:hover': { bgcolor: '#3a1470' }, whiteSpace: 'nowrap', fontWeight: 700, borderRadius: 2 }}
                >
                  Estadísticas
                </Button>
              </Tooltip>
              <Tooltip title="Exporta TODOS los beneficiarios de la base de datos">
                <Button
                  variant="contained" size="small"
                  startIcon={exportando ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
                  onClick={exportarExcel} disabled={exportando}
                  sx={{ bgcolor: '#2D984F', '&:hover': { bgcolor: '#1e6e38' }, whiteSpace: 'nowrap', fontWeight: 700, borderRadius: 2, flexShrink: 0 }}
                >
                  {exportando ? 'Exportando…' : 'Exportar Excel'}
                </Button>
              </Tooltip>
            </Box>
          </Stack>

          <Tabs
            value={estado} onChange={(_, v) => setEstado(v)}
            variant="scrollable" scrollButtons="auto"
            sx={{
              mb: 2,
              '& .MuiTab-root':       { fontWeight: 600, textTransform: 'none', minHeight: 40, fontSize: '0.85rem' },
              '& .Mui-selected':      { color: 'var(--color-primario)' },
              '& .MuiTabs-indicator': { bgcolor: 'var(--color-primario)', height: 3, borderRadius: 2 },
            }}
          >
            {TABS.map(t => <Tab key={t.value} value={t.value} label={t.label} />)}
          </Tabs>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {actualizando && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1, opacity: 0.6 }}>
              <SyncIcon sx={{ fontSize: '0.85rem', color: 'var(--color-primario)', animation: 'spin 1.2s linear infinite',
                '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />
              <Typography variant="caption" color="text.secondary">Actualizando…</Typography>
            </Box>
          )}

          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{
                  background: 'linear-gradient(90deg, var(--color-primario), #3a1470)',
                  '& .MuiTableCell-root': { color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.5, borderBottom: 'none', whiteSpace: 'nowrap' },
                }}>
                  <TableCell>Nombre del menor</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Documento</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Edad</TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Género</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>WhatsApp</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Alergia</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {cargando ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress size={32} sx={{ color: 'var(--color-primario)' }} /></TableCell></TableRow>
                ) : inscripciones.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>No se encontraron beneficiarios.</TableCell></TableRow>
                ) : (
                  inscripciones.map((ins, idx) => (
                    <TableRow
                      key={ins.id} hover
                      onClick={() => setSeleccionada(ins)}
                      sx={{
                        cursor: 'pointer',
                        opacity: ins.activo ? 1 : 0.65,
                        bgcolor: idx % 2 === 0 ? 'inherit' : 'rgba(78,27,149,0.04)',
                        transition: 'background 0.15s',
                        '&:hover': HOVER_SX,
                        '&:last-child td': { borderBottom: 0 },
                      }}
                    >
                      <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.primary' }}>
                        <Box display="flex" alignItems="center" gap={0.8} flexWrap="wrap">
                          {ins.nombreMenor}
                          {!ins.fotoMenorUrl && (
                            <Tooltip title="Foto del menor pendiente — haz clic en Editar para cargarla">
                              <Chip
                                label="📷 Foto" size="small"
                                onClick={e => { e.stopPropagation(); setEditando(ins); }}
                                sx={{ fontSize: '0.65rem', fontWeight: 700, bgcolor: '#fff3e0', color: '#e65100', cursor: 'pointer', height: 18, '& .MuiChip-label': { px: 0.8 } }}
                              />
                            </Tooltip>
                          )}
                          {!ins.fotoDocumentoUrl && (
                            <Tooltip title="Documento de identidad pendiente — haz clic en Editar para cargarlo">
                              <Chip
                                label="📄 Doc." size="small"
                                onClick={e => { e.stopPropagation(); setEditando(ins); }}
                                sx={{ fontSize: '0.65rem', fontWeight: 700, bgcolor: '#fce4ec', color: '#c62828', cursor: 'pointer', height: 18, '& .MuiChip-label': { px: 0.8 } }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                        <Typography sx={{ display: { xs: 'block', sm: 'none' }, fontSize: '0.72rem', color: 'text.secondary', mt: 0.3 }}>
                          {ins.tipoDocumento} {ins.numeroDocumento || '—'} · {calcularEdad(ins.fechaNacimiento)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', whiteSpace: 'nowrap', color: 'text.secondary', display: { xs: 'none', sm: 'table-cell' } }}>
                        {ins.tipoDocumento} {ins.numeroDocumento || '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', whiteSpace: 'nowrap', color: 'text.primary', display: { xs: 'none', sm: 'table-cell' } }}>
                        {calcularEdad(ins.fechaNacimiento)}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', display: { xs: 'none', lg: 'table-cell' }, fontSize: '0.82rem', color: 'text.secondary' }}>
                        {ins.genero || '—'}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>
                        {ins.whatsapp ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title="Abrir en WhatsApp">
                              <IconButton
                                size="small"
                                component="a"
                                href={`https://wa.me/${ins.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                onClick={e => e.stopPropagation()}
                                sx={{ color: '#25D366', p: 0.3, '&:hover': { bgcolor: 'rgba(37,211,102,0.12)' } }}
                              >
                                <WhatsAppIcon sx={{ fontSize: '1rem' }} />
                              </IconButton>
                            </Tooltip>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'text.primary' }}>
                              {ins.whatsapp}
                            </Typography>
                          </Box>
                        ) : '—'}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}>
                        <Chip
                          label={ins.tieneAlergia === 'si' ? 'Sí' : 'No'}
                          color={ins.tieneAlergia === 'si' ? 'warning' : 'default'}
                          size="small" sx={{ fontSize: '0.72rem', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Chip
                          label={ins.activo ? 'Activo' : 'Baja'} size="small"
                          sx={{
                            fontSize: '0.72rem', fontWeight: 700,
                            bgcolor: ins.activo ? '#e8f5e9' : '#fce4ec',
                            color:   ins.activo ? '#2e7d32' : '#c62828',
                          }}
                        />
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()} sx={{ whiteSpace: 'nowrap', pr: 0.5 }}>
                        <Tooltip title="Ver detalle">
                          <IconButton size="small" sx={{ color: 'var(--color-primario)', '&:hover': { bgcolor: 'rgba(78,27,149,0.1)' } }} onClick={() => setSeleccionada(ins)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton size="small" sx={{ color: '#1976d2', '&:hover': { bgcolor: 'rgba(25,118,210,0.1)' } }} onClick={() => setEditando(ins)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {esAdmin && (ins.activo ? (
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
                        ))}
                        {esAdmin && (
                          <Tooltip title="Eliminar de la BD (irreversible)">
                            <IconButton size="small" sx={{ color: '#c62828', '&:hover': { bgcolor: 'rgba(198,40,40,0.1)' } }}
                              onClick={() => { setEliminar({ id: ins.id, nombre: ins.nombreMenor }); setErrorEliminar(''); }}>
                              <DeleteForeverIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPaginas > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination count={totalPaginas} page={pagina} onChange={(_, v) => setPagina(v)} size="small"
                sx={{ '& .Mui-selected': { bgcolor: 'var(--color-primario) !important', color: '#fff' }, '& .MuiPaginationItem-root': { fontWeight: 600 } }}
              />
            </Box>
          )}

          <Box sx={{ mt: 5, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
              <LockIcon sx={{ fontSize: '1rem', color: 'var(--color-primario)', mt: '2px', flexShrink: 0 }} />
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--color-primario)', display: 'block', mb: 0.3 }}>Aviso de confidencialidad</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  La información contenida en este panel es de carácter <strong>estrictamente confidencial</strong> y de uso exclusivo del personal autorizado de la fundación.
                  Queda prohibida su reproducción, divulgación o uso no autorizado. El acceso indebido a estos datos puede constituir una infracción a la <strong>Ley 1581 de 2012</strong>.
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Fundación Panorama de Colores</strong> · Entidad sin ánimo de lucro · NIT registrado ante la DIAN
              </Typography>
              <Typography variant="caption" color="text.secondary">Panel Administrativo · {new Date().getFullYear()}</Typography>
            </Box>
          </Box>

        </Container>
      </Box>

      <ImportarBeneficiariosDialog
        open={importDialog}
        onClose={() => setImportDialog(false)}
        onImportado={() => { limpiarCache(); cargar(true); cargarStatsDetalle(); }}
      />

      <ModalEstadisticas
        open={modalStats}
        onClose={() => setModalStats(false)}
        stats={statsDetalle}
        cargando={cargandoStats}
      />

      {creando && (
        <NuevoBeneficiario onCerrar={() => setCreando(false)} onCreado={handleBeneficiarioCreado} />
      )}

      {seleccionada && (
        <DetalleInscripcion
          inscripcion={seleccionada}
          onCerrar={() => setSeleccionada(null)}
          onEditar={() => { setEditando(seleccionada); setSeleccionada(null); }}
        />
      )}
      {editando && (
        <EditarInscripcion inscripcion={editando} onCerrar={() => setEditando(null)} onGuardado={handleGuardadoEdicion} />
      )}

      <Dialog open={!!idBaja} onClose={() => { setIdBaja(null); setMotivoBaja(''); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#e65100', fontWeight: 700, pb: 1 }}>¿Dar de baja al beneficiario?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>El beneficiario quedará inactivo pero su información se conservará. Podrás reactivarlo en cualquier momento.</DialogContentText>
          <TextField
            fullWidth label="Motivo de retiro" size="small" multiline rows={2}
            value={motivoBaja}
            onChange={e => setMotivoBaja(e.target.value)}
            placeholder="Ej: Cambio de domicilio, solicitud del acudiente..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setIdBaja(null); setMotivoBaja(''); }} variant="outlined">Cancelar</Button>
          <Button variant="contained" onClick={handleDarDeBaja} disabled={procesandoBaja}
            sx={{ bgcolor: '#e65100', '&:hover': { bgcolor: '#bf360c' } }}>
            {procesandoBaja ? 'Procesando…' : 'Dar de baja'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!eliminar} onClose={() => { if (!eliminando) { setEliminar(null); setErrorEliminar(''); } }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#c62828', fontWeight: 700, pb: 1 }}>
          Eliminar beneficiario de la BD
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: errorEliminar ? 1.5 : 0 }}>
            ¿Eliminar permanentemente a <strong>{eliminar?.nombre}</strong>?
            Esta acción borra todos sus datos de perfil y <strong>no se puede deshacer</strong>.
            Solo es posible si el beneficiario no tiene inscripciones ni movimientos de inventario vinculados.
          </DialogContentText>
          {errorEliminar && <Alert severity="error" sx={{ mt: 1 }}>{errorEliminar}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setEliminar(null); setErrorEliminar(''); }} disabled={eliminando} variant="outlined">
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleEliminarPermanente} disabled={eliminando}
            startIcon={eliminando ? <CircularProgress size={16} color="inherit" /> : <DeleteForeverIcon />}
            sx={{ bgcolor: '#c62828', '&:hover': { bgcolor: '#b71c1c' } }}>
            {eliminando ? 'Eliminando…' : 'Eliminar permanentemente'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast('')} message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}

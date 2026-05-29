import { useState } from 'react';
import {
  Box, Typography, Container,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Chip, TextField, InputAdornment, Pagination,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Tooltip, Button, Snackbar, Tabs, Tab,
  Divider, Stack, Collapse, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import SearchIcon           from '@mui/icons-material/Search';
import FilterListIcon       from '@mui/icons-material/FilterList';
import FilterListOffIcon    from '@mui/icons-material/FilterListOff';
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
import EscalatorWarningIcon from '@mui/icons-material/EscalatorWarning';
import { calcularEdad }     from '@/shared/utils/fecha';

function calcularCompletitudAdulto(ins) {
  const checks = [
    !!ins.fotoMenorUrl,
    !!ins.fotoDocumentoUrl,
    !!(ins.eps && ins.eps !== 'No registra'),
    !!(ins.whatsapp),
    !!(ins.direccion && ins.direccion !== 'No registra'),
    !!(ins.tallaCamisa && ins.tallaCamisa !== 'No registra'),
    !!(ins.tallaZapatos && ins.tallaZapatos !== 'No registra'),
    !!(ins.pesoKg && ins.pesoKg > 0),
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

import DetalleInscripcion   from '@/presentation/modules/beneficiarios/components/DetalleInscripcion';
import EditarInscripcion    from '@/presentation/modules/beneficiarios/components/EditarInscripcion';
import NuevoBeneficiario    from '@/presentation/modules/beneficiarios/components/NuevoBeneficiario';
import { ModalEstadisticas, StatCard } from '@/presentation/modules/beneficiarios/pages/components/ModalEstadisticas';
import { ImportarBeneficiariosDialog } from '@/presentation/modules/beneficiarios/pages/components/ImportarBeneficiariosDialog';
import { PerfilesIncompletosPanel }    from '@/presentation/modules/beneficiarios/pages/components/PerfilesIncompletosPanel';
import { useBeneficiariosPage } from '@/presentation/modules/beneficiarios/pages/useBeneficiariosPage';
import apiClient from '@/infrastructure/http/apiClient';

export default function AdultosPage() {
  const {
    esAdmin,
    inscripciones, pagina, setPagina, totalPaginas, TABS,
    buscar, setBuscar,
    estado, setEstado,
    filtrosOpen, setFiltrosOpen,
    fGenero, setFGenero, fEdadMin, setFEdadMin, fEdadMax, setFEdadMax,
    fEps, setFEps, fAlergia, setFAlergia,
    hayFiltrosAvanzados, limpiarFiltros,
    cargando, error, actualizando,
    toast, setToast,
    exportando, exportarExcel,
    stats, cargandoStats,
    modalStats, setModalStats,
    seleccionada, setSeleccionada,
    editando, setEditando,
    creando, setCreando,
    idBaja, setIdBaja, motivoBaja, setMotivoBaja, procesandoBaja,
    importDialog, setImportDialog,
    eliminar, setEliminar, eliminando, errorEliminar, setErrorEliminar,
    handleDarDeBaja, handleReactivar,
    handleGuardadoEdicion, handleBeneficiarioCreado, handleEliminarPermanente,
    handleImportado,
  } = useBeneficiariosPage({ tipo: 'adulto' });

  const [panelRefreshKey, setPanelRefreshKey] = useState(0);

  const handleEditarDesdePanel = async (id) => {
    const enLista = inscripciones.find(ins => ins.id === id);
    if (enLista) { setEditando(enLista); return; }
    try {
      const { data } = await apiClient.get(`/api/beneficiarios/${id}`);
      setEditando(data);
    } catch { /* silencioso */ }
  };

  const handleGuardadoConRefreshPanel = () => {
    handleGuardadoEdicion();
    setPanelRefreshKey(k => k + 1);
  };

  const HOVER_SX = {
    bgcolor: '#e8f5e9 !important',
    '& .MuiTableCell-root': { color: '#1a1a1a !important' },
    '& .MuiTableCell-root:first-of-type': { borderLeft: '3px solid #2e7d32' },
    '& a': { color: '#1a6b35 !important' },
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>

      <Box sx={{
        background: 'linear-gradient(135deg, #2e7d32 0%, #388e3c 60%, #43a047 100%)',
        px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 },
      }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.3 }}>
              Módulo
            </Typography>
            <Typography sx={{ fontSize: { xs: '1.3rem', sm: '1.6rem' }, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              Adultos
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', mt: 0.3 }}>
              Gestión de adultos beneficiarios de la fundación
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
              Importar xlsx
            </Button>
            <Button
              variant="contained" size="small"
              startIcon={<PersonAddIcon />}
              onClick={() => setCreando(true)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.20)',
                border: '2px solid rgba(255,255,255,0.45)',
                color: '#fff', fontWeight: 800,
                borderRadius: 2, whiteSpace: 'nowrap',
                boxShadow: '0 2px 10px rgba(0,0,0,0.28)',
                '&:hover': { filter: 'brightness(0.85)', boxShadow: '0 4px 16px rgba(0,0,0,0.35)' },
              }}
            >
              + Nuevo adulto
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1 }}>
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>

          <PerfilesIncompletosPanel
            onEditar={handleEditarDesdePanel}
            refreshKey={panelRefreshKey}
            tipo="adulto"
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 1 }}>
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
              <Tooltip title={filtrosOpen ? 'Ocultar filtros avanzados' : 'Filtros avanzados'}>
                <Button
                  size="small" variant={hayFiltrosAvanzados ? 'contained' : 'outlined'}
                  startIcon={hayFiltrosAvanzados ? <FilterListOffIcon /> : <FilterListIcon />}
                  onClick={() => setFiltrosOpen(v => !v)}
                  sx={{
                    fontWeight: 700, borderRadius: 2, whiteSpace: 'nowrap',
                    ...(hayFiltrosAvanzados
                      ? { bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' }, color: '#fff' }
                      : { borderColor: 'divider' }),
                  }}
                >
                  Filtros{hayFiltrosAvanzados ? ` (${[fGenero,fEdadMin||fEdadMax,fEps,fAlergia].filter(Boolean).length})` : ''}
                </Button>
              </Tooltip>
              <Tooltip title="Ver estadísticas detalladas de adultos">
                <Button
                  variant="contained" size="small"
                  startIcon={cargandoStats ? <CircularProgress size={14} color="inherit" /> : <BarChartIcon />}
                  onClick={() => setModalStats(true)}
                  disabled={cargandoStats}
                  sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' }, whiteSpace: 'nowrap', fontWeight: 700, borderRadius: 2 }}
                >
                  Estadísticas
                </Button>
              </Tooltip>
              <Tooltip title="Exporta TODOS los adultos de la base de datos">
                <Button
                  variant="contained" size="small"
                  startIcon={exportando ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
                  onClick={exportarExcel} disabled={exportando}
                  sx={{ bgcolor: '#43a047', '&:hover': { filter: 'brightness(0.85)' }, whiteSpace: 'nowrap', fontWeight: 700, borderRadius: 2, flexShrink: 0 }}
                >
                  {exportando ? 'Exportando…' : 'Exportar Excel'}
                </Button>
              </Tooltip>
            </Box>
          </Stack>

          <Collapse in={filtrosOpen}>
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#f1f8e9', borderColor: '#c5e1a5' }}>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Género</InputLabel>
                  <Select value={fGenero} label="Género" onChange={e => setFGenero(e.target.value)}>
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="Masculino">Masculino</MenuItem>
                    <MenuItem value="Femenino">Femenino</MenuItem>
                    <MenuItem value="Otro">Otro</MenuItem>
                  </Select>
                </FormControl>
                <TextField size="small" label="Edad mínima" type="number" value={fEdadMin}
                  onChange={e => setFEdadMin(e.target.value)} sx={{ width: 130 }}
                  inputProps={{ min: 0, max: 100 }} />
                <TextField size="small" label="Edad máxima" type="number" value={fEdadMax}
                  onChange={e => setFEdadMax(e.target.value)} sx={{ width: 130 }}
                  inputProps={{ min: 0, max: 100 }} />
                <TextField size="small" label="EPS" value={fEps}
                  onChange={e => setFEps(e.target.value)} sx={{ width: 180 }}
                  placeholder="Ej: Sanitas, Sura…" />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Alergia</InputLabel>
                  <Select value={fAlergia} label="Alergia" onChange={e => setFAlergia(e.target.value)}>
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="si">Con alergia</MenuItem>
                    <MenuItem value="no">Sin alergia</MenuItem>
                  </Select>
                </FormControl>
                {hayFiltrosAvanzados && (
                  <Button size="small" variant="outlined" color="error" startIcon={<FilterListOffIcon />}
                    onClick={limpiarFiltros} sx={{ fontWeight: 700, borderRadius: 2 }}>
                    Limpiar filtros
                  </Button>
                )}
              </Box>
            </Paper>
          </Collapse>

          <Tabs
            value={estado} onChange={(_, v) => setEstado(v)}
            variant="scrollable" scrollButtons="auto"
            sx={{
              mb: 2,
              '& .MuiTab-root':       { fontWeight: 600, textTransform: 'none', minHeight: 40, fontSize: '0.85rem' },
              '& .Mui-selected':      { color: '#2e7d32' },
              '& .MuiTabs-indicator': { bgcolor: '#2e7d32', height: 3, borderRadius: 2 },
            }}
          >
            {TABS.map(t => <Tab key={t.value} value={t.value} label={t.label} />)}
          </Tabs>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {actualizando && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1, opacity: 0.6 }}>
              <SyncIcon sx={{ fontSize: '0.85rem', color: '#2e7d32', animation: 'spin 1.2s linear infinite',
                '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />
              <Typography variant="caption" color="text.secondary">Actualizando…</Typography>
            </Box>
          )}

          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{
                  background: 'linear-gradient(90deg, #2e7d32, #43a047)',
                  '& .MuiTableCell-root': { color: '#fff', fontWeight: 700, fontSize: '0.8rem', py: 1.5, borderBottom: 'none', whiteSpace: 'nowrap' },
                }}>
                  <TableCell>Nombre del adulto</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Documento</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Edad</TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Género</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>WhatsApp</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Alergia</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Perfil</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {cargando ? (
                  <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}><CircularProgress size={32} sx={{ color: '#2e7d32' }} /></TableCell></TableRow>
                ) : inscripciones.length === 0 ? (
                  <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>No se encontraron adultos.</TableCell></TableRow>
                ) : (
                  inscripciones.map((ins, idx) => (
                    <TableRow
                      key={ins.id} hover
                      onClick={() => setSeleccionada(ins)}
                      sx={{
                        cursor: 'pointer',
                        opacity: ins.activo ? 1 : 0.65,
                        bgcolor: idx % 2 === 0 ? 'inherit' : 'rgba(46,125,50,0.04)',
                        transition: 'background 0.15s',
                        '&:hover': HOVER_SX,
                        '&:last-child td': { borderBottom: 0 },
                      }}
                    >
                      <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.primary' }}>
                        <Box display="flex" alignItems="center" gap={0.8} flexWrap="wrap">
                          {ins.nombreMenor}
                          {!ins.fotoMenorUrl && (
                            <Tooltip title="Foto pendiente — haz clic en Editar para cargarla">
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
                      <TableCell sx={{ whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>
                        {(() => {
                          const pct = calcularCompletitudAdulto(ins);
                          const color = pct >= 80 ? '#2e7d32' : pct >= 50 ? '#e65100' : '#c62828';
                          const bg    = pct >= 80 ? '#e8f5e9' : pct >= 50 ? '#fff3e0' : '#fce4ec';
                          return (
                            <Tooltip title={`Completitud del perfil: ${pct}%`}>
                              <Chip label={`${pct}%`} size="small"
                                sx={{ fontSize: '0.7rem', fontWeight: 700, bgcolor: bg, color, height: 20 }} />
                            </Tooltip>
                          );
                        })()}
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
                          <IconButton size="small" sx={{ color: '#2e7d32', '&:hover': { bgcolor: 'rgba(46,125,50,0.1)' } }} onClick={() => setSeleccionada(ins)}>
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
                sx={{ '& .Mui-selected': { bgcolor: '#2e7d32 !important', color: '#fff' }, '& .MuiPaginationItem-root': { fontWeight: 600 } }}
              />
            </Box>
          )}

          <Box sx={{ mt: 5, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
              <LockIcon sx={{ fontSize: '1rem', color: '#2e7d32', mt: '2px', flexShrink: 0 }} />
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#2e7d32', display: 'block', mb: 0.3 }}>Aviso de confidencialidad</Typography>
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
        onImportado={handleImportado}
      />

      <ModalEstadisticas
        open={modalStats}
        onClose={() => setModalStats(false)}
        tipoInicial="adulto"
      />

      {creando && (
        <NuevoBeneficiario onCerrar={() => setCreando(false)} onCreado={handleBeneficiarioCreado} tipoDefault="adulto" />
      )}

      {seleccionada && (
        <DetalleInscripcion
          inscripcion={seleccionada}
          onCerrar={() => setSeleccionada(null)}
          onEditar={() => { setEditando(seleccionada); setSeleccionada(null); }}
        />
      )}
      {editando && (
        <EditarInscripcion inscripcion={editando} onCerrar={() => setEditando(null)} onGuardado={handleGuardadoConRefreshPanel} />
      )}

      <Dialog open={!!idBaja} onClose={() => { setIdBaja(null); setMotivoBaja(''); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#e65100', fontWeight: 700, pb: 1 }}>¿Dar de baja al adulto?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>El adulto quedará inactivo pero su información se conservará. Podrás reactivarlo en cualquier momento.</DialogContentText>
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
          Eliminar adulto de la BD
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: errorEliminar ? 1.5 : 0 }}>
            ¿Eliminar permanentemente a <strong>{eliminar?.nombre}</strong>?
            Esta acción borra todos sus datos de perfil y <strong>no se puede deshacer</strong>.
            Solo es posible si el adulto no tiene inscripciones ni movimientos de inventario vinculados.
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

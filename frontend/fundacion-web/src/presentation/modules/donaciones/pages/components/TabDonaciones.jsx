import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, FormControl, Grid, IconButton, InputAdornment, InputLabel,
  MenuItem, Pagination, Paper, Select, Snackbar, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import SearchIcon            from '@mui/icons-material/Search';
import AddIcon               from '@mui/icons-material/Add';
import AttachMoneyIcon       from '@mui/icons-material/AttachMoney';
import BlockIcon             from '@mui/icons-material/Block';
import CloseIcon             from '@mui/icons-material/Close';
import DeleteIcon            from '@mui/icons-material/Delete';
import Inventory2Icon        from '@mui/icons-material/Inventory2';
import ReceiptIcon           from '@mui/icons-material/Receipt';
import TrendingUpIcon        from '@mui/icons-material/TrendingUp';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import FileDownloadIcon       from '@mui/icons-material/FileDownload';
import SkeletonTabla         from '@/shared/components/SkeletonTabla';
import { exportarExcel }    from '@/shared/utils/exportarExcel';
import { obtenerTodasLasPaginas } from '@/shared/utils/paginas';
import { useValorDiferido } from '@/shared/hooks/useValorDiferido';
import { fechaLocalISO }    from '@/shared/utils/fecha';
import { donacionesRepository } from '@/infrastructure/repositories/donacionesRepository';
import { sedesRepository }      from '@/infrastructure/repositories/sedesRepository';
import { useAuth } from '@/application/auth/useAuth';
import { useConfirm } from '@/shared/components/useConfirm';
import { COLOR_DONACIONES, COLOR_ESPECIE, fmtMoney, fmtFecha } from './helpers';
import { BRAND_COLOR } from '@/shared/constants/brand';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { useTheme, alpha } from '@mui/material/styles';
import { colorEstado } from '@/shared/theme/paleta';
import { StatCard } from './StatCard';
import { NuevaDonacionDialog }      from './NuevaDonacionDialog';
import { ReciboDonacionDialog }     from './ReciboDonacionDialog';
import { CertificadoDonacionDialog } from './CertificadoDonacionDialog';

const POR_PAGINA = 20;

/** Filas legibles para el Excel de donaciones. */
const filaExcel = d => ({
  Fecha:           d.fechaDonacion,
  Donante:         d.nombreDonante,
  'Tipo donante':  d.tipoDonante === 'empresa' ? 'Empresa' : 'Persona',
  Tipo:            d.tipo === 'dinero' ? 'Dinero' : 'Especie',
  'Monto (COP)':   d.tipo === 'dinero' ? d.monto : '',
  Cantidad:        d.tipo !== 'dinero' ? d.cantidad : '',
  Unidad:          d.tipo !== 'dinero' ? (d.unidadMedida ?? '') : '',
  Artículo:        d.tipo !== 'dinero' ? (d.nombreItem ?? '') : '',
  Sede:            d.nombreSede ?? '',
  Programa:        d.nombrePrograma ?? '',
  'Recibo N°':     d.reciboNumero ?? '',
  'Estado recibo': d.reciboEstado === 'anulado' ? 'Anulado' : 'Emitido',
});

export function TabDonaciones({ donanteInicial, onClearDonanteInicial }) {
  const theme = useTheme();
  const { puedo } = useAuth();
  const confirm = useConfirm();
  const [donaciones,    setDonaciones]    = useState([]);
  const [stats,         setStats]         = useState(null);
  const [cargando,      setCargando]      = useState(false);
  const [sedes,         setSedes]         = useState([]);
  const [snack,         setSnack]         = useState({ open: false, msg: '', sev: 'success' });
  const [dialOpen,      setDialOpen]      = useState(false);
  const [reciboOpen,    setReciboOpen]    = useState(false);
  const [reciboItem,    setReciboItem]    = useState(null);
  const [certOpen,      setCertOpen]      = useState(false);
  const [certItem,      setCertItem]      = useState(null);

  const [filtTipo,   setFiltTipo]   = useState('');
  const [filtSedeId, setFiltSedeId] = useState('');
  const [filtDesde,  setFiltDesde]  = useState('');
  const [filtHasta,  setFiltHasta]  = useState('');
  const [textoBuscar, setTextoBuscar] = useState('');
  const [pagina,     setPagina]     = useState(1);
  const [total,      setTotal]      = useState(0);
  const [exportando, setExportando] = useState(false);
  // La búsqueda va al servidor 350 ms después de dejar de escribir
  const buscar = useValorDiferido(textoBuscar.trim());

  const ok  = msg => setSnack({ open: true, msg, sev: 'success' });
  const err = msg => setSnack({ open: true, msg, sev: 'error' });

  const recargarStats = () =>
    donacionesRepository.stats().then(({ data }) => setStats(data)).catch(() => { /* opcional: las tarjetas de resumen no bloquean la lista */ });

  useEffect(() => {
    sedesRepository.listar({ soloActivas: true }).then(({ data }) => setSedes(data)).catch(() => { /* opcional: sin sedes solo se pierde el filtro */ });
    recargarStats();
  }, []);

  useEffect(() => {
    if (donanteInicial) setDialOpen(true);
  }, [donanteInicial]);

  const filtros = useMemo(() => {
    const params = {};
    if (filtTipo)   params.tipo   = filtTipo;
    if (filtSedeId) params.sedeId = filtSedeId;
    if (filtDesde)  params.desde  = filtDesde;
    if (filtHasta)  params.hasta  = filtHasta;
    if (buscar)     params.buscar = buscar;
    return params;
  }, [filtTipo, filtSedeId, filtDesde, filtHasta, buscar]);

  // Al cambiar un filtro se vuelve a la primera página (ajuste durante el render, sin efecto extra)
  const [filtrosPrevios, setFiltrosPrevios] = useState(filtros);
  if (filtrosPrevios !== filtros) {
    setFiltrosPrevios(filtros);
    setPagina(1);
  }

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await donacionesRepository.listar({ ...filtros, pagina, porPagina: POR_PAGINA });
      setDonaciones(data?.data ?? []);
      setTotal(data?.total ?? 0);
    } catch (e) { err(mensajeErrorApi(e, { accion: 'cargar las donaciones' })); }
    finally { setCargando(false); }
  }, [filtros, pagina]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalPaginas = Math.ceil(total / POR_PAGINA);

  // Exporta TODAS las donaciones del filtro actual (todas las páginas), no solo las visibles
  const handleExportar = async () => {
    setExportando(true);
    try {
      const todas = await obtenerTodasLasPaginas(donacionesRepository.listar, filtros);
      if (!todas.length) { err('No hay donaciones para exportar.'); return; }
      if (await exportarExcel(`donaciones_${fechaLocalISO()}`, [{ nombre: 'Donaciones', datos: todas.map(filaExcel) }]))
        ok(`${todas.length} donaciones exportadas.`);
    } catch (e) { err(mensajeErrorApi(e, { accion: 'exportar las donaciones' })); }
    finally { setExportando(false); }
  };

  const handleGuardada = (data, aviso) => {
    setDonaciones(prev => [data, ...prev]);
    setTotal(t => t + 1);
    setDialOpen(false);
    onClearDonanteInicial();
    if (aviso) err(aviso); else ok('Donación registrada.');
    recargarStats();
  };

  const handleCerrarDialog = () => {
    setDialOpen(false);
    onClearDonanteInicial();
  };

  const handleEliminar = async (don) => {
    if (!await confirm('¿Eliminar esta donación?')) return;
    try {
      await donacionesRepository.eliminar(don.id);
      ok('Donación eliminada.');
      recargarStats();
      // Si la página quedó vacía se vuelve a la anterior; si no, se recarga para completarla
      if (donaciones.length === 1 && pagina > 1) setPagina(p => p - 1); else cargar();
    } catch (e) { err(mensajeErrorApi(e, { accion: 'eliminar la donación' })); }
  };

  const handleAnular = async (don) => {
    if (!await confirm(`¿Anular el recibo N° ${don.reciboNumero || don.id.slice(0, 8)}? Esta acción no se puede deshacer.`)) return;
    try {
      await donacionesRepository.anular(don.id);
      setDonaciones(prev => prev.map(d => d.id === don.id ? { ...d, reciboEstado: 'anulado' } : d));
      ok('Recibo anulado.');
    } catch (e) { err(mensajeErrorApi(e, { accion: 'anular el recibo' })); }
  };

  const hayFiltros = filtTipo || filtSedeId || filtDesde || filtHasta || buscar;

  return (
    <>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<AttachMoneyIcon />} label="Dinero este mes"
            value={fmtMoney(stats?.totalDineroMes)} color={COLOR_DONACIONES}
            borderColor={alpha(theme.palette.warning.main, 0.35)} bgColor={alpha(theme.palette.warning.main, 0.06)} loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<TrendingUpIcon />} label="Dinero este año"
            value={fmtMoney(stats?.totalDineroAnio)} color={theme.palette.primary.main}
            borderColor={alpha(theme.palette.primary.main, 0.35)} bgColor={alpha(theme.palette.primary.main, 0.06)} loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<AttachMoneyIcon />} label="Total histórico"
            value={fmtMoney(stats?.totalDineroTotal)} color={theme.palette.success.main}
            borderColor={alpha(theme.palette.success.main, 0.35)} bgColor={alpha(theme.palette.success.main, 0.06)} loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<Inventory2Icon />} label="Especie este mes"
            value={stats?.totalEspecieMes ?? '—'} color={COLOR_ESPECIE}
            borderColor={alpha(theme.palette.info.main, 0.35)} bgColor={alpha(theme.palette.info.main, 0.06)} loading={!stats} />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField size="small" placeholder="Buscar donante, documento, recibo…" value={textoBuscar}
            onChange={e => setTextoBuscar(e.target.value)} sx={{ minWidth: 230 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
          <ToggleButtonGroup value={filtTipo} exclusive size="small"
            onChange={(_, v) => setFiltTipo(v ?? '')}>
            <ToggleButton value="">Todas</ToggleButton>
            <ToggleButton value="dinero">Dinero</ToggleButton>
            <ToggleButton value="especie">Especie</ToggleButton>
          </ToggleButtonGroup>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="tab-donaciones-sede-label">Sede</InputLabel>
            <Select labelId="tab-donaciones-sede-label" value={filtSedeId} label="Sede" onChange={e => setFiltSedeId(e.target.value)}>
              <MenuItem value="">Todas</MenuItem>
              {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="Desde" type="date" value={filtDesde}
            onChange={e => setFiltDesde(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150 }} />
          <TextField size="small" label="Hasta" type="date" value={filtHasta}
            onChange={e => setFiltHasta(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150 }} />
          {hayFiltros && (
            <Button size="small" startIcon={<CloseIcon />}
              onClick={() => { setFiltTipo(''); setFiltSedeId(''); setFiltDesde(''); setFiltHasta(''); setTextoBuscar(''); }}>
              Limpiar
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {puedo('donaciones', 'exportar') && (
            <Tooltip title="Exporta todas las donaciones que cumplen los filtros actuales">
              <span>
                <Button size="small" variant="outlined"
                  startIcon={exportando ? <CircularProgress size={14} color="inherit" /> : <FileDownloadIcon />}
                  disabled={total === 0 || exportando}
                  onClick={handleExportar}
                >
                  {exportando ? 'Exportando…' : 'Exportar Excel'}
                </Button>
              </span>
            </Tooltip>
          )}
          {puedo('donaciones', 'crear') && (
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => { onClearDonanteInicial(); setDialOpen(true); }}
              sx={{ bgcolor: COLOR_DONACIONES, fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#b45309' } }}>
              Nueva donación
            </Button>
          )}
        </Box>
      </Box>

      {cargando && donaciones.length === 0 ? (
        <SkeletonTabla columnas={5} filas={8} />
      ) : donaciones.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center', border: '1.5px dashed', borderColor: alpha(theme.palette.warning.main, 0.35), borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.06) }}>
          <VolunteerActivismIcon sx={{ fontSize: 48, color: alpha(theme.palette.warning.main, 0.5), mb: 1.5 }} />
          <Typography sx={{ fontWeight: 700, color: 'text.secondary' }}>
            {hayFiltros ? 'No hay donaciones con estos filtros' : 'No hay donaciones registradas'}
          </Typography>
          {!hayFiltros && puedo('donaciones', 'crear') && (
            <Button variant="contained" startIcon={<AddIcon />}
              sx={{ mt: 2, bgcolor: COLOR_DONACIONES, fontWeight: 700 }}
              onClick={() => { onClearDonanteInicial(); setDialOpen(true); }}>
              Registrar primera donación
            </Button>
          )}
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'superficie2' }}>
                <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Donante</TableCell>
                <TableCell sx={{ fontWeight: 700, display: { xs: 'none', sm: 'table-cell' } }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Detalle</TableCell>
                <TableCell sx={{ fontWeight: 700, display: { xs: 'none', md: 'table-cell' } }}>Sede / Programa</TableCell>
                <TableCell sx={{ fontWeight: 700, display: { xs: 'none', sm: 'table-cell' } }}>Estado</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {donaciones.map(d => (
                <TableRow key={d.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                    {fmtFecha(d.fechaDonacion)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.83rem', maxWidth: 170 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 'inherit' }} noWrap>{d.nombreDonante}</Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                      {d.tipoDonante === 'empresa' ? 'Empresa' : 'Persona'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Chip label={d.tipo === 'dinero' ? 'Dinero' : 'Especie'} size="small"
                      sx={{
                        bgcolor: d.tipo === 'dinero' ? `${COLOR_DONACIONES}18` : `${COLOR_ESPECIE}18`,
                        color:   d.tipo === 'dinero' ? COLOR_DONACIONES : COLOR_ESPECIE,
                        fontWeight: 700, fontSize: '0.7rem',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.82rem' }}>
                    {d.tipo === 'dinero' ? (
                      <>
                        <strong>{fmtMoney(d.monto)}</strong>
                        {d.reciboNumero && (
                          <Typography component="span" sx={{ ml: 0.8, fontSize: '0.7rem', color: 'text.secondary' }}>
                            Recibo: {d.reciboNumero}
                          </Typography>
                        )}
                      </>
                    ) : (
                      <>{d.cantidad} {d.unidadMedida || ''} — <strong>{d.nombreItem || '—'}</strong></>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', maxWidth: 160, display: { xs: 'none', md: 'table-cell' } }}>
                    {d.nombreSede || '—'}
                    {d.nombrePrograma && (
                      <Typography component="span" sx={{ fontSize: '0.72rem', display: 'block', color: 'text.secondary' }}>
                        {d.nombrePrograma}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Chip
                      label={d.reciboEstado === 'anulado' ? 'Anulado' : 'Emitido'}
                      size="small"
                      sx={{
                        bgcolor: colorEstado(d.reciboEstado === 'anulado' ? 'anulado' : 'emitido', theme.palette.mode).fondo,
                        color:   colorEstado(d.reciboEstado === 'anulado' ? 'anulado' : 'emitido', theme.palette.mode).texto,
                        fontWeight: 700, fontSize: '0.68rem',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Ver recibo">
                      <IconButton size="small" color="primary"
                        onClick={() => { setReciboItem(d); setReciboOpen(true); }}>
                        <ReceiptIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {d.tipo === 'dinero' && (
                      <Tooltip title="Certificado tributario">
                        <IconButton size="small"
                          sx={{ color: BRAND_COLOR }}
                          onClick={() => { setCertItem(d); setCertOpen(true); }}>
                          <span style={{ fontSize: 16, lineHeight: 1 }}>🏅</span>
                        </IconButton>
                      </Tooltip>
                    )}
                    {d.reciboEstado !== 'anulado' && puedo('donaciones', 'editar') && (
                      <Tooltip title="Anular recibo">
                        <IconButton size="small" sx={{ color: 'warning.main' }} onClick={() => handleAnular(d)}>
                          <BlockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {puedo('donaciones', 'eliminar') && (
                      <Tooltip title="Eliminar donación">
                        <IconButton size="small" color="error" onClick={() => handleEliminar(d)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {totalPaginas > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2.5, flexWrap: 'wrap' }}>
          <Pagination count={totalPaginas} page={pagina} onChange={(_, v) => setPagina(v)} size="small" />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{total} donaciones</Typography>
        </Box>
      )}

      <ReciboDonacionDialog
        open={reciboOpen}
        donacion={reciboItem}
        onClose={() => { setReciboOpen(false); setReciboItem(null); }}
      />

      <CertificadoDonacionDialog
        open={certOpen}
        donacion={certItem}
        onClose={() => { setCertOpen(false); setCertItem(null); }}
      />

      <NuevaDonacionDialog
        open={dialOpen}
        donanteInicial={donanteInicial}
        onClose={handleCerrarDialog}
        onGuardada={handleGuardada}
        sedes={sedes}
      />

      <Snackbar open={snack.open} autoHideDuration={snack.sev === 'error' ? 8000 : 3500}
        onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled"
          onClose={() => setSnack(p => ({ ...p, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </>
  );
}

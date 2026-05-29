import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, Chip, FormControl, Grid, IconButton, InputLabel, MenuItem, Paper,
  Select, Snackbar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
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
import { donacionesRepository } from '@/infrastructure/repositories/donacionesRepository';
import { sedesRepository }      from '@/infrastructure/repositories/sedesRepository';
import { useAuth }              from '@/application/auth/AuthContext';
import { useConfirm }           from '@/shared/components/ConfirmDialog';
import { COLOR_DONACIONES, COLOR_ESPECIE, fmtMoney, fmtFecha } from './helpers';
import { BRAND_COLOR } from '@/shared/constants/brand';
import { StatCard } from './StatCard';
import { NuevaDonacionDialog }      from './NuevaDonacionDialog';
import { ReciboDonacionDialog }     from './ReciboDonacionDialog';
import { CertificadoDonacionDialog } from './CertificadoDonacionDialog';

export function TabDonaciones({ donanteInicial, onClearDonanteInicial }) {
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

  const ok  = msg => setSnack({ open: true, msg, sev: 'success' });
  const err = msg => setSnack({ open: true, msg, sev: 'error' });

  const recargarStats = () =>
    donacionesRepository.stats().then(({ data }) => setStats(data)).catch(() => {});

  useEffect(() => {
    sedesRepository.listar({ soloActivas: true }).then(({ data }) => setSedes(data)).catch(() => {});
    recargarStats();
  }, []);

  useEffect(() => {
    if (donanteInicial) setDialOpen(true);
  }, [donanteInicial]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = {};
      if (filtTipo)   params.tipo   = filtTipo;
      if (filtSedeId) params.sedeId = filtSedeId;
      if (filtDesde)  params.desde  = filtDesde;
      if (filtHasta)  params.hasta  = filtHasta;
      const { data } = await donacionesRepository.listar(params);
      setDonaciones(data);
    } catch { err('No se pudieron cargar las donaciones.'); }
    finally { setCargando(false); }
  }, [filtTipo, filtSedeId, filtDesde, filtHasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleGuardada = (data) => {
    setDonaciones(prev => [data, ...prev]);
    setDialOpen(false);
    onClearDonanteInicial();
    ok('Donación registrada.');
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
      setDonaciones(prev => prev.filter(d => d.id !== don.id));
      ok('Donación eliminada.');
      recargarStats();
    } catch { err('No se pudo eliminar.'); }
  };

  const handleAnular = async (don) => {
    if (!await confirm(`¿Anular el recibo N° ${don.reciboNumero || don.id.slice(0, 8)}? Esta acción no se puede deshacer.`)) return;
    try {
      await donacionesRepository.anular(don.id);
      setDonaciones(prev => prev.map(d => d.id === don.id ? { ...d, reciboEstado: 'anulado' } : d));
      ok('Recibo anulado.');
    } catch { err('No se pudo anular el recibo.'); }
  };

  const hayFiltros = filtTipo || filtSedeId || filtDesde || filtHasta;

  return (
    <>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<AttachMoneyIcon />} label="Dinero este mes"
            value={fmtMoney(stats?.totalDineroMes)} color={COLOR_DONACIONES}
            borderColor="#fde68a" bgColor="#fffbf0" loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<TrendingUpIcon />} label="Dinero este año"
            value={fmtMoney(stats?.totalDineroAnio)} color="#7c3aed"
            borderColor="#e9d5ff" bgColor="#faf5ff" loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<AttachMoneyIcon />} label="Total histórico"
            value={fmtMoney(stats?.totalDineroTotal)} color="#059669"
            borderColor="#a7f3d0" bgColor="#f0fdf4" loading={!stats} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<Inventory2Icon />} label="Especie este mes"
            value={stats?.totalEspecieMes ?? '—'} color={COLOR_ESPECIE}
            borderColor="#bae6fd" bgColor="#f0f9ff" loading={!stats} />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <ToggleButtonGroup value={filtTipo} exclusive size="small"
            onChange={(_, v) => setFiltTipo(v ?? '')}>
            <ToggleButton value="">Todas</ToggleButton>
            <ToggleButton value="dinero">Dinero</ToggleButton>
            <ToggleButton value="especie">Especie</ToggleButton>
          </ToggleButtonGroup>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sede</InputLabel>
            <Select value={filtSedeId} label="Sede" onChange={e => setFiltSedeId(e.target.value)}>
              <MenuItem value="">Todas</MenuItem>
              {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="Desde" type="date" value={filtDesde}
            onChange={e => setFiltDesde(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
          <TextField size="small" label="Hasta" type="date" value={filtHasta}
            onChange={e => setFiltHasta(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
          {hayFiltros && (
            <Button size="small" startIcon={<CloseIcon />}
              onClick={() => { setFiltTipo(''); setFiltSedeId(''); setFiltDesde(''); setFiltHasta(''); }}>
              Limpiar
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />}
            disabled={donaciones.length === 0}
            onClick={() => exportarExcel('Donaciones', [{
              nombre: 'Donaciones',
              datos: donaciones.map(d => ({
                Fecha:         d.fechaDonacion,
                Donante:       d.nombreDonante,
                'Tipo donante': d.tipoDonante === 'empresa' ? 'Empresa' : 'Persona',
                Tipo:          d.tipo === 'dinero' ? 'Dinero' : 'Especie',
                'Monto (COP)':  d.tipo === 'dinero' ? d.monto : '',
                Cantidad:      d.tipo !== 'dinero' ? d.cantidad : '',
                Unidad:        d.tipo !== 'dinero' ? (d.unidadMedida ?? '') : '',
                Artículo:      d.tipo !== 'dinero' ? (d.nombreItem ?? '') : '',
                Sede:          d.nombreSede ?? '',
                Programa:      d.nombrePrograma ?? '',
                'Recibo N°':   d.reciboNumero ?? '',
                'Estado recibo': d.reciboEstado === 'anulado' ? 'Anulado' : 'Emitido',
              })),
            }])}
          >
            Exportar Excel
          </Button>
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
        <Box sx={{ py: 8, textAlign: 'center', border: '1.5px dashed #fde68a', borderRadius: 2, bgcolor: '#fffbf0' }}>
          <VolunteerActivismIcon sx={{ fontSize: 48, color: '#fcd34d', mb: 1.5 }} />
          <Typography fontWeight={700} color="text.secondary">
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
              <TableRow sx={{ bgcolor: '#fffbf0' }}>
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
                    <Typography fontWeight={600} fontSize="inherit" noWrap>{d.nombreDonante}</Typography>
                    <Typography fontSize="0.7rem" color="text.secondary">
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
                        bgcolor: d.reciboEstado === 'anulado' ? '#fee2e2' : '#dcfce7',
                        color:   d.reciboEstado === 'anulado' ? '#991b1b' : '#166534',
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
                        <IconButton size="small" sx={{ color: '#d97706' }} onClick={() => handleAnular(d)}>
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

      <Snackbar open={snack.open} autoHideDuration={3500}
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

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Tabs, Tab, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, IconButton, CircularProgress, Tooltip, Divider, LinearProgress,
  Select, FormControl, InputLabel, Alert,
} from '@mui/material';
import AddIcon                  from '@mui/icons-material/Add';
import SkeletonTabla            from '../../../../shared/components/SkeletonTabla';
import EditIcon                 from '@mui/icons-material/Edit';
import DeleteIcon               from '@mui/icons-material/Delete';
import TrendingUpIcon           from '@mui/icons-material/TrendingUp';
import TrendingDownIcon         from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BalanceIcon              from '@mui/icons-material/Balance';
import PrintIcon                from '@mui/icons-material/Print';
import SyncAltIcon              from '@mui/icons-material/SyncAlt';
import FactCheckIcon            from '@mui/icons-material/FactCheck';
import SavingsIcon              from '@mui/icons-material/Savings';
import MenuItem                 from '@mui/material/MenuItem';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import apiClient from '../../../../infrastructure/http/apiClient';
import { useAuth } from '../../../../application/auth/AuthContext';
import { useConfirm } from '../../../../shared/components/ConfirmDialog';
import { fmt, fmtFecha, hoy, MESES, ANIOS, KpiCard, SectionHeader } from './components/helpers';
import { DialogMovimiento }  from './components/DialogMovimiento';
import { DialogCuenta }      from './components/DialogCuenta';
import { DialogPresupuesto } from './components/DialogPresupuesto';
import { DialogArqueo }      from './components/DialogArqueo';
import { DialogReposicion }  from './components/DialogReposicion';

// â”€â”€ PÃ¡gina principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function ContabilidadPage() {
  const { puedo } = useAuth();
  const confirm    = useConfirm();
  const puedeCrear  = puedo('contabilidad', 'crear');
  const puedeEditar = puedo('contabilidad', 'editar');

  const now = new Date();
  const [tab,        setTab]        = useState(0);
  const [cargando,   setCargando]   = useState(true);
  const [error,      setError]      = useState(null);
  const [stats,      setStats]      = useState(null);
  const [cuentas,    setCuentas]    = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [programas,  setProgramas]  = useState([]);
  const [movimientos,setMovimientos]= useState([]);
  const [presupuesto,setPresupuesto]= useState([]);
  const [reporte,    setReporte]    = useState(null);

  // Filtros movimientos
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroMes,  setFiltroMes]  = useState(now.getMonth() + 1);
  const [filtroAnio, setFiltroAnio] = useState(now.getFullYear());

  // Filtro presupuesto
  const [presAnio, setPresAnio] = useState(now.getFullYear());

  // Filtro reporte
  const [repMes,  setRepMes]  = useState(now.getMonth() + 1);
  const [repAnio, setRepAnio] = useState(now.getFullYear());

  // Dialogs
  const [dlgMov,  setDlgMov]  = useState({ open: false, modo: 'crear', data: null, tipoPreset: 'ingreso', cuentaPreset: null });
  const [dlgCuenta, setDlgCuenta] = useState({ open: false, modo: 'crear', data: null });
  const [dlgPres,   setDlgPres]   = useState({ open: false, modo: 'crear', data: null });
  const [guardando, setGuardando] = useState(false);

  // â”€â”€ Estado Tab Caja Menor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [cajaCuentaId,  setCajaCuentaId]  = useState('');
  const [cajaMes,       setCajaMes]       = useState(now.getMonth() + 1);
  const [cajaAnio,      setCajaAnio]      = useState(now.getFullYear());
  const [libroAuxiliar, setLibroAuxiliar] = useState([]);
  const [arqueos,       setArqueos]       = useState([]);
  const [cargandoCaja,  setCargandoCaja]  = useState(false);
  const [dlgArqueo,     setDlgArqueo]     = useState({ open: false });
  const [dlgReposicion, setDlgReposicion] = useState({ open: false });

  // â”€â”€ Carga inicial â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const init = async () => {
      setCargando(true);
      try {
        const [{ data: st }, { data: cu }, { data: ca }, { data: mo }, sedesRes] = await Promise.all([
          apiClient.get('/api/contabilidad/stats'),
          apiClient.get('/api/contabilidad/cuentas'),
          apiClient.get('/api/contabilidad/categorias'),
          apiClient.get('/api/contabilidad/movimientos', {
            params: { mes: now.getMonth() + 1, anio: now.getFullYear() },
          }),
          apiClient.get('/api/sedes').catch(() => ({ data: [] })),
        ]);
        setStats(st);
        setCuentas(cu);
        setCategorias(ca);
        setMovimientos(mo);
        const progs = (sedesRes.data ?? []).flatMap(s =>
          (s.programas ?? []).map(p => ({ id: p.id, nombre: p.nombre }))
        );
        setProgramas(progs);
      } catch {
        setError('No se pudo cargar el mÃ³dulo de contabilidad.');
      } finally {
        setCargando(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // â”€â”€ Recargas por tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const cargarMovimientos = useCallback(async () => {
    const params = {};
    if (filtroTipo) params.tipo = filtroTipo;
    if (filtroMes)  params.mes  = filtroMes;
    if (filtroAnio) params.anio = filtroAnio;
    const { data } = await apiClient.get('/api/contabilidad/movimientos', { params });
    setMovimientos(data);
  }, [filtroTipo, filtroMes, filtroAnio]);

  const cargarPresupuesto = useCallback(async () => {
    const { data } = await apiClient.get('/api/contabilidad/presupuesto', { params: { anio: presAnio } });
    setPresupuesto(data);
  }, [presAnio]);

  const cargarStats = async () => {
    const { data } = await apiClient.get('/api/contabilidad/stats');
    setStats(data);
  };

  const cargarCuentas = async () => {
    const { data } = await apiClient.get('/api/contabilidad/cuentas');
    setCuentas(data);
  };

  const cargarCajaMenor = useCallback(async () => {
    if (!cajaCuentaId) return;
    setCargandoCaja(true);
    try {
      const params = { cuentaId: cajaCuentaId, anio: cajaAnio };
      if (cajaMes) params.mes = cajaMes;
      const [libroRes, arqueosRes] = await Promise.all([
        apiClient.get('/api/contabilidad/caja-menor/libro',   { params }),
        apiClient.get('/api/contabilidad/caja-menor/arqueos', { params: { cuentaId: cajaCuentaId } }),
      ]);
      setLibroAuxiliar(libroRes.data);
      setArqueos(arqueosRes.data);
    } catch { /* silencioso */ } finally {
      setCargandoCaja(false);
    }
  }, [cajaCuentaId, cajaMes, cajaAnio]);

  // Auto-seleccionar primera caja al abrir el tab
  useEffect(() => {
    if (tab === 5 && !cajaCuentaId) {
      const primera = cuentas.find(c => c.tipo !== 'cuenta_bancaria');
      if (primera) setCajaCuentaId(primera.id);
    }
  }, [tab, cuentas]);

  // Cargar datos cuando cambia la cuenta seleccionada
  useEffect(() => {
    if (cajaCuentaId) cargarCajaMenor();
  }, [cajaCuentaId]);

  const generarReporte = async () => {
    const { data } = await apiClient.get('/api/contabilidad/reporte', {
      params: { mes: repMes, anio: repAnio },
    });
    setReporte(data);
  };

  // â”€â”€ Movimientos CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const guardarMovimiento = async (form) => {
    setGuardando(true);
    try {
      if (dlgMov.modo === 'crear') await apiClient.post('/api/contabilidad/movimientos', form);
      else await apiClient.put(`/api/contabilidad/movimientos/${dlgMov.data.id}`, form);
      await Promise.all([cargarStats(), cargarCuentas(), cargarMovimientos()]);
      if (tab === 5) await cargarCajaMenor();
      setDlgMov(d => ({ ...d, open: false }));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarMovimiento = async (id) => {
    if (!await confirm('Â¿Eliminar este movimiento? El saldo de la cuenta se ajustarÃ¡ automÃ¡ticamente.')) return;
    await apiClient.delete(`/api/contabilidad/movimientos/${id}`);
    await Promise.all([cargarStats(), cargarCuentas(), cargarMovimientos()]);
    if (tab === 5) await cargarCajaMenor();
  };

  // â”€â”€ Caja Menor CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const guardarArqueo = async (form) => {
    setGuardando(true);
    try {
      await apiClient.post('/api/contabilidad/caja-menor/arqueos', form);
      await cargarCajaMenor();
      setDlgArqueo({ open: false });
    } finally {
      setGuardando(false);
    }
  };

  const eliminarArqueo = async (id) => {
    if (!await confirm('Â¿Eliminar este arqueo?')) return;
    await apiClient.delete(`/api/contabilidad/caja-menor/arqueos/${id}`);
    await cargarCajaMenor();
  };

  const guardarReposicion = async (form) => {
    setGuardando(true);
    try {
      await apiClient.post('/api/contabilidad/caja-menor/reposicion', form);
      await Promise.all([cargarStats(), cargarCuentas(), cargarCajaMenor()]);
      setDlgReposicion({ open: false });
    } finally {
      setGuardando(false);
    }
  };

  // â”€â”€ Cuentas CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const guardarCuenta = async (form) => {
    setGuardando(true);
    try {
      if (dlgCuenta.modo === 'crear') await apiClient.post('/api/contabilidad/cuentas', form);
      else await apiClient.put(`/api/contabilidad/cuentas/${dlgCuenta.data.id}`, form);
      await Promise.all([cargarCuentas(), cargarStats()]);
      setDlgCuenta(d => ({ ...d, open: false }));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCuenta = async (id) => {
    if (!await confirm('Â¿Eliminar esta cuenta? Solo es posible si no tiene movimientos registrados.')) return;
    try {
      await apiClient.delete(`/api/contabilidad/cuentas/${id}`);
      await Promise.all([cargarCuentas(), cargarStats()]);
    } catch {
      alert('No se pudo eliminar: la cuenta tiene movimientos asociados.');
    }
  };

  // â”€â”€ Presupuesto CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const guardarPresupuesto = async (form) => {
    setGuardando(true);
    try {
      if (dlgPres.modo === 'crear') await apiClient.post('/api/contabilidad/presupuesto', form);
      else await apiClient.put(`/api/contabilidad/presupuesto/${dlgPres.data.id}`, form);
      await cargarPresupuesto();
      setDlgPres(d => ({ ...d, open: false }));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarPresupuesto = async (id) => {
    if (!await confirm('Â¿Eliminar esta lÃ­nea presupuestal?')) return;
    await apiClient.delete(`/api/contabilidad/presupuesto/${id}`);
    await cargarPresupuesto();
  };

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (cargando) return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <SkeletonTabla columnas={6} filas={10} />
    </Box>
  );
  if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Page header */}
      <Paper sx={{
        p: { xs: 2, sm: 3 }, mb: 3,
        background: 'linear-gradient(135deg, #4E1B95 0%, #7C3AED 100%)',
        borderRadius: 3, color: 'white',
      }} elevation={0}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2, p: 1.25, display: 'flex' }}>
            <AccountBalanceWalletIcon sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold">Contabilidad</Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.25 }}>
              Registra ingresos y egresos con categorÃ­as PUC. Los datos quedan organizados para entregar al contador.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* KPIs */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Saldo total" value={fmt(stats?.saldoTotal)}
            icon={<AccountBalanceWalletIcon fontSize="inherit" />} color="#4E1B95" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Ingresos este mes" value={fmt(stats?.ingresosMes)}
            icon={<TrendingUpIcon fontSize="inherit" />} color="#16a34a" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Egresos este mes" value={fmt(stats?.egresosMes)}
            icon={<TrendingDownIcon fontSize="inherit" />} color="#dc2626" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Balance este mes"
            value={fmt(stats?.balanceMes)}
            icon={<BalanceIcon fontSize="inherit" />}
            color={(stats?.balanceMes ?? 0) >= 0 ? '#2563eb' : '#dc2626'}
          />
        </Grid>
      </Grid>

      {/* Acciones rÃ¡pidas */}
      {puedeCrear && (
        <Paper variant="outlined" sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
          <Button variant="contained" color="success" startIcon={<AddIcon />}
            onClick={() => setDlgMov({ open: true, modo: 'crear', data: null, tipoPreset: 'ingreso' })}>
            Registrar Ingreso
          </Button>
          <Button variant="contained" color="error" startIcon={<AddIcon />}
            onClick={() => setDlgMov({ open: true, modo: 'crear', data: null, tipoPreset: 'egreso' })}>
            Registrar Egreso
          </Button>
        </Paper>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }} variant="scrollable" scrollButtons="auto">
        <Tab label="Resumen" />
        <Tab label="Movimientos" />
        <Tab label="Cuentas" />
        <Tab label="Presupuesto" />
        <Tab label="Reporte Contador" />
        <Tab label="Caja Menor" icon={<SavingsIcon fontSize="small" />} iconPosition="start" />
      </Tabs>

      {/* â”€â”€ Tab 0: Resumen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {tab === 0 && (
        <Grid container spacing={3} sx={{ pt: 1 }}>
          {(stats?.ultimosDosMeses ?? []).length > 0 && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight="bold" mb={2}>Ãšltimos 2 meses</Typography>
                  <ResponsiveContainer width="100%" height={190}>
                    <BarChart data={stats.ultimosDosMeses} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} />
                      <RTooltip formatter={v => fmt(v)} />
                      <Legend />
                      <Bar dataKey="ingresos" fill="#16a34a" name="Ingresos" />
                      <Bar dataKey="egresos"  fill="#dc2626" name="Egresos"  />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold" mb={1.5}>Saldos por cuenta</Typography>
                {cuentas.length === 0
                  ? <Typography variant="body2" color="text.secondary">
                      No hay cuentas. AgrÃ©galas en la pestaÃ±a "Cuentas".
                    </Typography>
                  : cuentas.map(c => (
                    <Box key={c.id} sx={{ display: 'flex', justifyContent: 'space-between', py: .75,
                        borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Box>
                        <Typography variant="body2">{c.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.tipo === 'cuenta_bancaria' ? `${c.banco ?? ''} Â· ${c.numeroCuenta ?? ''}` : c.tipo === 'caja_menor' ? 'Caja menor' : 'Caja efectivo'}
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="bold"
                        color={(c.saldoActual ?? 0) >= 0 ? 'success.main' : 'error.main'}>
                        {fmt(c.saldoActual)}
                      </Typography>
                    </Box>
                  ))
                }
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold" mb={1.5}>
                  Ãšltimos movimientos â€” {MESES[now.getMonth()]} {now.getFullYear()}
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Concepto</TableCell>
                        <TableCell>CategorÃ­a PUC</TableCell>
                        <TableCell>Cuenta</TableCell>
                        <TableCell align="right">Monto</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {movimientos.slice(0, 10).map(m => (
                        <TableRow key={m.id}>
                          <TableCell>{fmtFecha(m.fecha)}</TableCell>
                          <TableCell>
                            <Chip label={m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                              color={m.tipo === 'ingreso' ? 'success' : 'error'} size="small" />
                          </TableCell>
                          <TableCell>{m.concepto}</TableCell>
                          <TableCell>
                            <Tooltip title={m.categoriaNombre}>
                              <Typography variant="caption">{m.codigoPuc}</Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>{m.cuentaNombre}</TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="bold"
                              color={m.tipo === 'ingreso' ? 'success.main' : 'error.main'}>
                              {m.tipo === 'ingreso' ? '+' : 'âˆ’'}{fmt(m.monto)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                      {movimientos.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                            <Typography color="text.secondary">Sin movimientos este mes</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* â”€â”€ Tab 1: Movimientos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {tab === 1 && (
        <Box>
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Tipo</InputLabel>
              <Select value={filtroTipo} label="Tipo" onChange={e => setFiltroTipo(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="ingreso">Ingreso</MenuItem>
                <MenuItem value="egreso">Egreso</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Mes</InputLabel>
              <Select value={filtroMes} label="Mes" onChange={e => setFiltroMes(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {MESES.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>AÃ±o</InputLabel>
              <Select value={filtroAnio} label="AÃ±o" onChange={e => setFiltroAnio(e.target.value)}>
                {ANIOS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="outlined" size="small" onClick={cargarMovimientos}>Filtrar</Button>
            </Box>
          </Paper>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Concepto</TableCell>
                  <TableCell>CategorÃ­a PUC</TableCell>
                  <TableCell>Cuenta</TableCell>
                  <TableCell>Programa</TableCell>
                  <TableCell>Soporte</TableCell>
                  <TableCell align="right">Monto</TableCell>
                  {puedeEditar && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {movimientos.map(m => (
                  <TableRow key={m.id} hover>
                    <TableCell>{fmtFecha(m.fecha)}</TableCell>
                    <TableCell>
                      <Chip label={m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        color={m.tipo === 'ingreso' ? 'success' : 'error'} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{m.concepto}</Typography>
                      {m.terceroNombre && (
                        <Typography variant="caption" color="text.secondary">{m.terceroNombre}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={m.categoriaNombre}>
                        <Typography variant="caption">{m.codigoPuc}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{m.cuentaNombre}</TableCell>
                    <TableCell>{m.programaNombre ?? 'â€”'}</TableCell>
                    <TableCell>{m.numeroSoporte ?? 'â€”'}</TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="bold"
                        color={m.tipo === 'ingreso' ? 'success.main' : 'error.main'}>
                        {m.tipo === 'ingreso' ? '+' : 'âˆ’'}{fmt(m.monto)}
                      </Typography>
                    </TableCell>
                    {puedeEditar && (
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <IconButton size="small"
                          onClick={() => setDlgMov({ open: true, modo: 'editar', data: m, tipoPreset: m.tipo })}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => eliminarMovimiento(m.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {movimientos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No hay movimientos con los filtros actuales</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* â”€â”€ Tab 2: Cuentas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {tab === 2 && (
        <Box>
          {puedeCrear && (
            <Button variant="contained" startIcon={<AddIcon />} sx={{ mb: 3 }}
              onClick={() => setDlgCuenta({ open: true, modo: 'crear', data: null })}>
              Nueva Cuenta
            </Button>
          )}
          <Grid container spacing={3}>
            {cuentas.map(c => (
              <Grid item xs={12} sm={6} md={4} key={c.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">{c.nombre}</Typography>
                        <Chip
                          label={c.tipo === 'cuenta_bancaria' ? 'Banco' : c.tipo === 'caja_menor' ? 'Caja Menor' : 'Caja'}
                          color={c.tipo === 'caja_menor' ? 'warning' : 'default'}
                          size="small" sx={{ mt: .5 }} />
                        {c.banco && (
                          <Typography variant="caption" display="block" color="text.secondary">{c.banco}</Typography>
                        )}
                        {c.numeroCuenta && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Cta: {c.numeroCuenta}
                          </Typography>
                        )}
                      </Box>
                      {puedeEditar && (
                        <Box>
                          <IconButton size="small"
                            onClick={() => setDlgCuenta({ open: true, modo: 'editar', data: c })}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => eliminarCuenta(c.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Saldo inicial</Typography>
                      <Typography variant="caption">{fmt(c.saldoInicial)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: .5 }}>
                      <Typography variant="body2" fontWeight="bold">Saldo actual</Typography>
                      <Typography variant="body2" fontWeight="bold"
                        color={(c.saldoActual ?? 0) >= 0 ? 'success.main' : 'error.main'}>
                        {fmt(c.saldoActual)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {cuentas.length === 0 && (
              <Grid item xs={12}>
                <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                  No hay cuentas. Crea una cuenta de caja o bancaria para empezar a registrar movimientos.
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* â”€â”€ Tab 3: Presupuesto â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {tab === 3 && (
        <Box>
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>AÃ±o</InputLabel>
              <Select value={presAnio} label="AÃ±o" onChange={e => setPresAnio(e.target.value)}>
                {ANIOS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="outlined" size="small" onClick={cargarPresupuesto}>Cargar</Button>
            {puedeCrear && (
              <Button variant="contained" startIcon={<AddIcon />}
                onClick={() => setDlgPres({ open: true, modo: 'crear', data: null })}>
                Agregar lÃ­nea
              </Button>
            )}
            </Box>
          </Paper>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>PUC</TableCell>
                  <TableCell>CategorÃ­a</TableCell>
                  <TableCell>Programa</TableCell>
                  <TableCell align="right">Presupuestado</TableCell>
                  <TableCell align="right">Ejecutado</TableCell>
                  <TableCell align="right">Disponible</TableCell>
                  <TableCell>% EjecuciÃ³n</TableCell>
                  {puedeEditar && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {presupuesto.map(p => {
                  const pct = p.montoPresupuestado > 0
                    ? Math.round((p.ejecutado / p.montoPresupuestado) * 100) : 0;
                  return (
                    <TableRow key={p.id} hover>
                      <TableCell><Typography variant="caption">{p.codigoPuc}</Typography></TableCell>
                      <TableCell>{p.categoriaNombre}</TableCell>
                      <TableCell>{p.programaNombre ?? '(General)'}</TableCell>
                      <TableCell align="right">{fmt(p.montoPresupuestado)}</TableCell>
                      <TableCell align="right">{fmt(p.ejecutado)}</TableCell>
                      <TableCell align="right">
                        <Typography color={p.disponible < 0 ? 'error.main' : 'inherit'}>
                          {fmt(p.disponible)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 130 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(pct, 100)}
                            color={pct > 90 ? 'error' : pct > 70 ? 'warning' : 'success'}
                            sx={{ flex: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption">{pct}%</Typography>
                        </Box>
                      </TableCell>
                      {puedeEditar && (
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <IconButton size="small"
                            onClick={() => setDlgPres({ open: true, modo: 'editar', data: p })}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => eliminarPresupuesto(p.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {presupuesto.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        Sin presupuesto definido para {presAnio}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* â”€â”€ Tab 4: Reporte Contador â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {tab === 4 && (
        <Box>
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Mes</InputLabel>
              <Select value={repMes} label="Mes" onChange={e => setRepMes(e.target.value)}>
                {MESES.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>AÃ±o</InputLabel>
              <Select value={repAnio} label="AÃ±o" onChange={e => setRepAnio(e.target.value)}>
                {ANIOS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="contained" onClick={generarReporte}>Generar Reporte</Button>
            {reporte && (
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
                Imprimir
              </Button>
            )}
          </Box>
          </Paper>

          {!reporte && (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>
              Selecciona el mes y aÃ±o, luego haz clic en "Generar Reporte"
            </Typography>
          )}

          {reporte && (
            <Box>
              {/* Totales */}
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Reporte Contable â€” {reporte.periodo}
                  </Typography>
                  <Grid container spacing={2}>
                    {[
                      { label: 'Total Ingresos', value: reporte.totalIngresos, color: 'success' },
                      { label: 'Total Egresos',  value: reporte.totalEgresos,  color: 'error'   },
                      { label: 'Balance',        value: reporte.balance,       color: reporte.balance >= 0 ? 'primary' : 'error' },
                    ].map(({ label, value, color }) => (
                      <Grid item xs={12} sm={4} key={label}>
                        <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: `${color}.50`, borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                          <Typography variant="h6" fontWeight="bold" color={`${color}.main`}>
                            {fmt(value)}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>

              {/* Por cuenta PUC y por programa */}
              <Grid container spacing={2} mb={2}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Por Cuenta PUC
                      </Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>PUC</TableCell>
                            <TableCell>Cuenta</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell align="right">Total</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reporte.porCuenta.map((r, i) => (
                            <TableRow key={i}>
                              <TableCell><Typography variant="caption">{r.codigoPuc}</Typography></TableCell>
                              <TableCell>{r.cuenta}</TableCell>
                              <TableCell>
                                <Chip label={r.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                                  color={r.tipo === 'ingreso' ? 'success' : 'error'} size="small" />
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmt(r.total)}</TableCell>
                            </TableRow>
                          ))}
                          {reporte.porCuenta.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} align="center">
                                <Typography variant="caption" color="text.secondary">Sin movimientos</Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Por Programa</Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Programa</TableCell>
                            <TableCell align="right">Ingresos</TableCell>
                            <TableCell align="right">Egresos</TableCell>
                            <TableCell align="right">Balance</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reporte.porPrograma.map((r, i) => (
                            <TableRow key={i}>
                              <TableCell>{r.programa}</TableCell>
                              <TableCell align="right" sx={{ color: 'success.main' }}>{fmt(r.ingresos)}</TableCell>
                              <TableCell align="right" sx={{ color: 'error.main'   }}>{fmt(r.egresos)}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold',
                                color: r.balance >= 0 ? 'primary.main' : 'error.main' }}>
                                {fmt(r.balance)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Detalle movimientos */}
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Detalle de Movimientos
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Fecha</TableCell>
                          <TableCell>Tipo</TableCell>
                          <TableCell>Concepto</TableCell>
                          <TableCell>PUC</TableCell>
                          <TableCell>Tercero</TableCell>
                          <TableCell>Soporte</TableCell>
                          <TableCell align="right">Monto</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reporte.movimientos.map(m => (
                          <TableRow key={m.id}>
                            <TableCell>{fmtFecha(m.fecha)}</TableCell>
                            <TableCell>
                              <Chip label={m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                                color={m.tipo === 'ingreso' ? 'success' : 'error'} size="small" />
                            </TableCell>
                            <TableCell>{m.concepto}</TableCell>
                            <TableCell><Typography variant="caption">{m.codigoPuc}</Typography></TableCell>
                            <TableCell>{m.terceroNombre ?? 'â€”'}</TableCell>
                            <TableCell>{m.numeroSoporte ?? 'â€”'}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold',
                              color: m.tipo === 'ingreso' ? 'success.main' : 'error.main' }}>
                              {m.tipo === 'ingreso' ? '+' : 'âˆ’'}{fmt(m.monto)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {reporte.movimientos.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              <Typography variant="caption" color="text.secondary">
                                Sin movimientos en este periodo
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      )}

      {/* â”€â”€ Tab 5: Caja Menor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {tab === 5 && (
        <Box>
          {/* Selector de cuenta + filtros */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Cuenta de caja</InputLabel>
              <Select value={cajaCuentaId} label="Cuenta de caja"
                onChange={e => setCajaCuentaId(e.target.value)}>
                {cuentas.filter(c => c.tipo !== 'cuenta_bancaria').map(c =>
                  <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                )}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Mes</InputLabel>
              <Select value={cajaMes} label="Mes" onChange={e => setCajaMes(e.target.value)}>
                <MenuItem value="">Todo el aÃ±o</MenuItem>
                {MESES.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>AÃ±o</InputLabel>
              <Select value={cajaAnio} label="AÃ±o" onChange={e => setCajaAnio(e.target.value)}>
                {ANIOS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="outlined" size="small" onClick={cargarCajaMenor}>Filtrar</Button>
          </Box>
          </Paper>

          {!cajaCuentaId
            ? <Alert severity="info">
                Crea una cuenta de tipo <strong>Caja Menor</strong> en la pestaÃ±a "Cuentas" para usar este mÃ³dulo.
              </Alert>
            : (() => {
                const cuenta = cuentas.find(c => c.id === cajaCuentaId);
                const totalIng = libroAuxiliar.reduce((s, r) => s + r.ingreso, 0);
                const totalEgr = libroAuxiliar.reduce((s, r) => s + r.egreso,  0);
                const ultimoArqueo = arqueos[0];
                return (
                  <>
                    {/* KPIs */}
                    <Grid container spacing={2} mb={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <KpiCard label="Saldo actual" value={fmt(cuenta?.saldoActual)}
                          icon={<AccountBalanceWalletIcon fontSize="inherit" />} color="#4E1B95" />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <KpiCard label={`Ingresos${cajaMes ? ` ${MESES[cajaMes - 1]}` : ''}`}
                          value={fmt(totalIng)} icon={<TrendingUpIcon fontSize="inherit" />} color="#16a34a" />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <KpiCard label={`Egresos${cajaMes ? ` ${MESES[cajaMes - 1]}` : ''}`}
                          value={fmt(totalEgr)} icon={<TrendingDownIcon fontSize="inherit" />} color="#dc2626" />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <KpiCard
                          label="Ãšltimo arqueo"
                          value={ultimoArqueo ? fmtFecha(ultimoArqueo.fecha) : 'Sin arqueos'}
                          icon={<BalanceIcon fontSize="inherit" />}
                          color={ultimoArqueo
                            ? (ultimoArqueo.diferencia === 0 ? '#16a34a' : '#dc2626')
                            : '#64748b'}
                        />
                      </Grid>
                    </Grid>

                    {/* Acciones */}
                    {puedeCrear && (
                      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                        <Button variant="contained" color="success" size="small" startIcon={<AddIcon />}
                          onClick={() => setDlgMov({ open: true, modo: 'crear', data: null, tipoPreset: 'ingreso', cuentaPreset: cajaCuentaId })}>
                          Registrar Ingreso
                        </Button>
                        <Button variant="contained" color="error" size="small" startIcon={<AddIcon />}
                          onClick={() => setDlgMov({ open: true, modo: 'crear', data: null, tipoPreset: 'egreso', cuentaPreset: cajaCuentaId })}>
                          Registrar Gasto
                        </Button>
                        <Button variant="outlined" color="primary" size="small" startIcon={<SyncAltIcon />}
                          onClick={() => setDlgReposicion({ open: true })}>
                          Reponer Caja
                        </Button>
                        <Button variant="outlined" size="small" startIcon={<FactCheckIcon />}
                          onClick={() => setDlgArqueo({ open: true })}>
                          Arquear Caja
                        </Button>
                      </Box>
                    )}

                    {/* Libro auxiliar */}
                    <Divider sx={{ mb: 2 }} />
                    <SectionHeader title={`Libro Auxiliar â€” ${cuenta?.nombre}`} />
                    {cargandoCaja
                      ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
                      : (
                        <TableContainer component={Paper} sx={{ mb: 4 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell>Fecha</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell>Concepto</TableCell>
                                <TableCell>CategorÃ­a PUC</TableCell>
                                <TableCell>Programa</TableCell>
                                <TableCell>Tercero / Soporte</TableCell>
                                <TableCell align="right" sx={{ color: 'success.main' }}>Ingreso</TableCell>
                                <TableCell align="right" sx={{ color: 'error.main' }}>Egreso</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Saldo</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {libroAuxiliar.map(row => (
                                <TableRow key={row.id} hover>
                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtFecha(row.fecha)}</TableCell>
                                  <TableCell>
                                    <Chip label={row.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
                                      color={row.tipo === 'ingreso' ? 'success' : 'error'} size="small" />
                                  </TableCell>
                                  <TableCell>{row.concepto}</TableCell>
                                  <TableCell>
                                    <Tooltip title={row.categoriaNombre}>
                                      <Typography variant="caption">{row.codigoPuc}</Typography>
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell>{row.programaNombre ?? 'â€”'}</TableCell>
                                  <TableCell>
                                    {row.terceroNombre && (
                                      <Typography variant="body2">{row.terceroNombre}</Typography>
                                    )}
                                    {row.numeroSoporte && (
                                      <Typography variant="caption" color="text.secondary">
                                        {row.numeroSoporte}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography sx={{ color: 'success.main', fontWeight: row.ingreso > 0 ? 'bold' : 'normal' }}>
                                      {row.ingreso > 0 ? fmt(row.ingreso) : 'â€”'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography sx={{ color: 'error.main', fontWeight: row.egreso > 0 ? 'bold' : 'normal' }}>
                                      {row.egreso > 0 ? fmt(row.egreso) : 'â€”'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography fontWeight="bold"
                                      color={row.saldoAcumulado >= 0 ? 'success.main' : 'error.main'}>
                                      {fmt(row.saldoAcumulado)}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {libroAuxiliar.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">
                                      No hay movimientos en este perÃ­odo
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )
                    }

                    {/* Arqueos */}
                    <Divider sx={{ mb: 2 }} />
                    <SectionHeader title="Arqueos de Caja" />
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell>Fecha</TableCell>
                            <TableCell align="right">Saldo Sistema</TableCell>
                            <TableCell align="right">Conteo FÃ­sico</TableCell>
                            <TableCell align="right">Diferencia</TableCell>
                            <TableCell>Responsable</TableCell>
                            <TableCell>ObservaciÃ³n</TableCell>
                            {puedeEditar && <TableCell />}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {arqueos.map(a => (
                            <TableRow key={a.id} hover>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtFecha(a.fecha)}</TableCell>
                              <TableCell align="right">{fmt(a.saldoSistema)}</TableCell>
                              <TableCell align="right">{fmt(a.saldoFisico)}</TableCell>
                              <TableCell align="right">
                                <Typography fontWeight="bold"
                                  color={a.diferencia === 0 ? 'success.main' : a.diferencia > 0 ? 'primary.main' : 'error.main'}>
                                  {a.diferencia > 0 ? '+' : ''}{fmt(a.diferencia)}
                                  {a.diferencia === 0 && ' âœ“'}
                                  {a.diferencia > 0 && ' (Sobrante)'}
                                  {a.diferencia < 0 && ' (Faltante)'}
                                </Typography>
                              </TableCell>
                              <TableCell>{a.responsable ?? 'â€”'}</TableCell>
                              <TableCell sx={{ maxWidth: 200 }}>
                                <Typography variant="body2" noWrap>{a.observacion ?? 'â€”'}</Typography>
                              </TableCell>
                              {puedeEditar && (
                                <TableCell>
                                  <IconButton size="small" color="error" onClick={() => eliminarArqueo(a.id)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                          {arqueos.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={puedeEditar ? 7 : 6} align="center" sx={{ py: 3 }}>
                                <Typography color="text.secondary">
                                  No hay arqueos registrados para esta cuenta
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                );
              })()
          }
        </Box>
      )}

      {/* Dialogs */}
      <DialogMovimiento
        open={dlgMov.open}
        modo={dlgMov.modo}
        data={dlgMov.data}
        tipoPreset={dlgMov.tipoPreset}
        cuentaPreset={dlgMov.cuentaPreset}
        cuentas={cuentas}
        categorias={categorias}
        programas={programas}
        guardando={guardando}
        onClose={() => setDlgMov(d => ({ ...d, open: false }))}
        onGuardar={guardarMovimiento}
      />
      <DialogArqueo
        open={dlgArqueo.open}
        cuenta={cuentas.find(c => c.id === cajaCuentaId)}
        guardando={guardando}
        onClose={() => setDlgArqueo({ open: false })}
        onGuardar={guardarArqueo}
      />
      <DialogReposicion
        open={dlgReposicion.open}
        cuentaCajaId={cajaCuentaId}
        cuentas={cuentas}
        guardando={guardando}
        onClose={() => setDlgReposicion({ open: false })}
        onGuardar={guardarReposicion}
      />
      <DialogCuenta
        open={dlgCuenta.open}
        modo={dlgCuenta.modo}
        data={dlgCuenta.data}
        guardando={guardando}
        onClose={() => setDlgCuenta(d => ({ ...d, open: false }))}
        onGuardar={guardarCuenta}
      />
      <DialogPresupuesto
        open={dlgPres.open}
        modo={dlgPres.modo}
        data={dlgPres.data}
        categorias={categorias}
        programas={programas}
        presAnio={presAnio}
        guardando={guardando}
        onClose={() => setDlgPres(d => ({ ...d, open: false }))}
        onGuardar={guardarPresupuesto}
      />
    </Box>
  );
}

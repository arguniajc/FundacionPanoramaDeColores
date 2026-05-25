import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Grid, Tabs, Tab, Button,
  CircularProgress, Alert, Paper,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddIcon                  from '@mui/icons-material/Add';
import BalanceIcon              from '@mui/icons-material/Balance';
import DocumentScannerIcon      from '@mui/icons-material/DocumentScanner';
import MenuBookIcon             from '@mui/icons-material/MenuBook';
import SavingsIcon              from '@mui/icons-material/Savings';
import TrendingDownIcon         from '@mui/icons-material/TrendingDown';
import TrendingUpIcon           from '@mui/icons-material/TrendingUp';
import SkeletonTabla            from '../../../../shared/components/SkeletonTabla';
import apiClient from '../../../../infrastructure/http/apiClient';
import { useAuth } from '../../../../application/auth/AuthContext';
import { useConfirm } from '../../../../shared/components/ConfirmDialog';
import { useConfiguracion } from '../../../../shared/context/ConfiguracionContext';
import { BRAND_COLOR } from '../../../../shared/constants/brand';
import { fmt, KpiCard } from './components/helpers';
import { DialogMovimiento }  from './components/DialogMovimiento';
import { DialogCuenta }      from './components/DialogCuenta';
import { DialogPresupuesto } from './components/DialogPresupuesto';
import { DialogArqueo }      from './components/DialogArqueo';
import { DialogReposicion }  from './components/DialogReposicion';
import { LibroMayorTab }     from './components/LibroMayorTab';
import { generarComprobantePDF } from './components/generarComprobantePDF';
import { TabResumen }         from './components/TabResumen';
import { TabMovimientos }     from './components/TabMovimientos';
import { TabCuentas }         from './components/TabCuentas';
import { TabPresupuesto }     from './components/TabPresupuesto';
import { TabReporteContador } from './components/TabReporteContador';
import { TabCajaMenor }       from './components/TabCajaMenor';
import { DialogComprobante }  from './components/DialogComprobante';

export default function ContabilidadPage() {
  const { puedo } = useAuth();
  const confirm    = useConfirm();
  const config     = useConfiguracion();
  const inputOcrRef = useRef(null);
  const [ocrCargando,    setOcrCargando]    = useState(false);
  const [ocrAdvertencia, setOcrAdvertencia] = useState('');
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
  const [filtroTipo,   setFiltroTipo]   = useState('');
  const [filtroMes,    setFiltroMes]    = useState(now.getMonth() + 1);
  const [filtroAnio,   setFiltroAnio]   = useState(now.getFullYear());
  const [filtroCuenta, setFiltroCuenta] = useState('');

  const [presAnio, setPresAnio] = useState(now.getFullYear());
  const [repMes,   setRepMes]   = useState(now.getMonth() + 1);
  const [repAnio,  setRepAnio]  = useState(now.getFullYear());

  const [dlgMov,       setDlgMov]       = useState({ open: false, modo: 'crear', data: null, tipoPreset: 'ingreso', cuentaPreset: null });
  const [dlgCuenta,    setDlgCuenta]    = useState({ open: false, modo: 'crear', data: null });
  const [dlgPres,      setDlgPres]      = useState({ open: false, modo: 'crear', data: null });
  const [guardando,    setGuardando]    = useState(false);
  const [busquedaMov,  setBusquedaMov]  = useState('');
  const [dlgComprobante, setDlgComprobante] = useState(null);
  const [resumenAnual, setResumenAnual] = useState(null);

  // Tab Caja Menor
  const [cajaCuentaId,  setCajaCuentaId]  = useState('');
  const [cajaMes,       setCajaMes]       = useState(now.getMonth() + 1);
  const [cajaAnio,      setCajaAnio]      = useState(now.getFullYear());
  const [libroAuxiliar, setLibroAuxiliar] = useState([]);
  const [arqueos,       setArqueos]       = useState([]);
  const [cargandoCaja,  setCargandoCaja]  = useState(false);
  const [dlgArqueo,     setDlgArqueo]     = useState({ open: false });
  const [dlgReposicion, setDlgReposicion] = useState({ open: false });

  // ── Carga inicial ─────────────────────────────────────────────────────────
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
        setError('No se pudo cargar el módulo de contabilidad.');
      } finally {
        setCargando(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Recargas por filtro ───────────────────────────────────────────────────
  const cargarMovimientos = useCallback(async () => {
    const params = {};
    if (filtroTipo)   params.tipo     = filtroTipo;
    if (filtroMes)    params.mes      = filtroMes;
    if (filtroAnio)   params.anio     = filtroAnio;
    if (filtroCuenta) params.cuentaId = filtroCuenta;
    const { data } = await apiClient.get('/api/contabilidad/movimientos', { params });
    setMovimientos(data);
  }, [filtroTipo, filtroMes, filtroAnio, filtroCuenta]);

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

  useEffect(() => {
    if (tab === 5 && !cajaCuentaId) {
      const primera = cuentas.find(c => c.tipo !== 'cuenta_bancaria');
      if (primera) setCajaCuentaId(primera.id);
    }
  }, [tab, cuentas]);

  useEffect(() => {
    if (cajaCuentaId) cargarCajaMenor();
  }, [cajaCuentaId]);

  const generarReporte = async () => {
    const { data } = await apiClient.get('/api/contabilidad/reporte', {
      params: { mes: repMes, anio: repAnio },
    });
    setReporte(data);
  };

  // ── Movimientos CRUD ──────────────────────────────────────────────────────
  const guardarMovimiento = async (form) => {
    setGuardando(true);
    try {
      if (dlgMov.modo === 'crear') await apiClient.post('/api/contabilidad/movimientos', form);
      else await apiClient.put(`/api/contabilidad/movimientos/${dlgMov.data.id}`, form);
      await Promise.all([cargarStats(), cargarCuentas(), cargarMovimientos()]);
      if (tab === 5) await cargarCajaMenor();
      setDlgMov(d => ({ ...d, open: false }));
    } finally { setGuardando(false); }
  };

  const eliminarMovimiento = async (id) => {
    if (!await confirm('¿Eliminar este movimiento? El saldo de la cuenta se ajustará automáticamente.')) return;
    await apiClient.delete(`/api/contabilidad/movimientos/${id}`);
    await Promise.all([cargarStats(), cargarCuentas(), cargarMovimientos()]);
    if (tab === 5) await cargarCajaMenor();
  };

  const anularMovimiento = async (id) => {
    if (!await confirm('¿Anular este movimiento? El saldo de la cuenta se revertirá y el movimiento quedará en el historial como Anulado.')) return;
    await apiClient.patch(`/api/contabilidad/movimientos/${id}/anular`);
    await Promise.all([cargarStats(), cargarCuentas(), cargarMovimientos()]);
    if (tab === 5) await cargarCajaMenor();
  };

  // ── OCR ───────────────────────────────────────────────────────────────────
  const comprimirImagen = (file) => new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1400;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result.split(',')[1]);
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.85);
    };
    img.src = url;
  });

  const handleEscanearFactura = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setOcrCargando(true);
    setOcrAdvertencia('');
    try {
      const base64 = await comprimirImagen(file);
      const { data } = await apiClient.post('/api/contabilidad/extraer-factura', {
        imagenBase64: base64,
        mimeType: 'image/jpeg',
      });
      if (data.advertencia) setOcrAdvertencia(data.advertencia);
      setDlgMov({
        open: true, modo: 'crear', tipoPreset: 'egreso',
        data: {
          tipo:             'egreso',
          fecha:            data.fecha            ?? null,
          concepto:         data.concepto         ?? '',
          monto:            data.monto            ?? '',
          terceroNombre:    data.nombreProveedor  ?? '',
          terceroDocumento: data.nitProveedor     ?? '',
          numeroSoporte:    data.numeroFactura    ?? '',
          tipoSoporte:      data.tipoSoporte      ?? 'factura',
        },
      });
    } catch (err) {
      const d = err?.response?.data;
      const msg = d?.detalle
        ? `${d.error ?? 'Error'}: ${d.detalle}`
        : d?.error ?? `Error ${err?.response?.status ?? 'de red'}: ${err?.message ?? 'No se pudo procesar la imagen.'}`;
      setOcrAdvertencia(msg);
    } finally { setOcrCargando(false); }
  };

  // ── Caja Menor CRUD ───────────────────────────────────────────────────────
  const guardarArqueo = async (form) => {
    setGuardando(true);
    try {
      await apiClient.post('/api/contabilidad/caja-menor/arqueos', form);
      await cargarCajaMenor();
      setDlgArqueo({ open: false });
    } finally { setGuardando(false); }
  };

  const eliminarArqueo = async (id) => {
    if (!await confirm('¿Eliminar este arqueo?')) return;
    await apiClient.delete(`/api/contabilidad/caja-menor/arqueos/${id}`);
    await cargarCajaMenor();
  };

  const guardarReposicion = async (form) => {
    setGuardando(true);
    try {
      await apiClient.post('/api/contabilidad/caja-menor/reposicion', form);
      await Promise.all([cargarStats(), cargarCuentas(), cargarCajaMenor()]);
      setDlgReposicion({ open: false });
    } finally { setGuardando(false); }
  };

  // ── Cuentas CRUD ──────────────────────────────────────────────────────────
  const guardarCuenta = async (form) => {
    setGuardando(true);
    try {
      if (dlgCuenta.modo === 'crear') await apiClient.post('/api/contabilidad/cuentas', form);
      else await apiClient.put(`/api/contabilidad/cuentas/${dlgCuenta.data.id}`, form);
      await Promise.all([cargarCuentas(), cargarStats()]);
      setDlgCuenta(d => ({ ...d, open: false }));
    } finally { setGuardando(false); }
  };

  const eliminarCuenta = async (id) => {
    if (!await confirm('¿Eliminar esta cuenta? Solo es posible si no tiene movimientos registrados.')) return;
    try {
      await apiClient.delete(`/api/contabilidad/cuentas/${id}`);
      await Promise.all([cargarCuentas(), cargarStats()]);
    } catch {
      alert('No se pudo eliminar: la cuenta tiene movimientos asociados.');
    }
  };

  // ── Presupuesto CRUD ──────────────────────────────────────────────────────
  const guardarPresupuesto = async (form) => {
    setGuardando(true);
    try {
      if (dlgPres.modo === 'crear') await apiClient.post('/api/contabilidad/presupuesto', form);
      else await apiClient.put(`/api/contabilidad/presupuesto/${dlgPres.data.id}`, form);
      await cargarPresupuesto();
      setDlgPres(d => ({ ...d, open: false }));
    } finally { setGuardando(false); }
  };

  const eliminarPresupuesto = async (id) => {
    if (!await confirm('¿Eliminar esta línea presupuestal?')) return;
    await apiClient.delete(`/api/contabilidad/presupuesto/${id}`);
    await cargarPresupuesto();
  };

  const exportarCSV = () => {
    const bq = busquedaMov.toLowerCase();
    const filas = movimientos
      .filter(m => !bq || (m.concepto + ' ' + (m.terceroNombre ?? '')).toLowerCase().includes(bq))
      .map(m => [
        m.consecutivo ? '#' + m.consecutivo + '-' + new Date(m.fecha).getFullYear() : '',
        m.fecha, m.tipo, m.concepto, m.codigoPuc, m.categoriaNombre,
        m.cuentaNombre, m.programaNombre ?? '', m.terceroNombre ?? '', m.terceroDocumento ?? '',
        m.numeroSoporte ?? '', m.tipoSoporte ?? '',
        m.monto, m.retencionPracticada ?? '',
      ].join(','));
    const header = 'N Comp.,Fecha,Tipo,Concepto,Cod.PUC,Categoria,Cuenta,Programa,Tercero,NIT,Soporte,TipoSoporte,Monto,RTE';
    const csv = [header, ...filas].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'movimientos_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
  };

  const cargarResumenAnual = async (anio) => {
    try {
      const { data } = await apiClient.get('/api/contabilidad/resumen-anual', { params: { anio } });
      setResumenAnual(data);
    } catch { setResumenAnual(null); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (cargando) return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <SkeletonTabla columnas={6} filas={10} />
    </Box>
  );
  if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <Paper sx={{
        p: { xs: 2, sm: 3 }, mb: 3,
        background: `linear-gradient(135deg, ${BRAND_COLOR} 0%, #7C3AED 100%)`,
        borderRadius: 3, color: 'white',
      }} elevation={0}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2, p: 1.25, display: 'flex' }}>
            <AccountBalanceWalletIcon sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold">Contabilidad</Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.25 }}>
              Registra ingresos y egresos con categorías PUC. Los datos quedan organizados para entregar al contador.
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Saldo total" value={fmt(stats?.saldoTotal)}
            icon={<AccountBalanceWalletIcon fontSize="inherit" />} color={BRAND_COLOR} />
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
          <Button
            variant="outlined" color="secondary"
            startIcon={ocrCargando ? <CircularProgress size={16} /> : <DocumentScannerIcon />}
            disabled={ocrCargando}
            onClick={() => inputOcrRef.current?.click()}>
            {ocrCargando ? 'Analizando...' : 'Escanear Factura'}
          </Button>
          <input
            ref={inputOcrRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleEscanearFactura}
          />
        </Paper>
      )}
      {ocrAdvertencia && (
        <Alert severity="warning" onClose={() => setOcrAdvertencia('')} sx={{ mb: 2 }}>
          <strong>OCR:</strong> {ocrAdvertencia}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }} variant="scrollable" scrollButtons="auto">
        <Tab label="Resumen" />
        <Tab label="Movimientos" />
        <Tab label="Cuentas" />
        <Tab label="Presupuesto" />
        <Tab label="Reporte Contador" />
        <Tab label="Caja Menor" icon={<SavingsIcon fontSize="small" />} iconPosition="start" />
        <Tab label="Libro Mayor" icon={<MenuBookIcon fontSize="small" />} iconPosition="start" />
      </Tabs>

      {tab === 0 && <TabResumen stats={stats} cuentas={cuentas} movimientos={movimientos} />}

      {tab === 1 && (
        <TabMovimientos
          movimientos={movimientos} cuentas={cuentas}
          filtroTipo={filtroTipo} setFiltroTipo={setFiltroTipo}
          filtroMes={filtroMes} setFiltroMes={setFiltroMes}
          filtroAnio={filtroAnio} setFiltroAnio={setFiltroAnio}
          filtroCuenta={filtroCuenta} setFiltroCuenta={setFiltroCuenta}
          busqueda={busquedaMov} onBusqueda={setBusquedaMov}
          puedeCrear={puedeCrear} puedeEditar={puedeEditar}
          onFiltrar={cargarMovimientos}
          onExportarCSV={exportarCSV}
          onVerComprobante={m => setDlgComprobante(m)}
          onDescargarComprobante={m => generarComprobantePDF(m, config)}
          onDuplicar={m => setDlgMov({ open: true, modo: 'crear', tipoPreset: m.tipo, data: { ...m, id: null, consecutivo: null, fecha: null } })}
          onEditar={m => setDlgMov({ open: true, modo: 'editar', data: m, tipoPreset: m.tipo })}
          onAnular={id => anularMovimiento(id)}
          onEliminar={id => eliminarMovimiento(id)}
        />
      )}

      {tab === 2 && (
        <TabCuentas
          cuentas={cuentas}
          puedeCrear={puedeCrear} puedeEditar={puedeEditar}
          onCrear={() => setDlgCuenta({ open: true, modo: 'crear', data: null })}
          onEditar={c => setDlgCuenta({ open: true, modo: 'editar', data: c })}
          onEliminar={id => eliminarCuenta(id)}
        />
      )}

      {tab === 3 && (
        <TabPresupuesto
          presupuesto={presupuesto}
          presAnio={presAnio} setPresAnio={setPresAnio}
          puedeCrear={puedeCrear} puedeEditar={puedeEditar}
          onCargar={cargarPresupuesto}
          onCrear={() => setDlgPres({ open: true, modo: 'crear', data: null })}
          onEditar={p => setDlgPres({ open: true, modo: 'editar', data: p })}
          onEliminar={id => eliminarPresupuesto(id)}
        />
      )}

      {tab === 4 && (
        <TabReporteContador
          reporte={reporte}
          resumenAnual={resumenAnual}
          repMes={repMes} setRepMes={setRepMes}
          repAnio={repAnio} setRepAnio={setRepAnio}
          onGenerar={generarReporte}
          onCargarResumenAnual={cargarResumenAnual}
          config={config}
        />
      )}

      {tab === 5 && (
        <TabCajaMenor
          cuentas={cuentas}
          cajaCuentaId={cajaCuentaId} setCajaCuentaId={setCajaCuentaId}
          cajaMes={cajaMes} setCajaMes={setCajaMes}
          cajaAnio={cajaAnio} setCajaAnio={setCajaAnio}
          libroAuxiliar={libroAuxiliar}
          arqueos={arqueos}
          cargandoCaja={cargandoCaja}
          puedeCrear={puedeCrear} puedeEditar={puedeEditar}
          onFiltrar={cargarCajaMenor}
          onRegistrarIngreso={() => setDlgMov({ open: true, modo: 'crear', data: null, tipoPreset: 'ingreso', cuentaPreset: cajaCuentaId })}
          onRegistrarGasto={() => setDlgMov({ open: true, modo: 'crear', data: null, tipoPreset: 'egreso', cuentaPreset: cajaCuentaId })}
          onReponer={() => setDlgReposicion({ open: true })}
          onArquear={() => setDlgArqueo({ open: true })}
          onEliminarArqueo={id => eliminarArqueo(id)}
        />
      )}

      {tab === 6 && <LibroMayorTab />}

      <DialogComprobante
        mov={dlgComprobante}
        onClose={() => setDlgComprobante(null)}
        config={config}
      />
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

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
import { BRAND_COLOR } from '../../../../shared/constants/brand';
import { fmt, KpiCard } from './components/helpers';
import { DialogMovimiento }  from './components/DialogMovimiento';
import { DialogCuenta }      from './components/DialogCuenta';
import { DialogPresupuesto } from './components/DialogPresupuesto';
import { DialogArqueo }      from './components/DialogArqueo';
import { DialogReposicion }  from './components/DialogReposicion';
import { LibroMayorTab }     from './components/LibroMayorTab';
import { TabResumen }         from './components/TabResumen';
import { TabMovimientos }     from './components/TabMovimientos';
import { TabCuentas }         from './components/TabCuentas';
import { TabPresupuesto }     from './components/TabPresupuesto';
import { TabReporteContador } from './components/TabReporteContador';
import { TabCajaMenor }       from './components/TabCajaMenor';
import { DialogComprobante }  from './components/DialogComprobante';
import { useContabilidadPage } from './useContabilidadPage';

export default function ContabilidadPage() {
  const {
    puedeCrear, puedeEditar, config,
    tab, setTab,
    cargando, error,
    stats, cuentas, categorias, programas, movimientos, presupuesto, reporte, resumenAnual,
    guardando,
    filtroTipo, setFiltroTipo,
    filtroMes,  setFiltroMes,
    filtroAnio, setFiltroAnio,
    filtroCuenta, setFiltroCuenta,
    busquedaMov, setBusquedaMov,
    presAnio, setPresAnio,
    repMes, setRepMes, repAnio, setRepAnio,
    cajaCuentaId, setCajaCuentaId,
    cajaMes, setCajaMes, cajaAnio, setCajaAnio,
    libroAuxiliar, arqueos, cargandoCaja,
    ocrCargando, ocrAdvertencia, setOcrAdvertencia,
    inputOcrRef, handleEscanearFactura,
    dlgMov, setDlgMov,
    dlgCuenta, setDlgCuenta,
    dlgPres, setDlgPres,
    dlgArqueo, setDlgArqueo,
    dlgReposicion, setDlgReposicion,
    dlgComprobante, setDlgComprobante,
    cargarMovimientos, cargarPresupuesto, cargarCajaMenor,
    generarReporte, cargarResumenAnual,
    guardarMovimiento, eliminarMovimiento, anularMovimiento,
    guardarCuenta, eliminarCuenta,
    guardarPresupuesto, eliminarPresupuesto,
    guardarArqueo, eliminarArqueo, guardarReposicion,
    exportarCSV,
    abrirCrearIngreso, abrirCrearEgreso,
    abrirVerComprobante, abrirDescargarComprobante,
    abrirDuplicar, abrirEditar,
    abrirCrearCuenta, abrirEditarCuenta,
    abrirCrearPres, abrirEditarPres,
    abrirIngresoCaja, abrirGastoCaja,
  } = useContabilidadPage();

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
          <Button variant="contained" color="success" startIcon={<AddIcon />} onClick={abrirCrearIngreso}>
            Registrar Ingreso
          </Button>
          <Button variant="contained" color="error" startIcon={<AddIcon />} onClick={abrirCrearEgreso}>
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
            type="file" accept="image/*" capture="environment"
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
          filtroMes={filtroMes}   setFiltroMes={setFiltroMes}
          filtroAnio={filtroAnio} setFiltroAnio={setFiltroAnio}
          filtroCuenta={filtroCuenta} setFiltroCuenta={setFiltroCuenta}
          busqueda={busquedaMov}  onBusqueda={setBusquedaMov}
          puedeCrear={puedeCrear} puedeEditar={puedeEditar}
          onFiltrar={cargarMovimientos}
          onExportarCSV={exportarCSV}
          onVerComprobante={abrirVerComprobante}
          onDescargarComprobante={abrirDescargarComprobante}
          onDuplicar={abrirDuplicar}
          onEditar={abrirEditar}
          onAnular={anularMovimiento}
          onEliminar={eliminarMovimiento}
        />
      )}

      {tab === 2 && (
        <TabCuentas
          cuentas={cuentas}
          puedeCrear={puedeCrear} puedeEditar={puedeEditar}
          onCrear={abrirCrearCuenta}
          onEditar={abrirEditarCuenta}
          onEliminar={eliminarCuenta}
        />
      )}

      {tab === 3 && (
        <TabPresupuesto
          presupuesto={presupuesto}
          presAnio={presAnio} setPresAnio={setPresAnio}
          puedeCrear={puedeCrear} puedeEditar={puedeEditar}
          onCargar={cargarPresupuesto}
          onCrear={abrirCrearPres}
          onEditar={abrirEditarPres}
          onEliminar={eliminarPresupuesto}
        />
      )}

      {tab === 4 && (
        <TabReporteContador
          reporte={reporte} resumenAnual={resumenAnual}
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
          libroAuxiliar={libroAuxiliar} arqueos={arqueos} cargandoCaja={cargandoCaja}
          puedeCrear={puedeCrear} puedeEditar={puedeEditar}
          onFiltrar={cargarCajaMenor}
          onRegistrarIngreso={abrirIngresoCaja}
          onRegistrarGasto={abrirGastoCaja}
          onReponer={() => setDlgReposicion({ open: true })}
          onArquear={() => setDlgArqueo({ open: true })}
          onEliminarArqueo={eliminarArqueo}
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

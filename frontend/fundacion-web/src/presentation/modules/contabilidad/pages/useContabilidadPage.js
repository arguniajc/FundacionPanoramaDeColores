import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '@/infrastructure/http/apiClient';
import { useAuth } from '@/application/auth/AuthContext';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import { useConfiguracion } from '@/shared/context/ConfiguracionContext';
import { generarComprobantePDF } from './components/generarComprobantePDF';

export function useContabilidadPage() {
  const { puedo }  = useAuth();
  const confirm    = useConfirm();
  const config     = useConfiguracion();
  const inputOcrRef = useRef(null);

  const puedeCrear  = puedo('contabilidad', 'crear');
  const puedeEditar = puedo('contabilidad', 'editar');

  const now = new Date();
  const [tab,         setTab]         = useState(0);
  const [cargando,    setCargando]    = useState(true);
  const [error,       setError]       = useState(null);
  const [stats,       setStats]       = useState(null);
  const [cuentas,     setCuentas]     = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [programas,   setProgramas]   = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [presupuesto, setPresupuesto] = useState([]);
  const [reporte,     setReporte]     = useState(null);
  const [resumenAnual,setResumenAnual]= useState(null);
  const [guardando,   setGuardando]   = useState(false);
  const [busquedaMov, setBusquedaMov] = useState('');
  const [dlgComprobante, setDlgComprobante] = useState(null);
  const [ocrCargando,    setOcrCargando]    = useState(false);
  const [ocrAdvertencia, setOcrAdvertencia] = useState('');

  // Filtros movimientos
  const [filtroTipo,   setFiltroTipo]   = useState('');
  const [filtroMes,    setFiltroMes]    = useState(now.getMonth() + 1);
  const [filtroAnio,   setFiltroAnio]   = useState(now.getFullYear());
  const [filtroCuenta, setFiltroCuenta] = useState('');

  const [presAnio, setPresAnio] = useState(now.getFullYear());
  const [repMes,   setRepMes]   = useState(now.getMonth() + 1);
  const [repAnio,  setRepAnio]  = useState(now.getFullYear());

  const [dlgMov,    setDlgMov]    = useState({ open: false, modo: 'crear', data: null, tipoPreset: 'ingreso', cuentaPreset: null });
  const [dlgCuenta, setDlgCuenta] = useState({ open: false, modo: 'crear', data: null });
  const [dlgPres,   setDlgPres]   = useState({ open: false, modo: 'crear', data: null });

  // Caja Menor
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

  // ── Recargas ──────────────────────────────────────────────────────────────
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

  const cargarResumenAnual = async (anio) => {
    try {
      const { data } = await apiClient.get('/api/contabilidad/resumen-anual', { params: { anio } });
      setResumenAnual(data);
    } catch { setResumenAnual(null); }
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

  // ── CSV ───────────────────────────────────────────────────────────────────
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
    a.download = 'movimientos_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
  };

  // ── Helpers de diálogos ───────────────────────────────────────────────────
  const abrirCrearIngreso = () => setDlgMov({ open: true, modo: 'crear', data: null, tipoPreset: 'ingreso', cuentaPreset: null });
  const abrirCrearEgreso  = () => setDlgMov({ open: true, modo: 'crear', data: null, tipoPreset: 'egreso',  cuentaPreset: null });
  const abrirVerComprobante    = (m) => setDlgComprobante(m);
  const abrirDescargarComprobante = (m) => generarComprobantePDF(m, config);
  const abrirDuplicar = (m) => setDlgMov({ open: true, modo: 'crear', tipoPreset: m.tipo, data: { ...m, id: null, consecutivo: null, fecha: null } });
  const abrirEditar   = (m) => setDlgMov({ open: true, modo: 'editar', data: m, tipoPreset: m.tipo });
  const abrirCrearCuenta  = ()  => setDlgCuenta({ open: true, modo: 'crear', data: null });
  const abrirEditarCuenta = (c) => setDlgCuenta({ open: true, modo: 'editar', data: c });
  const abrirCrearPres    = ()  => setDlgPres({ open: true, modo: 'crear', data: null });
  const abrirEditarPres   = (p) => setDlgPres({ open: true, modo: 'editar', data: p });
  const abrirIngresoCaja  = ()  => setDlgMov({ open: true, modo: 'crear', data: null, tipoPreset: 'ingreso', cuentaPreset: cajaCuentaId });
  const abrirGastoCaja    = ()  => setDlgMov({ open: true, modo: 'crear', data: null, tipoPreset: 'egreso',  cuentaPreset: cajaCuentaId });

  return {
    // permisos + config
    puedeCrear, puedeEditar, config,
    // navegación
    tab, setTab,
    // carga
    cargando, error,
    // datos
    stats, cuentas, categorias, programas, movimientos, presupuesto, reporte, resumenAnual,
    guardando,
    // filtros movimientos
    filtroTipo, setFiltroTipo,
    filtroMes,  setFiltroMes,
    filtroAnio, setFiltroAnio,
    filtroCuenta, setFiltroCuenta,
    busquedaMov, setBusquedaMov,
    // filtros presupuesto / reporte
    presAnio, setPresAnio,
    repMes, setRepMes, repAnio, setRepAnio,
    // caja menor
    cajaCuentaId, setCajaCuentaId,
    cajaMes, setCajaMes, cajaAnio, setCajaAnio,
    libroAuxiliar, arqueos, cargandoCaja,
    // OCR
    ocrCargando, ocrAdvertencia, setOcrAdvertencia,
    inputOcrRef, handleEscanearFactura,
    // dialogs
    dlgMov, setDlgMov,
    dlgCuenta, setDlgCuenta,
    dlgPres, setDlgPres,
    dlgArqueo, setDlgArqueo,
    dlgReposicion, setDlgReposicion,
    dlgComprobante, setDlgComprobante,
    // callbacks de carga
    cargarMovimientos, cargarPresupuesto, cargarCajaMenor,
    generarReporte, cargarResumenAnual,
    // CRUD
    guardarMovimiento, eliminarMovimiento, anularMovimiento,
    guardarCuenta, eliminarCuenta,
    guardarPresupuesto, eliminarPresupuesto,
    guardarArqueo, eliminarArqueo, guardarReposicion,
    exportarCSV,
    // atajos para abrir diálogos
    abrirCrearIngreso, abrirCrearEgreso,
    abrirVerComprobante, abrirDescargarComprobante,
    abrirDuplicar, abrirEditar,
    abrirCrearCuenta, abrirEditarCuenta,
    abrirCrearPres, abrirEditarPres,
    abrirIngresoCaja, abrirGastoCaja,
  };
}

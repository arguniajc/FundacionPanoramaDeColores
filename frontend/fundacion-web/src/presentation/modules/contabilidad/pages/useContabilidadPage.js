import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '@/infrastructure/http/apiClient';
import { useAuth } from '@/application/auth/useAuth';
import { useConfirm } from '@/shared/components/useConfirm';
import { useConfiguracion } from '@/shared/context/useConfiguracion';
import { useToast } from '@/shared/context/useToast';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { generarComprobantePDF } from './components/generarComprobantePDF';
import { fechaLocalISO } from '@/shared/utils/fecha';
import { obtenerTodasLasPaginas } from '@/shared/utils/paginas';
import { useValorDiferido } from '@/shared/hooks/useValorDiferido';

const POR_PAGINA_MOV = 25;
const TOTALES_VACIOS = { totalIngresos: 0, totalEgresos: 0, cantidadIngresos: 0, cantidadEgresos: 0 };
const listarMovimientos = (params) => apiClient.get('/api/contabilidad/movimientos', { params });
/** Filas de una respuesta paginada ({ data, total, … }); tolera un arreglo plano. */
const filasDe = (resp) => (Array.isArray(resp) ? resp : (resp?.data ?? []));
/** Totales del filtro que envía el servidor; si no vienen se calculan con las filas recibidas. */
function totalesDe(resp, filas) {
  if (resp && !Array.isArray(resp) && resp.totalIngresos !== undefined) {
    const { totalIngresos, totalEgresos, cantidadIngresos, cantidadEgresos } = resp;
    return { totalIngresos, totalEgresos, cantidadIngresos, cantidadEgresos };
  }
  const vigentes = filas.filter(m => !m.anulado);
  const de = tipo => vigentes.filter(m => m.tipo === tipo);
  return {
    totalIngresos: de('ingreso').reduce((s, m) => s + m.monto, 0),
    totalEgresos:  de('egreso').reduce((s, m) => s + m.monto, 0),
    cantidadIngresos: de('ingreso').length,
    cantidadEgresos:  de('egreso').length,
  };
}

export function useContabilidadPage() {
  const { puedo }  = useAuth();
  const confirm    = useConfirm();
  const config     = useConfiguracion();
  const toast      = useToast();
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
  // Movimientos: página visible del listado paginado en el servidor + totales de todo el filtro
  const [movimientos, setMovimientos] = useState([]);
  const [movTotal,    setMovTotal]    = useState(0);
  const [movPagina,   setMovPagina]   = useState(1);
  const [movTotales,  setMovTotales]  = useState(TOTALES_VACIOS);
  const [ultimosMovimientos, setUltimosMovimientos] = useState([]); // pestaña Resumen (mes actual)
  const [presupuesto, setPresupuesto] = useState([]);
  const [reporte,     setReporte]     = useState(null);
  const [resumenAnual,setResumenAnual]= useState(null);
  const [guardando,   setGuardando]   = useState(false);
  const [busquedaMov, setBusquedaMov] = useState('');
  // La búsqueda va al servidor 350 ms después de dejar de escribir
  const buscarMov = useValorDiferido(busquedaMov.trim());
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

  const aplicarMovimientos = useCallback((resp, pagina) => {
    const filas = filasDe(resp);
    setMovimientos(filas);
    setMovTotal(Array.isArray(resp) ? filas.length : (resp?.total ?? 0));
    setMovPagina(pagina);
    setMovTotales(totalesDe(resp, filas));
  }, []);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setCargando(true);
      try {
        const [{ data: st }, { data: cu }, { data: ca }, { data: mo }, sedesRes] = await Promise.all([
          apiClient.get('/api/contabilidad/stats'),
          apiClient.get('/api/contabilidad/cuentas'),
          apiClient.get('/api/contabilidad/categorias'),
          // Mismos filtros por defecto de la pestaña Movimientos (mes y año actuales)
          listarMovimientos({ mes: now.getMonth() + 1, anio: now.getFullYear(), pagina: 1, porPagina: POR_PAGINA_MOV }),
          // opcional: sin sedes solo se pierde el selector de programa
          apiClient.get('/api/sedes').catch(() => ({ data: [] })),
        ]);
        setStats(st);
        setCuentas(cu);
        setCategorias(ca);
        aplicarMovimientos(mo, 1);
        setUltimosMovimientos(filasDe(mo).slice(0, 10));
        const progs = (sedesRes.data ?? []).flatMap(s =>
          (s.programas ?? []).map(p => ({ id: p.id, nombre: p.nombre }))
        );
        setProgramas(progs);
      } catch (err) {
        setError(mensajeErrorApi(err, { accion: 'cargar el módulo de contabilidad' }));
      } finally {
        setCargando(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Recargas ──────────────────────────────────────────────────────────────
  // Filtros actuales de la pestaña Movimientos (sin paginación)
  const filtrosMovimientos = useCallback(() => {
    const params = {};
    if (filtroTipo)   params.tipo     = filtroTipo;
    if (filtroMes)    params.mes      = filtroMes;
    if (filtroAnio)   params.anio     = filtroAnio;
    if (filtroCuenta) params.cuentaId = filtroCuenta;
    if (buscarMov)    params.buscar   = buscarMov;
    return params;
  }, [filtroTipo, filtroMes, filtroAnio, filtroCuenta, buscarMov]);

  const cargarMovimientos = useCallback(async (pagina = 1) => {
    try {
      const params = { ...filtrosMovimientos(), porPagina: POR_PAGINA_MOV };
      let { data } = await listarMovimientos({ ...params, pagina });
      // Tras eliminar el último de una página se muestra la última página que sí tiene datos
      const ultima = Math.max(1, Math.ceil((data?.total ?? 0) / POR_PAGINA_MOV));
      if (pagina > ultima) {
        pagina = ultima;
        ({ data } = await listarMovimientos({ ...params, pagina }));
      }
      aplicarMovimientos(data, pagina);
    } catch (err) {
      toast(mensajeErrorApi(err, { accion: 'cargar los movimientos' }), 'error');
    }
  }, [filtrosMovimientos, aplicarMovimientos, toast]);

  // Al cambiar la búsqueda se vuelve a pedir la primera página (no en el montaje: ya lo hace la carga inicial)
  const busquedaMontada = useRef(false);
  useEffect(() => {
    if (!busquedaMontada.current) { busquedaMontada.current = true; return; }
    cargarMovimientos(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- solo reacciona a la búsqueda; los demás filtros se aplican con el botón Filtrar
  }, [buscarMov]);

  const cambiarPaginaMov = (pagina) => cargarMovimientos(pagina);

  // Recarga la página visible de movimientos y los últimos del mes (Resumen) tras crear/editar/anular
  const recargarMovimientos = async () => {
    await cargarMovimientos(movPagina);
    try {
      const { data } = await listarMovimientos({ mes: now.getMonth() + 1, anio: now.getFullYear(), pagina: 1, porPagina: 10 });
      setUltimosMovimientos(filasDe(data));
    } catch { /* opcional: el Resumen conserva la lista anterior */ }
  };

  const cargarPresupuesto = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/contabilidad/presupuesto', { params: { anio: presAnio } });
      setPresupuesto(data);
    } catch (err) {
      toast(mensajeErrorApi(err, { accion: 'cargar el presupuesto' }), 'error');
    }
  }, [presAnio, toast]);

  const cargarStats = async () => {
    try {
      const { data } = await apiClient.get('/api/contabilidad/stats');
      setStats(data);
    } catch (err) {
      toast(mensajeErrorApi(err, { accion: 'actualizar el resumen' }), 'error');
    }
  };

  const cargarCuentas = async () => {
    try {
      const { data } = await apiClient.get('/api/contabilidad/cuentas');
      setCuentas(data);
    } catch (err) {
      toast(mensajeErrorApi(err, { accion: 'actualizar las cuentas' }), 'error');
    }
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
    } catch (err) {
      toast(mensajeErrorApi(err, { accion: 'cargar la caja menor' }), 'error');
    } finally {
      setCargandoCaja(false);
    }
  }, [cajaCuentaId, cajaMes, cajaAnio, toast]);

  useEffect(() => {
    if (tab === 5 && !cajaCuentaId) {
      const primera = cuentas.find(c => c.tipo !== 'cuenta_bancaria');
      if (primera) setCajaCuentaId(primera.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe elegir la caja por defecto al entrar a la pestaña o al cargar cuentas, no cada vez que cambia la caja elegida
  }, [tab, cuentas]);

  useEffect(() => {
    if (cajaCuentaId) cargarCajaMenor();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recarga solo al cambiar de caja; al cambiar mes/año se recarga con el botón Filtrar
  }, [cajaCuentaId]);

  const generarReporte = async () => {
    try {
      const { data } = await apiClient.get('/api/contabilidad/reporte', {
        params: { mes: repMes, anio: repAnio },
      });
      setReporte(data);
    } catch (err) {
      toast(mensajeErrorApi(err, { accion: 'generar el reporte' }), 'error');
    }
  };

  const cargarResumenAnual = async (anio) => {
    try {
      const { data } = await apiClient.get('/api/contabilidad/resumen-anual', { params: { anio } });
      setResumenAnual(data);
    } catch (err) {
      setResumenAnual(null);
      toast(mensajeErrorApi(err, { accion: 'cargar el resumen anual' }), 'error');
    }
  };

  // ── Movimientos CRUD ──────────────────────────────────────────────────────
  const guardarMovimiento = async (form) => {
    setGuardando(true);
    try {
      if (dlgMov.modo === 'crear') await apiClient.post('/api/contabilidad/movimientos', form);
      else await apiClient.put(`/api/contabilidad/movimientos/${dlgMov.data.id}`, form);
      await Promise.all([cargarStats(), cargarCuentas(), recargarMovimientos()]);
      if (tab === 5) await cargarCajaMenor();
      setDlgMov(d => ({ ...d, open: false }));
    } catch (err) {
      toast(mensajeErrorApi(err, { accion: 'guardar el movimiento' }), 'error');
    } finally { setGuardando(false); }
  };

  const eliminarMovimiento = async (id) => {
    if (!await confirm('¿Eliminar este movimiento? El saldo de la cuenta se ajustará automáticamente.')) return;
    try {
      await apiClient.delete(`/api/contabilidad/movimientos/${id}`);
    } catch (err) {
      toast(mensajeErrorApi(err, { accion: 'eliminar el movimiento' }), 'error');
      return;
    }
    await Promise.all([cargarStats(), cargarCuentas(), recargarMovimientos()]);
    if (tab === 5) await cargarCajaMenor();
  };

  const anularMovimiento = async (id) => {
    if (!await confirm('¿Anular este movimiento? El saldo de la cuenta se revertirá y el movimiento quedará en el historial como Anulado.')) return;
    try {
      await apiClient.patch(`/api/contabilidad/movimientos/${id}/anular`);
    } catch (err) {
      toast(mensajeErrorApi(err, { accion: 'anular el movimiento' }), 'error');
      return;
    }
    await Promise.all([cargarStats(), cargarCuentas(), recargarMovimientos()]);
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
    } catch (err) {
      toast(mensajeErrorApi(err, { accion: 'guardar la cuenta' }), 'error');
    } finally { setGuardando(false); }
  };

  const eliminarCuenta = async (id) => {
    if (!await confirm('¿Eliminar esta cuenta? Solo es posible si no tiene movimientos registrados.')) return;
    try {
      await apiClient.delete(`/api/contabilidad/cuentas/${id}`);
      await Promise.all([cargarCuentas(), cargarStats()]);
    } catch (err) {
      toast(mensajeErrorApi(err, { accion: 'eliminar la cuenta', conflicto: 'No se pudo eliminar: la cuenta tiene movimientos asociados.' }), 'error');
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
    } catch (err) {
      toast(mensajeErrorApi(err, { accion: 'guardar la línea presupuestal' }), 'error');
    } finally { setGuardando(false); }
  };

  const eliminarPresupuesto = async (id) => {
    if (!await confirm('¿Eliminar esta línea presupuestal?')) return;
    try {
      await apiClient.delete(`/api/contabilidad/presupuesto/${id}`);
    } catch (err) {
      toast(mensajeErrorApi(err, { accion: 'eliminar la línea presupuestal' }), 'error');
      return;
    }
    await cargarPresupuesto();
  };

  // ── Caja Menor CRUD ───────────────────────────────────────────────────────
  const guardarArqueo = async (form) => {
    setGuardando(true);
    try {
      await apiClient.post('/api/contabilidad/caja-menor/arqueos', form);
      await cargarCajaMenor();
      setDlgArqueo({ open: false });
    } catch (err) {
      toast(mensajeErrorApi(err, { accion: 'registrar el arqueo' }), 'error');
    } finally { setGuardando(false); }
  };

  const eliminarArqueo = async (id) => {
    if (!await confirm('¿Eliminar este arqueo?')) return;
    try {
      await apiClient.delete(`/api/contabilidad/caja-menor/arqueos/${id}`);
    } catch (err) {
      toast(mensajeErrorApi(err, { accion: 'eliminar el arqueo' }), 'error');
      return;
    }
    await cargarCajaMenor();
  };

  const guardarReposicion = async (form) => {
    setGuardando(true);
    try {
      await apiClient.post('/api/contabilidad/caja-menor/reposicion', form);
      await Promise.all([cargarStats(), cargarCuentas(), cargarCajaMenor()]);
      setDlgReposicion({ open: false });
    } catch (err) {
      toast(mensajeErrorApi(err, { accion: 'registrar la reposición' }), 'error');
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
      const msg = mensajeErrorApi(err, { accion: 'leer la factura' });
      setOcrAdvertencia(typeof d?.detalle === 'string' ? `${msg}: ${d.detalle}` : msg);
    } finally { setOcrCargando(false); }
  };

  // ── CSV ───────────────────────────────────────────────────────────────────
  // Exporta TODOS los movimientos del filtro actual (todas las páginas), no solo los visibles
  const exportarCSV = async () => {
    let todos;
    try {
      todos = await obtenerTodasLasPaginas(listarMovimientos, filtrosMovimientos());
    } catch (err) {
      toast(mensajeErrorApi(err, { accion: 'exportar los movimientos' }), 'error');
      return;
    }
    if (!todos.length) { toast('No hay movimientos para exportar con los filtros actuales.', 'info'); return; }
    // Comillas para que una coma o comilla dentro del texto no desarme las columnas
    const celda = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const filas = todos
      .map(m => [
        m.consecutivo ? '#' + m.consecutivo + '-' + new Date(m.fecha).getFullYear() : '',
        m.fecha, m.tipo, m.concepto, m.codigoPuc, m.categoriaNombre,
        m.cuentaNombre, m.programaNombre ?? '', m.terceroNombre ?? '', m.terceroDocumento ?? '',
        m.numeroSoporte ?? '', m.tipoSoporte ?? '',
        m.monto, m.retencionPracticada ?? '',
      ].map(celda).join(','));
    const header = 'N Comp.,Fecha,Tipo,Concepto,Cod.PUC,Categoria,Cuenta,Programa,Tercero,NIT,Soporte,TipoSoporte,Monto,RTE';
    const csv = [header, ...filas].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'movimientos_' + fechaLocalISO() + '.csv';
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
    ultimosMovimientos,
    movTotal, movPagina, movTotales, movTotalPaginas: Math.ceil(movTotal / POR_PAGINA_MOV), cambiarPaginaMov,
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
